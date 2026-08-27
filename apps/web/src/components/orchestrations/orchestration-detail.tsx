"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  Bot,
  Clock3,
  Network,
  Play,
  Radio,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { OrchestrationTabs } from "./orchestration-tabs";
import {
  Button,
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
  executeOrchestration,
  getOrchestration,
  getOrchestrationStreamUrl,
  type OrchestrationDetails,
} from "@/lib/api";

export function OrchestrationDetail({
  orchestrationId,
}: {
  orchestrationId: string;
}) {
  const [
    orchestration,
    setOrchestration,
  ] = useState<OrchestrationDetails | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    executing,
    setExecuting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  async function refresh() {
    const latest =
      await getOrchestration(
        orchestrationId
      );

    setOrchestration(
      latest
    );

    return latest;
  }

  useEffect(() => {
    let cancelled = false;

    void getOrchestration(
      orchestrationId
    )
      .then((result) => {
        if (!cancelled) {
          setOrchestration(
            result
          );
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Failed to load orchestration"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orchestrationId]);

  useEffect(() => {
    if (
      orchestration?.status !==
      "RUNNING"
    ) {
      return;
    }

    const source =
      new EventSource(
        getOrchestrationStreamUrl(
          orchestrationId
        )
      );

    source.addEventListener(
      "orchestration",
      () => {
        void refresh().catch(
          console.error
        );
      }
    );

    source.addEventListener(
      "done",
      () => {
        source.close();
        void refresh().catch(
          console.error
        );
      }
    );

    return () => {
      source.close();
    };
  }, [
    orchestration?.status,
    orchestrationId,
  ]);

  async function handleExecute() {
    if (
      orchestration?.status !==
      "READY"
    ) {
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      await executeOrchestration(
        orchestrationId
      );

      setOrchestration((current) =>
        current
          ? {
              ...current,
              status: "RUNNING",
            }
          : current
      );

      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to execute orchestration"
      );
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <Card className="min-h-72 animate-pulse" />
    );
  }

  if (
    error &&
    !orchestration
  ) {
    return (
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle>
            Could not load orchestration
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!orchestration) {
    return null;
  }

  return (
    <div className="space-y-6">
      <OrchestrationTabs
        currentId={orchestration.id}
        currentTitle={orchestration.goal}
        currentStatus={orchestration.status}
      />

      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/orchestrations"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "-ml-2 mb-2",
            })}
          >
            <ArrowLeft className="size-4" />
            Orchestrations
          </Link>

          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            <Network className="size-4 text-[var(--accent-800)]" />
            Saved orchestration
          </div>

          <h1 className="max-w-4xl text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
            {orchestration.goal}
          </h1>

          {orchestration.summary ? (
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[var(--ink-3)]">
              {orchestration.summary}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {orchestration.status}
          </Badge>

          {orchestration.status ===
          "READY" ? (
            <Button
              onClick={() =>
                void handleExecute()
              }
              disabled={executing}
            >
              <Play className="size-4" />
              {executing
                ? "Starting..."
                : "Execute"}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="border-red-500/30">
          <CardContent className="py-4 text-sm font-semibold text-red-300">
            {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Status
            </CardDescription>
            <CardTitle className="text-lg">
              {orchestration.status}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Execution graph
            </CardDescription>
            <CardTitle className="text-lg">
              {orchestration.steps.length}{" "}
              steps
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Created
            </CardDescription>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock3 className="size-4" />
              {new Date(
                orchestration.createdAt
              ).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Execution steps
            </CardTitle>
            <CardDescription>
              The persisted agent graph for this orchestration.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {orchestration.steps.map(
              (step) => (
                <Card
                  key={step.id}
                  className="bg-[var(--inset)]"
                >
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)]">
                      <Bot className="size-4 text-[var(--primary-700)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                        {step.agent?.name ??
                          "Runtime action"}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-[var(--ink-3)]">
                        {step.satisfies.join(
                          ", "
                        ) ||
                          "Runtime step"}
                      </p>
                    </div>

                    <Badge variant="outline">
                      {step.status}
                    </Badge>
                  </CardContent>
                </Card>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-[var(--accent-800)]" />
              <CardTitle>
                Orchestration timeline
              </CardTitle>
            </div>
            <CardDescription>
              Persisted high-level coordination events.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {orchestration.events.length ? (
              orchestration.events.map(
                (event) => (
                  <div
                    key={event.id}
                    className="border-l border-[var(--line)] pl-3"
                  >
                    <p className="text-sm font-bold text-[var(--ink)]">
                      {event.message}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--ink-3)]">
                      {event.type} ·{" "}
                      {new Date(
                        event.createdAt
                      ).toLocaleTimeString()}
                    </p>
                  </div>
                )
              )
            ) : (
              <p className="text-sm font-medium text-[var(--ink-3)]">
                No orchestration events yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
