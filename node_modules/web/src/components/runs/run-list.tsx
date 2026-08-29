"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bot,
  GitBranch,
} from "lucide-react";

import type { RunStatus, RunSummary } from "@/lib/api";

import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  runs: RunSummary[];
};

type Filter = "ALL" | RunStatus;

const PAGE_SIZE = 7;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(run: RunSummary) {
  if (!run.startedAt || !run.completedAt) {
    return "—";
  }

  const duration =
    new Date(run.completedAt).getTime() -
    new Date(run.startedAt).getTime();

  return duration < 1000
    ? `${duration} ms`
    : `${(duration / 1000).toFixed(2)} s`;
}

const FILTER_META: Record<
  Exclude<Filter, "ALL">,
  {
    label: string;
    dot: string;
    badge: string;
  }
> = {
  PENDING: {
    label: "Pending",
    dot: "#8b94a7",
    badge:
      "border-white/[0.08] bg-white/[0.04] text-white/55",
  },

  RUNNING: {
    label: "Running",
    dot: "#FFFF00",
    badge:
      "border-[#FFFF00]/20 bg-[#FFFF00]/10 text-[#FFFF00]",
  },

  SUCCESS: {
    label: "Completed",
    dot: "#32CD32",
    badge:
      "border-[#32CD32]/20 bg-[#32CD32]/10 text-[#32CD32]",
  },

  FAILED: {
    label: "Failed",
    dot: "#f94449",
    badge:
      "border-[#f94449]/20 bg-[#f94449]/20 text-[#f94449]",
  },
};

export function RunList({ runs }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => [
      {
        key: "ALL" as const,
        label: "All",
        count: runs.length,
      },

      ...(
        [
          "PENDING",
          "RUNNING",
          "SUCCESS",
          "FAILED",
        ] as RunStatus[]
      ).map((status) => ({
        key: status,
        label: FILTER_META[status].label,
        count: runs.filter((run) => run.status === status).length,
        dot: FILTER_META[status].dot,
      })),
    ],
    [runs],
  );

  const filteredRuns = useMemo(() => {
    if (filter === "ALL") {
      return runs;
    }

    return runs.filter((run) => run.status === filter);
  }, [filter, runs]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRuns.length / PAGE_SIZE),
  );

  const visibleRuns = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredRuns.slice(start, start + PAGE_SIZE);
  }, [filteredRuns, page]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginationPages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1,
      );
    }

    const pages = new Set<number>();

    pages.add(1);
    pages.add(totalPages);
    pages.add(page);

    if (page > 1) {
      pages.add(page - 1);
    }

    if (page < totalPages) {
      pages.add(page + 1);
    }

    return [...pages].sort((a, b) => a - b);
  }, [page, totalPages]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-5 border-b border-[var(--line)] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            <Activity className="size-4 text-[#1677ff]" />

            Observability

            <Badge
              className="
                rounded-md
                border-white/[0.07]
                bg-white/[0.04]
                px-2
                py-0.5
                text-[10px]
                font-semibold
                text-white/50
              "
            >
              {runs.length} runs
            </Badge>
          </div>

          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
            Execution history.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-2)]">
            Inspect persisted agent runs, trace depth, runtime status,
            and execution latency from one place.
          </p>
        </div>

        <Link
          href="/agents"
          className={cn(
            buttonVariants({
            }),
            "gap-2",
          )}
        >
          Open agents
        </Link>
      </div>

      {/* Filters */}
      <div
        className="mb-4 flex items-center gap-1 overflow-x-auto py-1"
        style={{
          scrollbarWidth: "none",
        }}
      >
        {filters.map((item) => {
          const active = filter === item.key;

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.key)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3",
                "text-[11px] font-semibold transition-all duration-150",

                active
                  ? "bg-[#1677ff] text-white shadow-[0_2px_8px_rgba(22,119,255,0.2)]"
                  : "text-[var(--ink-3)] hover:bg-white/[0.05] hover:text-white/80",
              )}
            >
              {"dot" in item && item.dot ? (
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    background: active
                      ? "currentColor"
                      : item.dot,
                  }}
                />
              ) : null}

              {item.label}

              <span
                className={cn(
                  "ml-0.5 rounded px-1 text-[9px] tabular-nums",

                  active
                    ? "bg-white/15 text-white"
                    : "text-[var(--ink-3)]",
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div
        className="
          overflow-hidden
          rounded-xl
          border
          border-white/[0.07]
          bg-[#0d0f14]
          shadow-[0_18px_50px_rgba(0,0,0,0.25)]
        "
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/[0.025]">
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="min-w-[200px] text-[10px] font-bold uppercase tracking-[0.09em] text-white/35">
                  Run
                </TableHead>

                <TableHead className="min-w-[180px] text-[10px] font-bold uppercase tracking-[0.09em] text-white/35">
                  Agent
                </TableHead>

                <TableHead className="min-w-[120px] text-[10px] font-bold uppercase tracking-[0.09em] text-white/35">
                  Status
                </TableHead>

                <TableHead className="text-[10px] font-bold uppercase tracking-[0.09em] text-white/35">
                  Events
                </TableHead>

                <TableHead className="text-[10px] font-bold uppercase tracking-[0.09em] text-white/35">
                  Duration
                </TableHead>

                <TableHead className="min-w-[150px] text-[10px] font-bold uppercase tracking-[0.09em] text-white/35">
                  Created
                </TableHead>

                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleRuns.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={7}
                    className="h-52"
                  >
                    <div className="flex flex-col items-center justify-center text-center">
                      <div
                        className="
                          mb-3
                          flex
                          size-10
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-[#1677ff]/15
                          bg-[#1677ff]/8
                        "
                      >
                        <GitBranch className="size-4 text-[#579aff]" />
                      </div>

                      <p className="text-[13px] font-bold text-white">
                        No matching runs
                      </p>

                      <p className="mt-1 text-[11px] text-white/35">
                        Try another status filter or execute an agent.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleRuns.map((run) => {
                  const meta = FILTER_META[run.status];

                  return (
                    <TableRow
                      key={run.id}
                      className="
                        border-white/[0.055]
                        transition-colors
                        hover:bg-white/[0.025]
                      "
                    >
                      {/* Run */}
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className="
                              flex
                              size-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-[#1677ff]/12
                              bg-[#1677ff]/7
                            "
                          >
                            <GitBranch className="size-3.5 text-[#579aff]" />
                          </div>

                          <code className="max-w-[170px] truncate font-mono text-[10.5px] text-white/55">
                            {run.id}
                          </code>
                        </div>
                      </TableCell>

                      {/* Agent */}
                      <TableCell>
                        <div className="min-w-0">
                          <span className="block truncate text-[12px] font-bold text-white/90">
                            {run.agent.name}
                          </span>

                          <span className="mt-0.5 block truncate font-mono text-[9.5px] text-white/30">
                            {run.agent.slug}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                            meta.badge,
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",

                              run.status === "RUNNING" &&
                                "animate-pulse",
                            )}
                            style={{
                              background: meta.dot,
                            }}
                          />

                          {meta.label}
                        </Badge>
                      </TableCell>

                      {/* Events */}
                      <TableCell className="font-mono text-[11px] text-white/55">
                        {run._count.events}
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="font-mono text-[10.5px] text-white/55">
                        {formatDuration(run)}
                      </TableCell>

                      {/* Created */}
                      <TableCell className="text-[11px] font-medium text-white/35">
                        {formatDate(run.createdAt)}
                      </TableCell>

                      {/* Open */}
                      <TableCell className="text-right">
                        <Link
                          href={`/runs/${run.id}`}
                          aria-label={`Open run ${run.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-xs",
                          })}
                        >
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>

            {filteredRuns.length > 0 ? (
              <TableFooter className="border-white/[0.06] bg-white/[0.018]">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="text-[10px] font-medium text-white/30"
                  >
                    Showing{" "}
                    <span className="font-semibold text-white/50">
                      {(page - 1) * PAGE_SIZE + 1}
                    </span>
                    {" – "}
                    <span className="font-semibold text-white/50">
                      {Math.min(
                        page * PAGE_SIZE,
                        filteredRuns.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-white/50">
                      {filteredRuns.length}
                    </span>{" "}
                    runs
                  </TableCell>

                  <TableCell
                    colSpan={2}
                    className="text-right text-[10px] text-white/25"
                  >
                    Page {page} of {totalPages}
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <Pagination className="mt-5">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                onClick={(event) => {
                  event.preventDefault();

                  if (page > 1) {
                    setPage((current) => current - 1);
                  }
                }}
                className={cn(
                  page === 1 &&
                    "pointer-events-none opacity-35",
                )}
              />
            </PaginationItem>

            {paginationPages.map((pageNumber, index) => {
              const previous =
                paginationPages[index - 1];

              const needsEllipsis =
                previous !== undefined &&
                pageNumber - previous > 1;

              return (
                <div
                  key={pageNumber}
                  className="contents"
                >
                  {needsEllipsis ? (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : null}

                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      isActive={page === pageNumber}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(pageNumber);
                      }}
                      className={cn(
                        page === pageNumber &&
                          "border-[#1677ff]/20 bg-[#1677ff] text-white hover:bg-[#2b85ff]",
                      )}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                </div>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === totalPages}
                onClick={(event) => {
                  event.preventDefault();

                  if (page < totalPages) {
                    setPage((current) => current + 1);
                  }
                }}
                className={cn(
                  page === totalPages &&
                    "pointer-events-none opacity-35",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}