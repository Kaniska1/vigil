"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  Clock3,
  Network,
  Plus,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  getOrchestrations,
  type OrchestrationDetails,
  type OrchestrationStatus,
} from "@/lib/api";

function getStatusVariant(
  status: OrchestrationStatus
):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" {
  switch (status) {
    case "SUCCESS":
      return "default";

    case "FAILED":
    case "CANCELLED":
      return "destructive";

    case "RUNNING":
    case "EVALUATING":
    case "REPLANNING":
      return "secondary";

    default:
      return "outline";
  }
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}

export function OrchestrationList() {
  const [
    orchestrations,
    setOrchestrations,
  ] = useState<
    OrchestrationDetails[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  async function load(
    refresh = false
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result =
        await getOrchestrations();

      setOrchestrations(
        result
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load orchestrations"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            <Network className="size-4 text-[var(--accent-800)]" />
            Orchestrations
          </div>

          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
            Your autonomous workflows
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-3)]">
            Create new goals, revisit previous executions, and inspect how Vigil planned and coordinated each workflow.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              void load(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              className={`size-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </Button>

          <Link
            href="/orchestrations/new"
            className={buttonVariants()}
          >
            <Plus className="size-4" />
            New orchestration
          </Link>
        </div>
      </div>

      {error ? (
        <Card className="border-red-500/30">
          <CardContent className="py-5 text-sm font-semibold text-red-300">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <Card
              key={index}
              className="min-h-44 animate-pulse"
            />
          ))}
        </div>
      ) : null}

      {!loading &&
      !orchestrations.length ? (
        <Card>
          <CardHeader className="items-center py-12 text-center">
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--inset)]">
              <Network className="size-5 text-[var(--primary-700)]" />
            </div>
            <CardTitle>
              No orchestrations yet
            </CardTitle>
            <CardDescription className="max-w-md">
              Give Vigil an objective and it will plan the capabilities, select agents, and persist the workflow here.
            </CardDescription>
            <Link
              href="/orchestrations/new"
              className={buttonVariants({
                className: "mt-3",
              })}
            >
              <Plus className="size-4" />
              Create your first orchestration
            </Link>
          </CardHeader>
        </Card>
      ) : null}

      {!loading &&
      orchestrations.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {orchestrations.map(
            (orchestration) => (
              <Link
                key={orchestration.id}
                href={`/orchestrations/${orchestration.id}`}
                className="group"
              >
                <Card className="h-full transition-transform duration-200 group-hover:-translate-y-0.5">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="line-clamp-2 text-base leading-6">
                        {orchestration.goal}
                      </CardTitle>

                      <Badge
                        variant={getStatusVariant(
                          orchestration.status
                        )}
                      >
                        {orchestration.status}
                      </Badge>
                    </div>

                    <CardDescription className="line-clamp-2 min-h-10 leading-5">
                      {orchestration.summary ??
                        "Vigil orchestration"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between gap-4 text-xs font-semibold text-[var(--ink-3)]">
                      <span>
                        {orchestration.steps.length}{" "}
                        {orchestration.steps.length === 1
                          ? "step"
                          : "steps"}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        {formatDate(
                          orchestration.createdAt
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
