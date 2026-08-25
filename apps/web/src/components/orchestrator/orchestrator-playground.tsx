"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Bot,
  CheckCircle2,
  CircleX,
  Loader2,
  Network,
  Play,
  Radio,
} from "lucide-react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import { PromptBar } from "./prompt-bar";
import { ThinkingState } from "./thinking-state";

import {
  ContextCards,
  type ContextEntry,
} from "./context-cards";

import { TaskRows } from "./task-rows";

import {
  createOrchestratorPlan,
  executeOrchestration,
  getOrchestration,
  getOrchestrationStreamUrl,
} from "@/lib/api";

import type {
  OrchestrationDetails,
  OrchestrationEvent,
  OrchestrationEventType,
  OrchestrationStatus,
  OrchestratorPlan,
} from "@/lib/api";

function getEventLabel(
  type: OrchestrationEventType
) {
  switch (type) {
    case "PLAN_CREATED":
      return "Plan created";

    case "AGENT_SELECTED":
      return "Agent selected";

    case "ORCHESTRATION_STARTED":
      return "Execution started";

    case "STEP_STARTED":
      return "Step started";

    case "STEP_COMPLETED":
      return "Step completed";

    case "STEP_FAILED":
      return "Step failed";

    case "ORCHESTRATION_COMPLETED":
      return "Completed";

    case "ORCHESTRATION_FAILED":
      return "Failed";
  }
}

function mergeEvent(
  current: OrchestrationEvent[],
  incoming: OrchestrationEvent
) {
  if (
    current.some(
      (event) =>
        event.id === incoming.id
    )
  ) {
    return current;
  }

  return [
    ...current,
    incoming,
  ].sort(
    (left, right) =>
      new Date(
        left.createdAt
      ).getTime() -
      new Date(
        right.createdAt
      ).getTime()
  );
}

function parseContextValue(
  value: string
): unknown {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed === "true"
  ) {
    return true;
  }

  if (
    trimmed === "false"
  ) {
    return false;
  }

  if (
    /^-?\d+(\.\d+)?$/.test(
      trimmed
    )
  ) {
    return Number(
      trimmed
    );
  }

  if (
    (
      trimmed.startsWith(
        "{"
      ) &&
      trimmed.endsWith(
        "}"
      )
    ) ||
    (
      trimmed.startsWith(
        "["
      ) &&
      trimmed.endsWith(
        "]"
      )
    )
  ) {
    try {
      return JSON.parse(
        trimmed
      );
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export function OrchestratorPlayground() {
  const [
    goal,
    setGoal,
  ] = useState("");

  const [
    contextEntries,
    setContextEntries,
  ] =
    useState<
      ContextEntry[]
    >([]);

  const [
    plan,
    setPlan,
  ] =
    useState<OrchestratorPlan | null>(
      null
    );

  const [
    orchestrationId,
    setOrchestrationId,
  ] =
    useState<string | null>(
      null
    );

  const [
    orchestrationStatus,
    setOrchestrationStatus,
  ] =
    useState<OrchestrationStatus | null>(
      null
    );

  const [
    orchestration,
    setOrchestration,
  ] =
    useState<OrchestrationDetails | null>(
      null
    );

  const [
    orchestrationEvents,
    setOrchestrationEvents,
  ] =
    useState<OrchestrationEvent[]>(
      []
    );

  const [
    isStreamConnected,
    setIsStreamConnected,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    isPlanning,
    setIsPlanning,
  ] = useState(false);

  const [
    isExecuting,
    setIsExecuting,
  ] = useState(false);

  useEffect(() => {
    if (
      !orchestrationId ||
      orchestrationStatus !==
        "RUNNING"
    ) {
      setIsStreamConnected(
        false
      );

      return;
    }

    const source =
      new EventSource(
        getOrchestrationStreamUrl(
          orchestrationId
        )
      );

    let finished =
      false;

    source.onopen =
      () => {
        setIsStreamConnected(
          true
        );
      };

    source.addEventListener(
      "orchestration",
      (
        rawEvent
      ) => {
        try {
          const event =
            JSON.parse(
              (
                rawEvent as MessageEvent
              ).data
            ) as OrchestrationEvent;

          setOrchestrationEvents(
            (
              current
            ) =>
              mergeEvent(
                current,
                event
              )
          );

          void getOrchestration(
            orchestrationId
          )
            .then(
              (
                latest
              ) => {
                setOrchestration(
                  latest
                );

                setOrchestrationStatus(
                  latest.status
                );

                setOrchestrationEvents(
                  latest.events ??
                    []
                );
              }
            )
            .catch(
              (
                caughtError
              ) => {
                console.error(
                  "Failed to refresh orchestration after SSE event:",
                  caughtError
                );
              }
            );
        } catch (
          caughtError
        ) {
          console.error(
            "Failed to parse orchestration event:",
            caughtError
          );
        }
      }
    );

    source.addEventListener(
      "done",
      () => {
        finished =
          true;

        setIsStreamConnected(
          false
        );

        source.close();

        void getOrchestration(
          orchestrationId
        )
          .then(
            (
              latest
            ) => {
              setOrchestration(
                latest
              );

              setOrchestrationStatus(
                latest.status
              );

              setOrchestrationEvents(
                latest.events ??
                  []
              );
            }
          )
          .catch(
            (
              caughtError
            ) => {
              console.error(
                "Failed to fetch completed orchestration:",
                caughtError
              );
            }
          );
      }
    );

    source.onerror =
      () => {
        setIsStreamConnected(
          false
        );

        if (
          finished ||
          source.readyState ===
            EventSource.CLOSED
        ) {
          return;
        }

        console.warn(
          "Orchestration SSE connection interrupted"
        );
      };

    return () => {
      finished =
        true;

      setIsStreamConnected(
        false
      );

      source.close();
    };
  }, [
    orchestrationId,
    orchestrationStatus,
  ]);

  async function handleCreatePlan() {
    if (
      !goal.trim()
    ) {
      setError(
        "Enter a goal for Vigil."
      );

      return;
    }

    setIsPlanning(
      true
    );

    setError(
      null
    );

    setPlan(
      null
    );

    setOrchestrationId(
      null
    );

    setOrchestrationStatus(
      null
    );

    setOrchestration(
      null
    );

    setOrchestrationEvents(
      []
    );

    try {
      const context =
        contextEntries.reduce<
          Record<
            string,
            unknown
          >
        >(
          (
            accumulated,
            entry
          ) => {
            const key =
              entry.key.trim();

            if (
              !key
            ) {
              return accumulated;
            }

            accumulated[
              key
            ] =
              parseContextValue(
                entry.value
              );

            return accumulated;
          },
          {}
        );

      const result =
        await createOrchestratorPlan(
          {
            goal:
              goal.trim(),

            context,
          }
        );

      setPlan(
        result.plan
      );

      setOrchestrationId(
        result.orchestrationId
      );

      setOrchestrationStatus(
        result.status
      );

      /*
       * Show the generated plan immediately
       * instead of waiting for the persisted
       * orchestration fetch.
       */
      setIsPlanning(
        false
      );

      try {
        const persisted =
          await getOrchestration(
            result.orchestrationId
          );

        setOrchestration(
          persisted
        );

        setOrchestrationStatus(
          persisted.status
        );

        setOrchestrationEvents(
          persisted.events ??
            []
        );
      } catch (
        persistenceError
      ) {
        console.error(
          "Plan created, but failed to load persisted orchestration:",
          persistenceError
        );
      }
    } catch (
      caughtError
    ) {
      setIsPlanning(
        false
      );

      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Failed to create plan"
      );
    }
  }

  async function handleExecutePlan() {
    if (
      !orchestrationId ||
      !plan?.executable ||
      orchestrationStatus !==
        "READY"
    ) {
      return;
    }

    setIsExecuting(
      true
    );

    setError(
      null
    );

    try {
      await executeOrchestration(
        orchestrationId
      );

      /*
       * Transition immediately so the
       * SSE connection starts without
       * waiting for another API read.
       */
      setOrchestrationStatus(
        "RUNNING"
      );

      try {
        const latest =
          await getOrchestration(
            orchestrationId
          );

        setOrchestration(
          latest
        );

        setOrchestrationStatus(
          latest.status
        );

        setOrchestrationEvents(
          latest.events ??
            []
        );
      } catch (
        persistenceError
      ) {
        console.error(
          "Execution started, but failed to refresh persisted orchestration:",
          persistenceError
        );
      }
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Failed to execute orchestration"
      );
    } finally {
      setIsExecuting(
        false
      );
    }
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-5 border-b border-[var(--line)] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            <Network className="size-4 text-[var(--accent-800)]" />

            Autonomous orchestration

            <Badge variant="secondary">
              v0.3
            </Badge>
          </div>

          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
            Plan. Route. Observe.
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--ink-2)]">
            Give Vigil a goal. The planner resolves the capabilities it needs, selects registered specialist agents, and exposes the full execution path.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              orchestrationStatus ===
              "FAILED"
                ? "destructive"
                : orchestrationStatus ===
                    "RUNNING"
                  ? "secondary"
                  : "outline"
            }
          >
            <span
              className={`size-1.5 rounded-full ${
                orchestrationStatus ===
                "RUNNING"
                  ? "bg-[var(--primary-600)] animate-pulse"
                  : orchestrationStatus ===
                      "SUCCESS"
                    ? "bg-[var(--accent-700)]"
                    : orchestrationStatus ===
                        "FAILED"
                      ? "bg-red-400"
                      : "bg-[var(--text-500)]"
              }`}
            />

            {orchestrationStatus ??
              "IDLE"}
          </Badge>

          {isStreamConnected ? (
            <Badge>
              <Radio className="size-3" />
              LIVE
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[390px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_18px_55px_rgba(0,0,0,.24)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-extrabold text-[var(--ink)]">
                  Goal
                </p>

                <p className="mt-1 text-[11px] font-medium text-[var(--ink-3)]">
                  Natural language in, validated execution plan out.
                </p>
              </div>

              <span className="rounded-[7px] border border-[var(--line)] bg-[var(--inset)] px-2 py-1 font-mono text-[9px] font-bold text-[var(--primary-800)]">
                PLANNER
              </span>
            </div>

            <PromptBar
              value={goal}
              onChange={
                setGoal
              }
              onSend={
                handleCreatePlan
              }
              disabled={
                isPlanning ||
                isExecuting
              }
            />

            {error ? (
              <div className="mt-3 rounded-[12px] border border-red-500/20 bg-red-500/8 p-3 text-[11.5px] font-semibold leading-5 text-red-300">
                {error}
              </div>
            ) : null}
          </div>

          <ContextCards
            entries={
              contextEntries
            }
            missingInputs={
              plan?.missingInputs ??
              []
            }
            onChange={
              setContextEntries
            }
            onReplan={
              handleCreatePlan
            }
            isReplanning={
              isPlanning
            }
            disabled={
              isExecuting
            }
          />

          {plan?.missingInputs?.length ? (
            <div className="rounded-[12px] border border-[var(--primary-500)]/20 bg-[var(--blue-tint)] px-3 py-2.5 text-[10.5px] font-semibold leading-4 text-[var(--primary-800)]">
              Execution is blocked until the required runtime context is supplied and Vigil creates a new plan.
            </div>
          ) : null}

          {plan &&
          orchestrationId ? (
            <Button
              type="button"
              size="lg"
              className="w-full rounded-[14px]"
              disabled={
                !plan.executable ||
                orchestrationStatus !==
                  "READY" ||
                isExecuting
              }
              onClick={
                handleExecutePlan
              }
            >
              {isExecuting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Starting runtime...
                </>
              ) : (
                <>
                  <Play />
                  Execute plan
                </>
              )}
            </Button>
          ) : null}

          {orchestrationStatus ===
          "RUNNING" ? (
            <div className="flex items-center gap-2 rounded-[13px] border border-[var(--primary-500)]/20 bg-[var(--blue-tint)] px-3 py-2.5 text-[11px] font-bold text-[var(--primary-800)]">
              {isStreamConnected ? (
                <Radio className="size-3.5" />
              ) : (
                <Loader2 className="size-3.5 animate-spin" />
              )}

              {isStreamConnected
                ? "Live execution stream connected"
                : "Connecting to orchestration stream"}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 space-y-5">
          <div className="relative min-h-[430px] overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(0,0,0,.28)]">
            <div className="pointer-events-none absolute inset-0 vigil-grid opacity-20" />

            <div className="relative flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-[13.5px] font-extrabold tracking-[-0.02em] text-[var(--ink)]">
                  Execution graph
                </p>

                <p className="mt-1 text-[11px] font-medium text-[var(--ink-3)]">
                  Agent tasks stay expandable and traceable as the runtime progresses.
                </p>
              </div>

              {plan ? (
                <Badge
                  variant={
                    plan.executable
                      ? "default"
                      : "destructive"
                  }
                >
                  {plan.executable
                    ? "Executable"
                    : "Blocked"}
                </Badge>
              ) : null}
            </div>

            <div className="relative p-5">
              {!plan &&
              !isPlanning ? (
                <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-[16px] border border-[var(--line-strong)] bg-gradient-to-br from-[var(--primary-100)] to-[var(--accent-100)] text-[var(--accent-800)] shadow-[0_18px_45px_rgba(72,0,255,.14)]">
                    <Bot className="size-5" />
                  </div>

                  <p className="text-[14px] font-extrabold text-[var(--ink)]">
                    No execution plan yet
                  </p>

                  <p className="mt-2 max-w-sm text-[12px] font-medium leading-5 text-[var(--ink-3)]">
                    Describe a goal on the left. Vigil will resolve it against the live agent registry.
                  </p>
                </div>
              ) : null}

              {isPlanning ? (
                <div className="flex min-h-[330px] items-center justify-center">
                  <ThinkingState
                    active
                  />
                </div>
              ) : null}

              {plan &&
              !isPlanning ? (
                <div>
                  <div className="mb-4 rounded-[15px] border border-[var(--line)] bg-[var(--inset)] p-3.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                      Planner summary
                    </p>

                    <p className="mt-1.5 text-[12.5px] font-semibold leading-5 text-[var(--ink-2)]">
                      {
                        plan.summary
                      }
                    </p>
                  </div>

                  <TaskRows
                    plan={
                      plan
                    }
                    orchestration={
                      orchestration
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>

          {plan ? (
            <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
              <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_14px_45px_rgba(0,0,0,.2)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-extrabold text-[var(--ink)]">
                      Orchestration timeline
                    </p>

                    <p className="mt-1 text-[10.5px] font-medium text-[var(--ink-3)]">
                      High-level runtime coordination.
                    </p>
                  </div>

                  <Badge variant="outline">
                    {
                      orchestrationEvents.length
                    }{" "}
                    events
                  </Badge>
                </div>

                <div className="space-y-0">
                  {orchestrationEvents.length ? (
                    orchestrationEvents.map(
                      (
                        event,
                        index
                      ) => (
                        <div
                          key={
                            event.id
                          }
                          className="relative flex gap-3 pb-4 last:pb-0"
                        >
                          {index <
                          orchestrationEvents.length -
                            1 ? (
                            <span className="absolute left-[6px] top-4 h-[calc(100%-7px)] w-px bg-[var(--line)]" />
                          ) : null}

                          <span
                            className={`relative mt-1 size-3 shrink-0 rounded-full border-[3px] border-[var(--surface)] ${
                              event.type.includes(
                                "FAILED"
                              )
                                ? "bg-red-400"
                                : event.type.includes(
                                      "COMPLETED"
                                    )
                                  ? "bg-[var(--accent-700)]"
                                  : "bg-[var(--primary-600)]"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11.5px] font-extrabold text-[var(--ink)]">
                                {getEventLabel(
                                  event.type
                                )}
                              </p>

                              <time className="font-mono text-[9px] text-[var(--ink-3)]">
                                {new Date(
                                  event.createdAt
                                ).toLocaleTimeString()}
                              </time>
                            </div>

                            <p className="mt-1 text-[11px] font-medium leading-4 text-[var(--ink-3)]">
                              {
                                event.message
                              }
                            </p>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="rounded-[12px] border border-dashed border-[var(--line)] px-4 py-8 text-center text-[11px] font-semibold text-[var(--ink-3)]">
                      Events will appear when the plan is executed.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_14px_45px_rgba(0,0,0,.2)]">
                <div className="mb-4">
                  <p className="text-[13px] font-extrabold text-[var(--ink)]">
                    Capability resolution
                  </p>

                  <p className="mt-1 text-[10.5px] font-medium text-[var(--ink-3)]">
                    Requested capabilities and registry matches.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {plan.steps.map(
                    (
                      step,
                      index
                    ) => (
                      <div
                        key={`${step.capability}-${index}`}
                        className="rounded-[13px] border border-[var(--line)] bg-[var(--inset)] p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-[10.5px] font-semibold text-[var(--primary-800)]">
                            {
                              step.capability
                            }
                          </span>

                          <Badge
                            variant={
                              step.required
                                ? "default"
                                : "outline"
                            }
                          >
                            {step.required
                              ? "Required"
                              : "Optional"}
                          </Badge>
                        </div>

                        <p className="mt-2 text-[10.5px] font-medium leading-4 text-[var(--ink-3)]">
                          {
                            step.reason
                          }
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-[9.5px] font-bold text-[var(--ink-3)]">
                          {step
                            .candidates
                            .length ? (
                            <CheckCircle2 className="size-3 text-[var(--accent-800)]" />
                          ) : (
                            <CircleX className="size-3 text-red-400" />
                          )}

                          {step
                            .candidates
                            .length
                            ? `${
                                step
                                  .candidates
                                  .length
                              } registry match${
                                step
                                  .candidates
                                  .length ===
                                1
                                  ? ""
                                  : "es"
                              }`
                            : "No matching agent"}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}