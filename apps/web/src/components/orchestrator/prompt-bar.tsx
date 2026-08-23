"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Mic, Network, Plus, Send, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MODES = ["Vigil Planner", "Fast Planner"];

export function PromptBar({
  value,
  onChange,
  onSend,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) {
  const [modelOpen, setModelOpen] = useState(false);
  const [mode, setMode] = useState(MODES[0]);
  const [listening, setListening] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!listening) return;
    const timeout = window.setTimeout(() => setListening(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [listening]);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="relative w-full" data-promptbar>
      {modelOpen ? (
        <div className="absolute bottom-[calc(100%+8px)] left-10 z-20 w-44 rounded-[12px] border border-[var(--line)] bg-[var(--surface-raised)] p-1 shadow-[0_18px_60px_rgba(0,0,0,.5)]">
          {MODES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => { setMode(item); setModelOpen(false); areaRef.current?.focus(); }}
              className={`flex h-8 w-full items-center rounded-[8px] px-2.5 text-left text-[12px] font-bold transition-colors ${item === mode ? "bg-[var(--hover-2)] text-[var(--ink)]" : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"}`}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[20px] border border-[var(--line-strong)] bg-[var(--surface)] shadow-[0_18px_55px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.035)] transition-colors focus-within:border-[var(--secondary-600)]">
        <Textarea
          ref={areaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder="Describe what you want Vigil to accomplish…"
          className="min-h-[108px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[14px] leading-6 shadow-none focus-visible:ring-0"
        />

        <div className="flex items-center gap-1.5 border-t border-[var(--line)] px-2.5 py-2">
          <Button type="button" variant="ghost" size="icon-xs" className="rounded-[9px] text-[var(--ink-3)] hover:text-[var(--ink)]">
            <Plus className="size-4" />
          </Button>

          <button
            type="button"
            onClick={() => setModelOpen((open) => !open)}
            className="flex h-7 items-center gap-1.5 rounded-[9px] px-2 text-[11.5px] font-bold text-[var(--ink-2)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink)]"
          >
            <WandSparkles className="size-3.5 text-[var(--accent-800)]" />
            {mode}
            <ChevronDown className="size-3 text-[var(--ink-3)]" />
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-pressed={listening}
              onClick={() => setListening((active) => !active)}
              className={`rounded-[9px] ${listening ? "bg-[var(--purple-tint)] text-[var(--accent-800)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
            >
              {listening ? <span className="flex h-3 items-end gap-[2px]">{[7, 11, 8].map((height, i) => <span key={i} className="w-[2px] rounded-full bg-current" style={{ height, animation: `pulse ${700 + i * 100}ms ease-in-out infinite alternate` }} />)}</span> : <Mic className="size-3.5" />}
            </Button>

            <Button
              type="button"
              size="icon-xs"
              disabled={!canSend}
              onClick={onSend}
              className="rounded-[9px]"
              aria-label="Generate execution plan"
            >
              {disabled ? <Network className="size-3.5 animate-pulse" /> : <Send className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
