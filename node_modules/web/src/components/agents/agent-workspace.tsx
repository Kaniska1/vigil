"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Braces,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Layers3,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  Workflow,
  Wrench,
} from "lucide-react";

import {
  RiAiAgentLine,
} from "react-icons/ri";

import type {
  Agent,
  RunDetails,
  RunStatus,
  TraceEvent,
} from "@/lib/api";

import {
  getRun,
  getRunStreamUrl,
  runAgent,
} from "@/lib/api";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Input,
} from "@/components/ui/input";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import BorderGlow from "./BorderGlow";
import { AgentPlayground } from "./agent-playground";
import { RunTrace } from "./run-trace";

type AgentWorkspaceProps = {
  agents: Agent[];
};

type WorkspaceStatus =
  | "IDLE"
  | RunStatus;

const STATUS_META: Record<
  WorkspaceStatus,
  {
    label: string;
    dot: string;
    text: string;
    surface: string;
  }
> = {
  IDLE: {
    label: "Ready",
    dot: "bg-white/35",
    text: "text-white/60",
    surface:
      "border-white/[0.08] bg-white/[0.04]",
  },

  PENDING: {
    label: "Queued",
    dot: "bg-slate-400",
    text: "text-slate-300",
    surface:
      "border-slate-500/20 bg-slate-500/[0.08]",
  },

  RUNNING: {
    label: "Running",
    dot: "bg-[#3879f8]",
    text: "text-[#75a4ff]",
    surface:
      "border-[#3879f8]/25 bg-[#3879f8]/10",
  },

  SUCCESS: {
    label: "Completed",
    dot: "bg-[#7e72f4]",
    text: "text-[#aaa1ff]",
    surface:
      "border-[#7e72f4]/25 bg-[#7e72f4]/10",
  },

  FAILED: {
    label: "Failed",
    dot: "bg-red-400",
    text: "text-red-300",
    surface:
      "border-red-500/20 bg-red-500/10",
  },
};

function shortCapability(
  capability: string,
) {
  return capability.replaceAll(
    "-",
    " ",
  );
}

export function AgentWorkspace({
  agents,
}: AgentWorkspaceProps) {
  const [
    selectedAgent,
    setSelectedAgent,
  ] =
    useState<Agent | null>(
      agents.find(
        (agent) =>
          agent.slug ===
          "github-reviewer",
      ) ??
        agents[0] ??
        null,
    );

  const [
    runId,
    setRunId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    events,
    setEvents,
  ] =
    useState<TraceEvent[]>(
      [],
    );

  const [
    status,
    setStatus,
  ] =
    useState<WorkspaceStatus>(
      "IDLE",
    );

  const [
    running,
    setRunning,
  ] =
    useState(false);

  const [
    completedRun,
    setCompletedRun,
  ] =
    useState<RunDetails | null>(
      null,
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const filteredAgents =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (!normalized) {
        return agents;
      }

      return agents.filter(
        (agent) => {
          const searchable = [
            agent.name,
            agent.slug,
            agent.description,
            ...(agent.capabilities ?? []),
            ...(agent.tools ?? []),
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            normalized,
          );
        },
      );
    }, [agents, query]);

  const totalCapabilities =
    useMemo(() => {
      return new Set(
        agents.flatMap(
          (agent) =>
            agent.capabilities ??
            [],
        ),
      ).size;
    }, [agents]);

  const totalTools =
    useMemo(() => {
      return new Set(
        agents.flatMap(
          (agent) =>
            agent.tools ?? [],
        ),
      ).size;
    }, [agents]);

  async function handleRun(
    input: Record<
      string,
      unknown
    >,
  ) {
    if (!selectedAgent) {
      return;
    }

    setRunning(true);

    setRunId(null);
    setEvents([]);
    setCompletedRun(null);

    setStatus("PENDING");

    try {
      const createdRun =
        await runAgent(
          selectedAgent.slug,
          input,
        );

      setRunId(
        createdRun.runId,
      );

      setStatus(
        createdRun.status,
      );

      const source =
        new EventSource(
          getRunStreamUrl(
            createdRun.runId,
          ),
        );

      source.addEventListener(
        "trace",
        (event) => {
          const traceEvent =
            JSON.parse(
              event.data,
            ) as TraceEvent;

          setEvents(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id ===
                    traceEvent.id,
                );

              if (exists) {
                return current;
              }

              return [
                ...current,
                traceEvent,
              ];
            },
          );

          if (
            traceEvent.type ===
              "RUN_STARTED" ||
            traceEvent.type ===
              "AGENT_STARTED"
          ) {
            setStatus(
              "RUNNING",
            );
          }

          if (
            traceEvent.type ===
            "RUN_COMPLETED"
          ) {
            setStatus(
              "SUCCESS",
            );
          }

          if (
            traceEvent.type ===
            "ERROR"
          ) {
            setStatus(
              "FAILED",
            );
          }
        },
      );

      source.addEventListener(
        "done",
        async () => {
          source.close();

          try {
            const finishedRun =
              await getRun(
                createdRun.runId,
              );

            setCompletedRun(
              finishedRun,
            );

            setStatus(
              finishedRun.status,
            );

            setEvents(
              finishedRun.events,
            );
          } catch (error) {
            console.error(
              "Failed to fetch completed run:",
              error,
            );
          } finally {
            setRunning(false);
          }
        },
      );

      source.onerror =
        () => {
          if (
            source.readyState ===
            EventSource.CLOSED
          ) {
            return;
          }

          console.error(
            "SSE connection lost",
          );

          source.close();

          setRunning(false);
        };
    } catch (error) {
      console.error(
        "Failed to run agent:",
        error,
      );

      setRunning(false);

      setStatus(
        "FAILED",
      );
    }
  }

  function handleAgentSelection(
    agent: Agent,
  ) {
    if (running) {
      return;
    }

    setSelectedAgent(
      agent,
    );

    setRunId(null);
    setEvents([]);
    setCompletedRun(null);

    setStatus(
      "IDLE",
    );
  }

  const statusMeta =
    STATUS_META[status];

  return (
    <div className="space-y-7">
      {/* ================================================= */}
      {/* Header                                            */}
      {/* ================================================= */}

      <section className="relative overflow-hidden border-b border-[var(--line)] pb-7">
        <div className="pointer-events-none absolute left-[7%] top-[-110px] h-[230px] w-[230px] rounded-full bg-[#ab56ff]/6 blur-[100px]" />

        <div className="pointer-events-none absolute right-[10%] top-[-130px] h-[250px] w-[250px] rounded-full bg-[#3879f8]/6 blur-[110px]" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-[#7e72f4]/20 bg-[#7e72f4]/10">
                <RiAiAgentLine className="size-[17px] text-[#9b92ff]" />
              </div>

              <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#958cff]">
                Agent Registry
              </span>

              <span className="h-4 w-px bg-white/[0.08]" />

              <span className="text-[12px] font-semibold text-white/35">
                {agents.length} registered
              </span>
            </div>

            <h1 className="max-w-2xl text-gradient text-[34px] font-extrabold leading-[1.05] tracking-[-0.055em] text-white sm:text-[42px]">
              Specialist agents, one runtime.
            </h1>

            <p className="mt-4 max-w-2xl text-[14px] font-medium leading-6 text-white/45">
              Inspect capabilities,
              execute agents against
              real inputs, and observe
              every runtime event from
              a single control surface.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)]">
            <div className="min-w-[105px] bg-[var(--surface)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
                Agents
              </p>

              <p className="mt-1 text-lg font-extrabold tracking-[-0.04em] text-white">
                {agents.length}
              </p>
            </div>

            <div className="min-w-[115px] bg-[var(--surface)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
                Capabilities
              </p>

              <p className="mt-1 text-lg font-extrabold tracking-[-0.04em] text-[#9f96ff]">
                {
                  totalCapabilities
                }
              </p>
            </div>

            <div className="min-w-[105px] bg-[var(--surface)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
                Tools
              </p>

              <p className="mt-1 text-lg font-extrabold tracking-[-0.04em] text-[#c276ff]">
                {totalTools}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* Main two-column workspace                         */}
      {/* ================================================= */}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* ================================================= */}
        {/* LEFT — Agent registry                             */}
        {/* ================================================= */}

        <aside className="min-w-0">
          <div className="sticky top-5">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-extrabold text-white/85">
                    Registry
                  </p>

                  <p className="mt-1 text-[12px] font-medium text-white/35">
                    Select an agent to
                    inspect and execute.
                  </p>
                </div>

                <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-white/35">
                  {filteredAgents.length}
                </span>
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />

                <Input
                  value={query}
                  onChange={(
                    event,
                  ) =>
                    setQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search agents"
                  className="h-10 pl-10 text-[13px]"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredAgents.map(
                (agent) => {
                  const selected =
                    selectedAgent?.id ===
                    agent.id;

                  const agentCard = (
                    <button
                      type="button"
                      disabled={
                        running
                      }
                      onClick={() =>
                        handleAgentSelection(
                          agent,
                        )
                      }
                      className={`
                        group
                        relative
                        w-full
                        overflow-hidden
                        rounded-[12px]
                        p-4
                        text-left
                        transition-all
                        duration-200

                        ${
                          selected
                            ? "bg-[#15171a]"
                            : "bg-[#121416] hover:bg-[#181a1e]"
                        }

                        ${
                          running
                            ? "cursor-not-allowed opacity-60"
                            : ""
                        }
                      `}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`
                            flex
                            size-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-[10px]
                            border

                            ${
                              selected
                                ? "border-[#7e72f4]/30 bg-[#7e72f4]/10 text-[#a49cff]"
                                : "border-white/[0.08] bg-white/[0.035] text-white/40 group-hover:text-white/65"
                            }
                          `}
                        >
                          <RiAiAgentLine className="size-[19px]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-white/90">
                                {
                                  agent.name
                                }
                              </p>

                              <p className="mt-1 truncate font-mono text-[11px] text-white/30">
                                {
                                  agent.slug
                                }
                              </p>
                            </div>

                            <span className="shrink-0 font-mono text-[11px] font-medium text-white/25">
                              v
                              {
                                agent.version
                              }
                            </span>
                          </div>

                          <p className="mt-3 line-clamp-2 text-[12px] font-medium leading-[19px] text-white/45">
                            {
                              agent.description
                            }
                          </p>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              {(
                                agent.capabilities ??
                                []
                              )
                                .slice(
                                  0,
                                  2,
                                )
                                .map(
                                  (
                                    capability,
                                  ) => (
                                    <span
                                      key={
                                        capability
                                      }
                                      className="
                                        max-w-[120px]
                                        truncate
                                        rounded-md
                                        border
                                        border-white/[0.07]
                                        bg-[#0d0e0f]
                                        px-2
                                        py-1
                                        text-[10px]
                                        font-semibold
                                        text-white/45
                                      "
                                    >
                                      {shortCapability(
                                        capability,
                                      )}
                                    </span>
                                  ),
                                )}
                            </div>

                            <ChevronRight
                              className={`
                                size-4
                                shrink-0
                                transition-all
                                duration-200

                                ${
                                  selected
                                    ? "text-[#8f85fb]"
                                    : "text-white/20 group-hover:translate-x-0.5 group-hover:text-white/45"
                                }
                              `}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );

                  if (selected) {
                    return (
                      <div
                        key={
                          agent.id
                        }
                        className="
                          rounded-[14px]
                          bg-gradient-to-br
                          from-[#ab56ff]
                          via-[#7e72f4]
                          to-[#3879f8]
                          p-[2px]
                          shadow-[0_0_18px_rgba(126,114,244,0.18)]
                        "
                      >
                        {agentCard}
                      </div>
                    );
                  }

                  return (
                    <BorderGlow
                      key={
                        agent.id
                      }
                      edgeSensitivity={
                        34
                      }
                      glowColor="126 114 244"
                      backgroundColor="#121416"
                      borderRadius={
                        14
                      }
                      glowRadius={
                        36
                      }
                      glowIntensity={
                        0.72
                      }
                      coneSpread={
                        26
                      }
                      animated={
                        false
                      }
                      colors={[
                        "#ab56ff",
                        "#7e72f4",
                        "#3879f8",
                      ]}
                    >
                      {agentCard}
                    </BorderGlow>
                  );
                },
              )}
            </div>

            {filteredAgents.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-10 text-center">
                <Search className="mx-auto size-5 text-white/25" />

                <p className="mt-3 text-[13px] font-bold text-white/60">
                  No matching agents
                </p>

                <p className="mt-1 text-[12px] leading-5 text-white/30">
                  Try another name,
                  capability, or tool.
                </p>
              </div>
            ) : null}
          </div>
        </aside>

        {/* ================================================= */}
        {/* RIGHT — Selected agent + execution                */}
        {/* ================================================= */}

        {selectedAgent ? (
          <main className="min-w-0 overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(0,0,0,.34)]">
            {/* Selected agent summary */}

            <div className="border-b border-[var(--line)] bg-[#121416] px-6 py-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#7e72f4]/25 bg-[#7e72f4]/10 text-[#a49cff]">
                    <RiAiAgentLine className="size-[23px]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-[20px] font-extrabold tracking-[-0.04em] text-white">
                        {
                          selectedAgent.name
                        }
                      </h2>

                      <Badge
                        variant="secondary"
                        className="text-[11px]"
                      >
                        First-party
                      </Badge>
                    </div>

                    <p className="mt-1 font-mono text-[12px] text-white/30">
                      {
                        selectedAgent.slug
                      }
                      @
                      {
                        selectedAgent.version
                      }
                    </p>

                    <p className="mt-3 max-w-3xl text-[13px] font-medium leading-6 text-white/45">
                      {
                        selectedAgent.description
                      }
                    </p>
                  </div>
                </div>

                <div
                  className={`
                    inline-flex
                    shrink-0
                    items-center
                    gap-2
                    self-start
                    rounded-lg
                    border
                    px-3
                    py-1.5
                    text-[12px]
                    font-bold
                    ${statusMeta.surface}
                    ${statusMeta.text}
                  `}
                >
                  <span
                    className={`
                      size-2
                      rounded-full
                      ${statusMeta.dot}
                      ${
                        status ===
                        "RUNNING"
                          ? "animate-pulse"
                          : ""
                      }
                    `}
                  />

                  {
                    statusMeta.label
                  }
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(
                  selectedAgent.capabilities ??
                  []
                ).map(
                  (
                    capability,
                  ) => (
                    <span
                      key={
                        capability
                      }
                      className="
                        rounded-md
                        border
                        border-[#7e72f4]/15
                        bg-[#7e72f4]/[0.07]
                        px-2.5
                        py-1
                        text-[11px]
                        font-semibold
                        text-[#aaa3fa]
                      "
                    >
                      {shortCapability(
                        capability,
                      )}
                    </span>
                  ),
                )}

                {(
                  selectedAgent.tools ??
                  []
                ).map(
                  (tool) => (
                    <span
                      key={tool}
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-md
                        border
                        border-white/[0.07]
                        bg-white/[0.025]
                        px-2.5
                        py-1
                        font-mono
                        text-[11px]
                        text-white/45
                      "
                    >
                      <Code2 className="size-3" />
                      {tool}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Runtime info strip */}

            <div className="grid grid-cols-2 border-b border-[var(--line)] bg-[#101113] sm:grid-cols-4">
              <div className="border-b border-r border-[var(--line)] px-4 py-3 sm:border-b-0">
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <ShieldCheck className="size-3.5 text-[#7e72f4]" />
                  Runtime
                </div>

                <p className="mt-1 text-[12px] font-bold text-white/65">
                  Managed
                </p>
              </div>

              <div className="border-b border-[var(--line)] px-4 py-3 sm:border-b-0 sm:border-r">
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <Workflow className="size-3.5 text-[#3879f8]" />
                  Registry
                </div>

                <p className="mt-1 text-[12px] font-bold text-white/65">
                  Active
                </p>
              </div>

              <div className="border-r border-[var(--line)] px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <Layers3 className="size-3.5 text-[#ab56ff]" />
                  Capabilities
                </div>

                <p className="mt-1 text-[12px] font-bold text-white/65">
                  {
                    selectedAgent
                      .capabilities
                      ?.length ?? 0
                  }
                </p>
              </div>

              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <CircleDot className="size-3.5 text-[#7e72f4]" />
                  Events
                </div>

                <p className="mt-1 font-mono text-[12px] font-bold text-white/65">
                  {
                    events.length
                  }
                </p>
              </div>
            </div>

            {/* Execution workspace */}

            <div className="min-w-0">
              <div className="flex flex-col gap-4 border-b border-[var(--line)] bg-[#121416] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <SquareTerminal className="size-4 text-[#6497ff]" />

                    <p className="text-[14px] font-extrabold text-white/80">
                      Execution Workspace
                    </p>
                  </div>

                  <p className="mt-1.5 text-[12px] font-medium text-white/35">
                    Configure input,
                    execute the agent,
                    and inspect its
                    runtime trace.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-medium text-white/30">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="size-3.5" />
                    Live runtime
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Activity className="size-3.5" />
                    SSE trace
                  </span>
                </div>
              </div>

              <div className="px-5 pb-6 pt-5 sm:px-6">
                <Tabs defaultValue="playground">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <TabsList
                      className="
                        h-10
                        rounded-lg
                        border
                        border-[var(--line)]
                        bg-[#0d0e0f]
                        p-1
                      "
                    >
                      <TabsTrigger
                        value="playground"
                        className="
                          gap-2
                          rounded-md
                          px-3.5
                          text-[12px]
                          font-semibold
                          data-[state=active]:bg-[#191b1f]
                          data-[state=active]:text-white
                        "
                      >
                        <Play className="size-3.5" />

                        Playground
                      </TabsTrigger>

                      <TabsTrigger
                        value="trace"
                        className="
                          gap-2
                          rounded-md
                          px-3.5
                          text-[12px]
                          font-semibold
                          data-[state=active]:bg-[#191b1f]
                          data-[state=active]:text-white
                        "
                      >
                        <Braces className="size-3.5" />

                        Trace

                        {events.length ? (
                          <span className="ml-0.5 rounded-[5px] bg-[#7e72f4]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#aaa1ff]">
                            {
                              events.length
                            }
                          </span>
                        ) : null}
                      </TabsTrigger>
                    </TabsList>

                    {status ===
                    "SUCCESS" ? (
                      <div className="hidden items-center gap-1.5 text-[11px] font-semibold text-[#aaa1ff] sm:flex">
                        <CheckCircle2 className="size-3.5" />

                        Execution complete
                      </div>
                    ) : null}

                    {status ===
                    "RUNNING" ? (
                      <div className="hidden items-center gap-1.5 text-[11px] font-semibold text-[#75a4ff] sm:flex">
                        <Activity className="size-3.5 animate-pulse" />

                        Agent executing
                      </div>
                    ) : null}
                  </div>

                  <TabsContent value="playground">
                    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[#111214] px-5 sm:px-6">
                      <AgentPlayground
                        agent={
                          selectedAgent
                        }
                        running={
                          running
                        }
                        status={
                          status
                        }
                        result={
                          completedRun
                        }
                        onRun={
                          handleRun
                        }
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="trace">
                    <div className="rounded-xl border border-[var(--line)] bg-[#111214] px-5 py-5 sm:px-6">
                      <RunTrace
                        runId={
                          runId
                        }
                        status={
                          status
                        }
                        events={
                          events
                        }
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex min-h-[620px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] text-center">
            <div className="flex size-14 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
              <RiAiAgentLine className="size-6 text-white/30" />
            </div>

            <p className="mt-4 text-[14px] font-bold text-white/60">
              No agents registered
            </p>

            <p className="mt-1 max-w-xs text-[12px] leading-5 text-white/30">
              Register an agent to
              begin using the
              execution runtime.
            </p>
          </main>
        )}
      </section>

      {/* Footer */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
        <div className="flex items-center gap-2 text-[11px] text-white/25">
          <Sparkles className="size-3.5 text-[#ab56ff]" />

          Capability-aware agent
          runtime
        </div>

        <div className="flex items-center gap-4 text-[11px] font-medium text-white/25">
          <span>
            {agents.length} agents
          </span>

          <span>
            {totalCapabilities}{" "}
            capabilities
          </span>

          <span>
            {totalTools} tools
          </span>
        </div>
      </div>
    </div>
  );
}