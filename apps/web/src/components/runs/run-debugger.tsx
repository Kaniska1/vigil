import Link from "next/link";

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  Code2,
  Coins,
  DatabaseZap,
  GitBranch,
  Gauge,
  MessagesSquare,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import type {
  RunDetails,
  RunStatus,
  TraceEvent,
} from "@/lib/api";

import {
  Badge,
} from "@/components/ui/badge";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Separator,
} from "@/components/ui/separator";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  cn,
} from "@/lib/utils";

type Props = {
  run: RunDetails;
};

type LLMCompletedMetadata = {
  provider?: string;
  model?: string;
  latencyMs?: number;

  estimatedCostUsd?:
    | number
    | null;

  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    thinkingTokens?: number;
    totalTokens?: number;
  } | null;
};

function statusVariant(
  status: RunStatus
):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" {
  if (
    status === "FAILED"
  ) {
    return "destructive";
  }

  if (
    status === "RUNNING"
  ) {
    return "secondary";
  }

  if (
    status === "SUCCESS"
  ) {
    return "default";
  }

  return "outline";
}

function eventIcon(
  event: TraceEvent
) {
  if (
    event.type === "ERROR"
  ) {
    return (
      <TriangleAlert className="size-4" />
    );
  }

  if (
    event.type ===
      "TOOL_CALLED" ||
    event.type ===
      "TOOL_COMPLETED"
  ) {
    return (
      <DatabaseZap className="size-4" />
    );
  }

  if (
    event.type ===
      "LLM_STARTED" ||
    event.type ===
      "LLM_COMPLETED"
  ) {
    return (
      <Bot className="size-4" />
    );
  }

  if (
    event.type ===
    "RUN_COMPLETED"
  ) {
    return (
      <CheckCircle2 className="size-4" />
    );
  }

  return (
    <CircleDot className="size-4" />
  );
}

function getDuration(
  run: RunDetails
) {
  if (
    !run.startedAt ||
    !run.completedAt
  ) {
    return null;
  }

  return (
    new Date(
      run.completedAt
    ).getTime() -
    new Date(
      run.startedAt
    ).getTime()
  );
}

function formatDuration(
  milliseconds:
    | number
    | null
) {
  if (
    milliseconds ===
    null
  ) {
    return "—";
  }

  if (
    milliseconds < 1000
  ) {
    return `${milliseconds} ms`;
  }

  return `${(
    milliseconds /
    1000
  ).toFixed(2)} s`;
}

function getRelativeTime(
  run: RunDetails,
  event: TraceEvent
) {
  if (!run.startedAt) {
    return "—";
  }

  const offset =
    new Date(
      event.createdAt
    ).getTime() -
    new Date(
      run.startedAt
    ).getTime();

  if (offset < 1000) {
    return `+${offset}ms`;
  }

  return `+${(
    offset / 1000
  ).toFixed(2)}s`;
}

function getLLMMetadata(
  run: RunDetails
): LLMCompletedMetadata | null {
  const event =
    run.events.find(
      (item) =>
        item.type ===
        "LLM_COMPLETED"
    );

  if (
    !event?.metadata
  ) {
    return null;
  }

  return event.metadata as
    LLMCompletedMetadata;
}

function getToolCalls(
  run: RunDetails
) {
  return run.events.filter(
    (event) =>
      event.type ===
      "TOOL_CALLED"
  ).length;
}

function getToolLatency(
  run: RunDetails
) {
  return run.events
    .filter(
      (event) =>
        event.type ===
        "TOOL_COMPLETED"
    )
    .reduce(
      (
        total,
        event
      ) => {
        const latency =
          event.metadata
            ?.latencyMs;

        return (
          total +
          (typeof latency ===
          "number"
            ? latency
            : 0)
        );
      },
      0
    );
}

function formatCost(
  value:
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (value < 0.01) {
    return `$${value.toFixed(
      5
    )}`;
  }

  return `$${value.toFixed(
    3
  )}`;
}

export function RunDebugger({
  run,
}: Props) {
  const duration =
    getDuration(run);

  const model =
    run.result?.output
      ?.model;

  const review =
    run.result?.output
      ?.review;

  const llmMetadata =
    getLLMMetadata(run);

  const toolCalls =
    getToolCalls(run);

  const toolLatency =
    getToolLatency(run);

  const usage =
    llmMetadata?.usage;

  return (
    <div>
      <div className="flex flex-col gap-6">
        <header className="space-y-5 border-b border-[#333333] pb-6">
          <Link
            href="/runs"
            className={cn(
              buttonVariants({
                variant:
                  "ghost",
              }),
              "w-fit gap-2"
            )}
          >
            <ArrowLeft className="size-4" />
            Back to Runs
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={statusVariant(
                    run.status
                  )}
                >
                  {run.status}
                </Badge>

                <Badge variant="outline">
                  <Bot className="size-4" />
                  {
                    run.agent
                      .name
                  }
                </Badge>

                {model ? (
                  <Badge variant="secondary">
                    <Code2 className="size-4" />
                    {model}
                  </Badge>
                ) : null}
              </div>

              <div>
                <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em]">
                  Run Debugger
                </h1>

                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <GitBranch className="size-4" />

                  <code>
                    {run.id}
                  </code>
                </div>
              </div>
            </div>

            <Link
              href="/agents"
              className={buttonVariants({
                variant:
                  "outline",
              })}
            >
              Open Playground
            </Link>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Total Duration
              </CardDescription>

              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-5" />

                {formatDuration(
                  duration
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                LLM Latency
              </CardDescription>

              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-5" />

                {formatDuration(
                  llmMetadata?.latencyMs ??
                    null
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Tool Calls
              </CardDescription>

              <CardTitle className="flex items-center gap-2">
                <Wrench className="size-5" />
                {toolCalls}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Estimated Cost
              </CardDescription>

              <CardTitle className="flex items-center gap-2">
                <Coins className="size-5" />

                {formatCost(
                  llmMetadata?.estimatedCostUsd
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Input Tokens
              </CardDescription>

              <CardTitle>
                {usage?.inputTokens?.toLocaleString() ??
                  "—"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Output Tokens
              </CardDescription>

              <CardTitle>
                {usage?.outputTokens?.toLocaleString() ??
                  "—"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Total Tokens
              </CardDescription>

              <CardTitle className="flex items-center gap-2">
                <MessagesSquare className="size-5" />

                {usage?.totalTokens?.toLocaleString() ??
                  "—"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Tool Latency
              </CardDescription>

              <CardTitle>
                {formatDuration(
                  toolLatency
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs
          defaultValue="trace"
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="trace">
              Trace
            </TabsTrigger>

            <TabsTrigger value="result">
              Result
            </TabsTrigger>

            <TabsTrigger value="raw">
              Raw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trace">
            <Card>
              <CardHeader>
                <CardTitle>
                  Execution Timeline
                </CardTitle>

                <CardDescription>
                  Every recorded event
                  from this agent run.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-0">
                  {run.events.map(
                    (
                      event,
                      index
                    ) => (
                      <div
                        key={
                          event.id
                        }
                        className="relative flex gap-4 pb-7"
                      >
                        {index !==
                        run.events
                          .length -
                          1 ? (
                          <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-border" />
                        ) : null}

                        <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
                          {eventIcon(
                            event
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pt-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">
                                {
                                  event.type
                                }
                              </span>

                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {getRelativeTime(
                                  run,
                                  event
                                )}
                              </Badge>
                            </div>

                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                event.createdAt
                              ).toLocaleTimeString()}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-muted-foreground">
                            {
                              event.message
                            }
                          </p>

                          {event.metadata ? (
                            <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5">
                              {JSON.stringify(
                                event.metadata,
                                null,
                                2
                              )}
                            </pre>
                          ) : null}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result">
            <Card>
              <CardHeader>
                <CardTitle>
                  Agent Output
                </CardTitle>

                <CardDescription>
                  Persisted result from
                  this execution.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {review ? (
                  <div className="whitespace-pre-wrap text-sm leading-7">
                    {review}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This run has no
                    persisted text
                    output.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>
                  Raw Run
                </CardTitle>

                <CardDescription>
                  Full persisted run
                  representation.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5">
                  {JSON.stringify(
                    run,
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />
      </div>
    </div>
  );
}