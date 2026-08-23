"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Check, ChevronDown, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { OrchestrationDetails, OrchestrationStepStatus, OrchestratorPlan } from "@/lib/api";

function StateIcon({ status, index }: { status: OrchestrationStepStatus; index: number }) {
  if (status === "RUNNING") {
    return <span className="relative flex size-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--inset)]"><Loader2 className="size-3.5 animate-spin text-[var(--primary-700)]" /></span>;
  }
  if (status === "SUCCESS") {
    return <span className="flex size-6 items-center justify-center rounded-full bg-[var(--purple-tint)] text-[var(--accent-800)] ring-1 ring-inset ring-[var(--accent-500)]/35"><Check className="size-3.5 stroke-[3]" /></span>;
  }
  if (status === "FAILED") {
    return <span className="flex size-6 items-center justify-center rounded-full bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/25"><X className="size-3.5 stroke-[3]" /></span>;
  }
  return <span className="relative flex size-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--inset)] text-[10px] font-extrabold text-[var(--ink-2)]">{index + 1}</span>;
}

export function TaskRows({ plan, orchestration }: { plan: OrchestratorPlan; orchestration: OrchestrationDetails | null }) {
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  return (
    <div className="flex w-full flex-col gap-2">
      {plan.executionSteps.map((step, index) => {
        const persistedStep = orchestration?.steps?.find((item) => item.agent?.id === step.agent.id);
        const status = (persistedStep?.status ?? "PENDING") as OrchestrationStepStatus;
        const key = `${step.agent.id}-${index}`;
        const open = openRows[key] ?? status === "RUNNING";

        return (
          <div
            key={key}
            className="overflow-hidden border border-[var(--line)] bg-[var(--surface)] shadow-[0_8px_28px_rgba(0,0,0,.18)] transition-colors hover:bg-[var(--surface-raised)]"
            style={{ borderRadius: open ? 16 : 22, animation: `fade-up 420ms cubic-bezier(.23,1,.32,1) ${index * 75}ms both` }}
          >
            <button type="button" aria-expanded={open} onClick={() => setOpenRows((rows) => ({ ...rows, [key]: !open }))} className="flex h-12 w-full items-center gap-2.5 px-3 text-left">
              <StateIcon status={status} index={index} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-extrabold text-[var(--ink)]">{step.agent.name}</span>
                <span className="block truncate font-mono text-[9.5px] text-[var(--ink-3)]">{step.agent.slug}@{step.agent.version}</span>
              </span>
              <Badge variant={status === "FAILED" ? "destructive" : status === "RUNNING" ? "secondary" : status === "SUCCESS" ? "default" : "outline"} className="h-5 text-[9px]">{status}</Badge>
              <ChevronDown className={`size-3.5 shrink-0 text-[var(--ink-3)] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </button>

            <div className="grid transition-[grid-template-rows,opacity] duration-300" style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}>
              <div className="overflow-hidden">
                <div className="grid grid-cols-[24px_1fr] gap-2.5 px-3 pb-3">
                  <span aria-hidden className="mx-auto h-full w-px bg-[var(--line)]" />
                  <div className="space-y-2 pt-0.5">
                    <div className="flex flex-wrap gap-1.5">
                      {step.satisfies.map((capability) => <Badge key={capability} variant="secondary" className="h-5 font-mono text-[9px]">{capability}</Badge>)}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--ink-3)]">
                      <span>{persistedStep?.dependsOnPositions?.length ? `Depends on ${persistedStep.dependsOnPositions.join(", ")}` : "Root execution step"}</span>
                      {persistedStep?.run?.id ? <Link href={`/runs/${persistedStep.run.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>Inspect run</Link> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
