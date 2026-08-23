"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, Bot, GitBranch } from "lucide-react";
import type { RunStatus, RunSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { runs: RunSummary[] };
type Filter = "ALL" | RunStatus;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDuration(run: RunSummary) {
  if (!run.startedAt || !run.completedAt) return "—";
  const duration = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
  return duration < 1000 ? `${duration} ms` : `${(duration / 1000).toFixed(2)} s`;
}

const FILTER_META: Record<Exclude<Filter, "ALL">, { label: string; dot: string; pill: string }> = {
  PENDING: { label: "Pending", dot: "var(--text-500)", pill: "border-[var(--line)] bg-[var(--inset)] text-[var(--ink-2)]" },
  RUNNING: { label: "Running", dot: "var(--primary-600)", pill: "border-[var(--primary-500)]/25 bg-[var(--blue-tint)] text-[var(--primary-800)]" },
  SUCCESS: { label: "Completed", dot: "var(--accent-700)", pill: "border-[var(--accent-600)]/25 bg-[var(--purple-tint)] text-[var(--accent-900)]" },
  FAILED: { label: "Failed", dot: "#f87171", pill: "border-red-500/25 bg-red-500/8 text-red-300" },
};

export function RunList({ runs }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const filters = useMemo(() => ([
    { key: "ALL" as const, label: "All", count: runs.length },
    ...(["PENDING", "RUNNING", "SUCCESS", "FAILED"] as RunStatus[]).map((status) => ({ key: status, label: FILTER_META[status].label, count: runs.filter((run) => run.status === status).length, dot: FILTER_META[status].dot })),
  ]), [runs]);

  const visibleRuns = filter === "ALL" ? runs : runs.filter((run) => run.status === filter);

  return (
    <div>
      <div className="mb-7 flex flex-col gap-5 border-b border-[var(--line)] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            <Activity className="size-4 text-[var(--accent-800)]" /> Observability <Badge variant="secondary">{runs.length} runs</Badge>
          </div>
          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">Execution history.</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-2)]">Inspect persisted agent runs, trace depth, runtime status, and execution latency from one place.</p>
        </div>
        <Link href="/agents" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}><Bot className="size-4" /> Open agents</Link>
      </div>

      <div className="mb-2 flex items-center gap-1 overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.key)}
              className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-bold transition-all ${active ? "bg-[var(--surface-raised)] text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--line),0_5px_16px_rgba(0,0,0,.18)]" : "text-[var(--ink-3)] hover:bg-[var(--hover)] hover:text-[var(--ink-2)]"}`}
            >
              {"dot" in item && item.dot ? <span className="size-1.5 rounded-full" style={{ background: item.dot }} /> : null}
              {item.label}
              <span className={`rounded-[5px] px-1 text-[10px] tabular-nums ${active ? "bg-[var(--inset)] text-[var(--ink-2)]" : "text-[var(--ink-3)]"}`}>{item.count}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(0,0,0,.28)]" role="region" tabIndex={0} style={{ scrollbarWidth: "none" }}>
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[1.2fr_1.25fr_.8fr_.55fr_.7fr_1fr_40px] border-b border-[var(--line)] px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">
            <span>Run</span><span>Agent</span><span>Status</span><span>Events</span><span>Duration</span><span>Created</span><span />
          </div>

          {visibleRuns.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <GitBranch className="mb-3 size-5 text-[var(--accent-800)]" />
              <p className="text-[13px] font-extrabold text-[var(--ink)]">No matching runs</p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-3)]">Try another status filter or execute an agent.</p>
            </div>
          ) : visibleRuns.map((run) => {
            const meta = FILTER_META[run.status];
            return (
              <div key={run.id} className="grid grid-cols-[1.2fr_1.25fr_.8fr_.55fr_.7fr_1fr_40px] items-center border-b border-[var(--line)] px-3 py-2.5 text-[12px] transition-colors last:border-0 hover:bg-[var(--hover)]">
                <span className="flex min-w-0 items-center gap-2.5"><span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--inset)] text-[var(--primary-700)]"><GitBranch className="size-3.5" /></span><code className="truncate font-mono text-[10.5px] text-[var(--ink-2)]">{run.id}</code></span>
                <span className="min-w-0"><span className="block truncate font-extrabold text-[var(--ink)]">{run.agent.name}</span><span className="block truncate font-mono text-[9.5px] text-[var(--ink-3)]">{run.agent.slug}</span></span>
                <span><span className={`inline-flex h-5.5 items-center gap-1.5 rounded-[6px] border px-1.5 text-[10.5px] font-bold ${meta.pill}`}><span className={`size-1.5 rounded-full ${run.status === "RUNNING" ? "animate-pulse" : ""}`} style={{ background: meta.dot }} />{meta.label}</span></span>
                <span className="font-mono text-[11px] text-[var(--ink-2)]">{run._count.events}</span>
                <span className="font-mono text-[10.5px] text-[var(--ink-2)]">{formatDuration(run)}</span>
                <span className="text-[11px] font-semibold text-[var(--ink-3)]">{formatDate(run.createdAt)}</span>
                <Link href={`/runs/${run.id}`} className={buttonVariants({ variant: "ghost", size: "icon-xs" })}><ArrowUpRight className="size-3.5" /></Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
