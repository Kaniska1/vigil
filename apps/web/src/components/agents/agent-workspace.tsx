"use client";

import { useState } from "react";

import {
  Activity,
  Bot,
  Braces,
  Play,
} from "lucide-react";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  AgentPlayground,
} from "./agent-playground";

import {
  RunTrace,
} from "./run-trace";

type AgentWorkspaceProps = {
  agents: Agent[];
};

type WorkspaceStatus =
  | "IDLE"
  | RunStatus;

export function AgentWorkspace({
  agents,
}: AgentWorkspaceProps) {
  const [
    selectedAgent,
    setSelectedAgent,
  ] = useState<Agent | null>(
    agents.find(
      (agent) =>
        agent.slug ===
        "github-reviewer"
    ) ??
      agents[0] ??
      null
  );

  const [
    runId,
    setRunId,
  ] = useState<string | null>(
    null
  );

  const [
    events,
    setEvents,
  ] = useState<TraceEvent[]>([]);

  const [
    status,
    setStatus,
  ] =
    useState<WorkspaceStatus>(
      "IDLE"
    );

  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    completedRun,
    setCompletedRun,
  ] =
    useState<RunDetails | null>(
      null
    );

  async function handleRun(
    input: Record<string, unknown>
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
          input
        );

      setRunId(
        createdRun.runId
      );

      setStatus(
        createdRun.status
      );

      const source =
        new EventSource(
          getRunStreamUrl(
            createdRun.runId
          )
        );

      source.addEventListener(
        "trace",
        (event) => {
          const traceEvent =
            JSON.parse(
              event.data
            ) as TraceEvent;

          /*
           * Events may arrive once through replay and once
           * through the live event bus if timing overlaps.
           *
           * Deduplicate using TraceEvent.id.
           */
          setEvents(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id ===
                    traceEvent.id
                );

              if (exists) {
                return current;
              }

              return [
                ...current,
                traceEvent,
              ];
            }
          );

          if (
            traceEvent.type ===
              "RUN_STARTED" ||
            traceEvent.type ===
              "AGENT_STARTED"
          ) {
            setStatus(
              "RUNNING"
            );
          }

          if (
            traceEvent.type ===
            "RUN_COMPLETED"
          ) {
            setStatus(
              "SUCCESS"
            );
          }

          if (
            traceEvent.type ===
            "ERROR"
          ) {
            setStatus(
              "FAILED"
            );
          }
        }
      );

      source.addEventListener(
        "done",
        async () => {
          /*
           * Close immediately.
           *
           * The server has told us the execution is complete,
           * so we do NOT want EventSource trying to reconnect.
           */
          source.close();

          try {
            const finishedRun =
              await getRun(
                createdRun.runId
              );

            setCompletedRun(
              finishedRun
            );

            setStatus(
              finishedRun.status
            );
            setEvents(
              finishedRun.events
            );
          } catch (error) {
            console.error(
              "Failed to fetch completed run:",
              error
            );
          } finally {
            setRunning(false);
          }
        }
      );

      source.onerror = () => {
        /*
         * CLOSED means we deliberately closed it.
         * That's not an error.
         */
        if (
          source.readyState ===
          EventSource.CLOSED
        ) {
          return;
        }

        console.error(
          "SSE connection lost"
        );

        source.close();

        setRunning(false);
      };
    } catch (error) {
      console.error(
        "Failed to run agent:",
        error
      );

      setRunning(false);

      setStatus("FAILED");
    }
  }

  function handleAgentSelection(
    agent: Agent
  ) {
    /*
     * Do not switch agents while one is actively executing.
     *
     * Later we can support several simultaneous runs properly.
     */
    if (running) {
      return;
    }

    setSelectedAgent(agent);

    setRunId(null);
    setEvents([]);

    setCompletedRun(null);

    setStatus("IDLE");
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-5 border-b border-[#333333] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-500)]">
            <Activity className="size-4 text-[#9166ff]" />
            Agent registry
            <Badge variant="secondary">{agents.length} active</Badge>
          </div>
          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
            Build with specialist agents.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--text-600)]">
            Discover first-party agents, inspect their capabilities, execute them against real inputs, and follow every runtime event.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-400)]">Available agents</p>
            <span className="rounded-full bg-[#1a1a1a] px-2 py-1 text-[10px] font-bold text-[var(--text-500)]">REGISTRY</span>
          </div>

          {agents.map((agent) => {
            const selected = selectedAgent?.id === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => handleAgentSelection(agent)}
                className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                  selected
                    ? "border-[#4800ff]/55 bg-gradient-to-br from-[#1b2034] to-[#1a1a1a] shadow-[0_16px_45px_rgba(69,57,168,.17),inset_0_1px_0_rgba(255,255,255,.04)]"
                    : "border-[#333333] bg-[#1a1a1a]/75 hover:border-[#4d4d4d] hover:bg-[#1a1a1a]"
                } ${running ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${selected ? "border-[#4800ff]/30 bg-[#4800ff]/15 text-[#b699ff]" : "border-[#333333] bg-[#1a1a1a] text-[var(--text-500)]"}`}>
                    <Bot className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-extrabold tracking-[-0.02em] text-white">{agent.name}</p>
                      <span className="font-mono text-[10px] font-medium text-[var(--text-500)]">v{agent.version}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-5 text-[var(--text-500)]">{agent.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(agent.capabilities ?? []).slice(0, 2).map((capability) => (
                        <span key={capability} className="rounded-lg border border-[#333333] bg-[#0d0d0d] px-2 py-1 font-mono text-[9px] text-[var(--text-600)]">{capability}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        {selectedAgent ? (
          <Card className="min-w-0 border-[#333333] bg-[#1a1a1a]/90">
            <CardHeader className="border-b border-[#333333] pb-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-[#007fff]/25 bg-gradient-to-br from-[#263765] to-[#292343] text-[#99a5ff] shadow-[0_12px_32px_rgba(61,74,177,.18)]">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl">{selectedAgent.name}</CardTitle>
                      <Badge>First-party</Badge>
                    </div>
                    <CardDescription className="mt-1 font-mono text-xs">{selectedAgent.slug}@{selectedAgent.version}</CardDescription>
                  </div>
                </div>
                <Badge variant={status === "FAILED" ? "destructive" : status === "RUNNING" ? "secondary" : "outline"}>
                  <span className={`size-1.5 rounded-full ${status === "SUCCESS" ? "bg-[var(--accent-700)]" : status === "RUNNING" ? "bg-blue-400 animate-pulse" : status === "FAILED" ? "bg-red-400" : "bg-[var(--text-500)]"}`} />
                  {status}
                </Badge>
              </div>

              <p className="mt-5 max-w-3xl text-sm font-medium leading-6 text-[var(--text-600)]">{selectedAgent.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedAgent.capabilities ?? []).map((capability) => <Badge key={capability} variant="secondary">{capability}</Badge>)}
                {(selectedAgent.tools ?? []).map((tool) => <Badge key={tool} variant="outline">{tool}</Badge>)}
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              <Tabs defaultValue="playground">
                <TabsList>
                  <TabsTrigger value="playground"><Play /> Playground</TabsTrigger>
                  <TabsTrigger value="trace"><Braces /> Live trace {events.length ? <span className="ml-1 rounded-full bg-[#4800ff]/20 px-1.5 text-[10px] text-[#b699ff]">{events.length}</span> : null}</TabsTrigger>
                </TabsList>
                <TabsContent value="playground">
                  <AgentPlayground
                    agent={selectedAgent}
                    running={running}
                    status={status}
                    result={completedRun}
                    onRun={handleRun}
                  />
                </TabsContent>
                <TabsContent value="trace">
                  <RunTrace runId={runId} status={status} events={events} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="flex min-h-[520px] items-center justify-center text-sm font-semibold text-muted-foreground">No agents are registered yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
