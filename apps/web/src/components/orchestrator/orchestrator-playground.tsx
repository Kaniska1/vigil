"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  Bot,
  CheckCircle2,
  CircleX,
  Clock3,
  ExternalLink,
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
  buttonVariants,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Textarea,
} from "@/components/ui/textarea";

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
  OrchestrationStepStatus,
  OrchestratorPlan,
} from "@/lib/api";

function getStepStatusVariant(
  status: OrchestrationStepStatus
):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" {
  switch (status) {
    case "SUCCESS":
      return "default";

    case "FAILED":
      return "destructive";

    case "RUNNING":
      return "secondary";

    default:
      return "outline";
  }
}

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

export function OrchestratorPlayground() {
  const [
    goal,
    setGoal,
  ] = useState(
    "Review this pull request for code quality and bugs."
  );

  const [
    repository,
    setRepository,
  ] = useState(
    "Kaniska1/blahblah"
  );

  const [
    pullRequest,
    setPullRequest,
  ] = useState("1");

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
      orchestrationStatus !== "RUNNING"
    ) {
      setIsStreamConnected(false);
      return;
    }

    const source =
      new EventSource(
        getOrchestrationStreamUrl(
          orchestrationId
        )
      );

    let finished = false;

    source.onopen = () => {
      setIsStreamConnected(true);
    };

    source.addEventListener(
      "orchestration",
      (rawEvent) => {
        try {
          const event =
            JSON.parse(
              (
                rawEvent as MessageEvent
              ).data
            ) as OrchestrationEvent;

          setOrchestrationEvents(
            (current) =>
              mergeEvent(
                current,
                event
              )
          );

          void getOrchestration(
            orchestrationId
          )
            .then((latest) => {
              setOrchestration(
                latest
              );

              setOrchestrationStatus(
                latest.status
              );

              setOrchestrationEvents(
                latest.events ?? []
              );
            })
            .catch(
              (caughtError) => {
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
        finished = true;

        setIsStreamConnected(
          false
        );

        source.close();

        void getOrchestration(
          orchestrationId
        )
          .then((latest) => {
            setOrchestration(
              latest
            );

            setOrchestrationStatus(
              latest.status
            );

            setOrchestrationEvents(
              latest.events ?? []
            );
          })
          .catch(
            (caughtError) => {
              console.error(
                "Failed to fetch completed orchestration:",
                caughtError
              );
            }
          );
      }
    );

    source.onerror = () => {
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
      finished = true;

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
    if (!goal.trim()) {
      setError(
        "Enter a goal for Vigil."
      );

      return;
    }

    setIsPlanning(true);
    setError(null);

    setPlan(null);
    setOrchestrationId(null);
    setOrchestrationStatus(null);
    setOrchestration(null);
    setOrchestrationEvents([]);

    try {
      const parsedPullRequest =
        Number(
          pullRequest
        );

      const context: Record<
        string,
        unknown
      > = {};

      if (
        repository.trim()
      ) {
        context.repository =
          repository.trim();
      }

      if (
        Number.isInteger(
          parsedPullRequest
        ) &&
        parsedPullRequest > 0
      ) {
        context.pullRequest =
          parsedPullRequest;
      }

      const result =
        await createOrchestratorPlan({
          goal:
            goal.trim(),

          context,
        });

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
       * Do not wait for the persisted
       * orchestration fetch before showing
       * the plan.
       */
      setIsPlanning(false);

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
          persisted.events ?? []
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
      setIsPlanning(false);

      setError(
        caughtError instanceof Error
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

    setIsExecuting(true);
    setError(null);

    try {
      await executeOrchestration(
        orchestrationId
      );

      /*
       * Make the UI transition immediately.
       * This also triggers the SSE effect.
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
          latest.events ?? []
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
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to execute orchestration"
      );
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Network className="size-5" />

          <Badge variant="outline">
            Orchestrator v0.3
          </Badge>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">
          Vigil Orchestrator
        </h1>

        <p className="max-w-2xl text-sm text-muted-foreground">
          Give Vigil an objective.
          It determines the required
          capabilities, resolves
          registered agents, persists
          the workflow, executes it
          asynchronously, and exposes
          the orchestration lifecycle
          live.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6 rounded-xl border bg-card p-6">
          <div className="space-y-2">
            <label
              htmlFor="goal"
              className="text-sm font-medium"
            >
              Goal
            </label>

            <Textarea
              id="goal"
              value={goal}
              onChange={(
                event
              ) =>
                setGoal(
                  event.target
                    .value
                )
              }
              rows={5}
              placeholder="Describe what you want Vigil to accomplish..."
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">
                Context
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Runtime context
                supplied to the
                planner and selected
                agents.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="repository"
                className="text-sm font-medium"
              >
                Repository
              </label>

              <Input
                id="repository"
                value={
                  repository
                }
                onChange={(
                  event
                ) =>
                  setRepository(
                    event.target
                      .value
                  )
                }
                placeholder="owner/repository"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="pull-request"
                className="text-sm font-medium"
              >
                Pull request
              </label>

              <Input
                id="pull-request"
                type="number"
                min="1"
                value={
                  pullRequest
                }
                onChange={(
                  event
                ) =>
                  setPullRequest(
                    event.target
                      .value
                  )
                }
                placeholder="1"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={
              isPlanning ||
              isExecuting
            }
            onClick={
              handleCreatePlan
            }
          >
            {isPlanning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Network className="size-4" />
                Create Plan
              </>
            )}
          </Button>

          {plan &&
          orchestrationId ? (
            <Button
              type="button"
              className="w-full"
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
                  <Loader2 className="size-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Execute Plan
                </>
              )}
            </Button>
          ) : null}

          {orchestrationStatus ===
          "RUNNING" ? (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
              {isStreamConnected ? (
                <>
                  <Radio className="size-3" />
                  Live orchestration
                  stream connected
                </>
              ) : (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Connecting to live
                  stream...
                </>
              )}
            </div>
          ) : null}

          {plan &&
          !plan.executable ? (
            <p className="text-xs text-muted-foreground">
              Execution is disabled
              because required
              capabilities are not
              currently provided by
              the registered agent
              fleet.
            </p>
          ) : null}
        </div>

        <div className="min-h-[460px] rounded-xl border bg-card p-6">
          {!plan &&
          !isPlanning ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-muted/40">
                <Bot className="size-5" />
              </div>

              <p className="font-medium">
                No plan yet
              </p>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Give Vigil an
                objective and it
                will build a
                capability-aware
                execution plan.
              </p>
            </div>
          ) : null}

          {isPlanning ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
              <Loader2 className="size-6 animate-spin" />

              <p className="text-sm text-muted-foreground">
                Gemini is planning
                the objective...
              </p>
            </div>
          ) : null}

          {plan &&
          !isPlanning ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Execution plan
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {
                      plan.summary
                    }
                  </h2>
                </div>

                {orchestrationStatus ? (
                  <Badge
                    variant={
                      orchestrationStatus ===
                        "FAILED" ||
                      orchestrationStatus ===
                        "BLOCKED"
                        ? "destructive"
                        : orchestrationStatus ===
                            "SUCCESS"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {
                      orchestrationStatus
                    }
                  </Badge>
                ) : null}
              </div>

              {orchestrationId ? (
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Orchestration
                  </p>

                  <p className="mt-1 break-all font-mono text-xs">
                    {
                      orchestrationId
                    }
                  </p>
                </div>
              ) : null}

              {plan.executionSteps.length >
              0 ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Selected agents
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Capability
                      requirements
                      consolidated into
                      concrete agent
                      executions.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {plan.executionSteps.map(
                      (
                        executionStep,
                        index
                      ) => {
                        const runtimeStep =
                          orchestration
                            ?.steps.find(
                              (
                                step
                              ) =>
                                step.agent
                                  ?.id ===
                                executionStep
                                  .agent.id
                            );

                        return (
                          <div
                            key={
                              executionStep
                                .agent.id
                            }
                            className="rounded-lg border p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">
                                  {index +
                                    1}
                                  .{" "}
                                  {
                                    executionStep
                                      .agent
                                      .name
                                  }
                                </p>

                                <p className="mt-1 font-mono text-xs text-muted-foreground">
                                  {
                                    executionStep
                                      .agent
                                      .slug
                                  }
                                  @
                                  {
                                    executionStep
                                      .agent
                                      .version
                                  }
                                </p>
                              </div>

                              {runtimeStep ? (
                                <Badge
                                  variant={getStepStatusVariant(
                                    runtimeStep.status
                                  )}
                                >
                                  {runtimeStep.status ===
                                  "RUNNING" ? (
                                    <Loader2 className="mr-1 size-3 animate-spin" />
                                  ) : runtimeStep.status ===
                                    "SUCCESS" ? (
                                    <CheckCircle2 className="mr-1 size-3" />
                                  ) : runtimeStep.status ===
                                    "FAILED" ? (
                                    <CircleX className="mr-1 size-3" />
                                  ) : (
                                    <Clock3 className="mr-1 size-3" />
                                  )}

                                  {
                                    runtimeStep.status
                                  }
                                </Badge>
                              ) : null}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {executionStep.satisfies.map(
                                (
                                  capability
                                ) => (
                                  <Badge
                                    key={
                                      capability
                                    }
                                    variant="outline"
                                  >
                                    {
                                      capability
                                    }
                                  </Badge>
                                )
                              )}
                            </div>

                            {runtimeStep?.run ? (
                              <div className="mt-4 border-t pt-4">
                                <Link
                                  href={`/runs/${runtimeStep.run.id}`}
                                  className={buttonVariants(
                                    {
                                      variant:
                                        "outline",

                                      size:
                                        "sm",
                                    }
                                  )}
                                >
                                  Inspect Run

                                  <ExternalLink className="size-3" />
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Orchestration
                      timeline
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Decisions and
                      coordination
                      performed by
                      Vigil itself.
                    </p>
                  </div>

                  {isStreamConnected ? (
                    <Badge variant="outline">
                      <Radio className="mr-1 size-3" />
                      Live
                    </Badge>
                  ) : null}
                </div>

                {(orchestrationEvents ??
                  []).length >
                0 ? (
                  <div className="space-y-2">
                    {(orchestrationEvents ??
                      []).map(
                      (
                        event
                      ) => (
                        <div
                          key={
                            event.id
                          }
                          className="flex gap-3 rounded-lg border p-3"
                        >
                          <div className="mt-1 size-2 shrink-0 rounded-full bg-foreground" />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                {getEventLabel(
                                  event.type
                                )}
                              </p>

                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  event.createdAt
                                ).toLocaleTimeString()}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-muted-foreground">
                              {
                                event.message
                              }
                            </p>

                            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                              {
                                event.type
                              }
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No orchestration
                    events recorded
                    yet.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Capability
                  requirements
                </p>

                {plan.steps.map(
                  (
                    step,
                    index
                  ) => (
                    <div
                      key={`${step.capability}-${index}`}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {
                            step.capability
                          }
                        </span>

                        <Badge
                          variant={
                            step.required
                              ? "default"
                              : "secondary"
                          }
                        >
                          {step.required
                            ? "Required"
                            : "Optional"}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {
                          step.reason
                        }
                      </p>

                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Registry
                          matches
                        </p>

                        {step.candidates.length >
                        0 ? (
                          <div className="space-y-2">
                            {step.candidates.map(
                              (
                                agent
                              ) => (
                                <div
                                  key={
                                    agent.id
                                  }
                                  className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {
                                        agent.name
                                      }
                                    </p>

                                    <p className="font-mono text-xs text-muted-foreground">
                                      {
                                        agent.slug
                                      }
                                      @
                                      {
                                        agent.version
                                      }
                                    </p>
                                  </div>

                                  <CheckCircle2 className="size-4 text-muted-foreground" />
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed p-3">
                            <p className="text-sm text-muted-foreground">
                              No
                              registered
                              agent
                              currently
                              provides
                              this
                              capability.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {plan.unresolvedCapabilities.length >
              0 ? (
                <div className="rounded-lg border border-destructive/30 p-4">
                  <p className="text-sm font-medium">
                    Missing required
                    capabilities
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.unresolvedCapabilities.map(
                      (
                        capability
                      ) => (
                        <Badge
                          key={
                            capability
                          }
                          variant="outline"
                        >
                          {
                            capability
                          }
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              ) : null}

              {plan.unresolvedOptionalCapabilities.length >
              0 ? (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm font-medium">
                    Missing optional
                    capabilities
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.unresolvedOptionalCapabilities.map(
                      (
                        capability
                      ) => (
                        <Badge
                          key={
                            capability
                          }
                          variant="outline"
                        >
                          {
                            capability
                          }
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}