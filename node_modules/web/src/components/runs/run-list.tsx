import Link from "next/link";

import {
  Activity,
  ArrowUpRight,
  Bot,
  Clock3,
  GitBranch,
  ListTree,
} from "lucide-react";

import type {
  RunStatus,
  RunSummary,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";

type Props = {
  runs: RunSummary[];
};

function statusVariant(
  status: RunStatus
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

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle: "medium",
      timeStyle: "medium",
    }
  ).format(
    new Date(value)
  );
}

function formatDuration(
  run: RunSummary
) {
  if (
    !run.startedAt ||
    !run.completedAt
  ) {
    return "—";
  }

  const duration =
    new Date(
      run.completedAt
    ).getTime() -
    new Date(
      run.startedAt
    ).getTime();

  if (duration < 1000) {
    return `${duration} ms`;
  }

  return `${(
    duration / 1000
  ).toFixed(2)} s`;
}

export function RunList({
  runs,
}: Props) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4" />

              <Badge variant="secondary">
                Execution History
              </Badge>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Runs
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Inspect persisted agent
                executions and their traces.
              </p>
            </div>
          </div>

          <Link
            href="/agents"
            className={cn(
              buttonVariants({
                variant: "outline",
              }),
              "gap-2"
            )}
          >
            <Bot className="size-4" />
            Agents
          </Link>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Recent Runs
              </CardDescription>

              <CardTitle className="text-2xl">
                {runs.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Successful
              </CardDescription>

              <CardTitle className="text-2xl">
                {
                  runs.filter(
                    (run) =>
                      run.status ===
                      "SUCCESS"
                  ).length
                }
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Failed
              </CardDescription>

              <CardTitle className="text-2xl">
                {
                  runs.filter(
                    (run) =>
                      run.status ===
                      "FAILED"
                  ).length
                }
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Execution Log
            </CardTitle>

            <CardDescription>
              Latest persisted agent runs.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {runs.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <ListTree className="size-8 text-muted-foreground" />

                <div>
                  <p className="font-medium">
                    No runs yet
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Execute an agent and
                    it will appear here.
                  </p>
                </div>

                <Link
                  href="/agents"
                  className={buttonVariants()}
                >
                  Run an agent
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Run
                    </TableHead>

                    <TableHead>
                      Agent
                    </TableHead>

                    <TableHead>
                      Status
                    </TableHead>

                    <TableHead>
                      Events
                    </TableHead>

                    <TableHead>
                      Duration
                    </TableHead>

                    <TableHead>
                      Created
                    </TableHead>

                    <TableHead className="text-right">
                      Inspect
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {runs.map(
                    (run) => (
                      <TableRow
                        key={run.id}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GitBranch className="size-4 text-muted-foreground" />

                            <code className="max-w-40 truncate text-xs">
                              {run.id}
                            </code>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {run.agent.name}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {run.agent.slug}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={statusVariant(
                              run.status
                            )}
                          >
                            {run.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {run._count.events}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock3 className="size-4 text-muted-foreground" />

                            {formatDuration(run)}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(
                            run.createdAt
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link
                            href={`/runs/${run.id}`}
                            aria-label={`Inspect run ${run.id}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon",
                            })}
                          >
                            <ArrowUpRight className="size-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}