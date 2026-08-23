"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";

const STEPS = [
  "Interpreting developer goal",
  "Mapping requested capabilities",
  "Searching the active agent registry",
  "Building the smallest executable plan",
];

export function ThinkingState({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(1);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!active) { setVisible(STEPS.length); return; }
    setVisible(1);
    const timer = window.setInterval(() => setVisible((count) => Math.min(STEPS.length, count + 1)), 650);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <div className="w-full max-w-md">
      <button type="button" onClick={() => setExpanded((open) => !open)} className="-mx-1 flex items-center gap-2 rounded-[9px] px-1.5 py-1 text-left hover:bg-[var(--hover)]">
        <Sparkles className={`size-4 ${active ? "text-[var(--primary-700)]" : "text-[var(--accent-800)]"}`} />
        {active ? (
          <span className="bg-clip-text text-[13px] font-bold text-transparent" style={{ backgroundImage: "linear-gradient(90deg,var(--ink-3),var(--primary-800),var(--accent-800),var(--ink-3))", backgroundSize: "220% 100%", animation: "shimmer-text 1.5s linear infinite" }}>Thinking</span>
        ) : <span className="text-[13px] font-bold text-[var(--ink-2)]">Planning trace</span>}
        <ChevronDown className={`size-3.5 text-[var(--ink-3)] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <div className="grid transition-[grid-template-rows,opacity] duration-300" style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0 }}>
        <div className="overflow-hidden">
          <div className="relative ml-[6px] mt-1 space-y-1 border-l border-[var(--line)] pl-4 py-1">
            {STEPS.slice(0, visible).map((step, index) => {
              const pending = active && index === visible - 1 && visible < STEPS.length;
              return (
                <div key={step} className="flex min-h-7 items-center gap-2 text-[12.5px]" style={{ animation: "fade-up 280ms cubic-bezier(.23,1,.32,1) both" }}>
                  {pending ? <span className="size-3 rounded-full border-[1.5px] border-[var(--line-strong)] border-t-[var(--primary-700)]" style={{ animation: "spin 700ms linear infinite" }} /> : <Check className="size-3.5 text-[var(--secondary-800)]" />}
                  <span className={pending ? "font-semibold text-[var(--ink)]" : "font-medium text-[var(--ink-2)]"}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
