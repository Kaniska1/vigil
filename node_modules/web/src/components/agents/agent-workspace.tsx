"use client";

import { useState } from "react";

import {
  Activity,
  Bot,
  Braces,
  GitPullRequest,
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

  async function handleRun(input: {
    repository: string;
    pullRequest: number;
  }) {
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="size-5" />

            <Badge variant="secondary">
              Agent Infrastructure
            </Badge>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight">
            Vigil
          </h1>

          <p className="max-w-2xl text-muted-foreground">
            Discover, execute, and
            inspect AI agents.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {agents.map(
              (agent) => {
                const selected =
                  selectedAgent?.id ===
                  agent.id;

                return (
                  <Card
                    key={
                      agent.id
                    }
                    className={
                      selected
                        ? "cursor-pointer border-primary"
                        : "cursor-pointer"
                    }
                    onClick={() =>
                      handleAgentSelection(
                        agent
                      )
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-10 items-center justify-center rounded-md border">
                          <Bot className="size-5" />
                        </div>

                        <Badge variant="outline">
                          v
                          {
                            agent.version
                          }
                        </Badge>
                      </div>

                      <CardTitle className="pt-3">
                        {
                          agent.name
                        }
                      </CardTitle>

                      <CardDescription>
                        {
                          agent.description
                        }
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              }
            )}
          </div>

          {selectedAgent ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-md border">
                    <GitPullRequest className="size-5" />
                  </div>

                  <div>
                    <CardTitle>
                      {
                        selectedAgent.name
                      }
                    </CardTitle>

                    <CardDescription>
                      {
                        selectedAgent.slug
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="playground">
                  <TabsList>
                    <TabsTrigger value="playground">
                      <Play className="size-4" />

                      Playground
                    </TabsTrigger>

                    <TabsTrigger value="trace">
                      <Braces className="size-4" />

                      Trace
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="playground">
                    <AgentPlayground
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
                  </TabsContent>

                  <TabsContent value="trace">
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
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}