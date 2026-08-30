"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  FileText,
  Loader2,
  Mic,
  Network,
  Plus,
  Send,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MODES = ["Vigil Planner", "Fast Planner"];

import type {
  OrchestratorAttachment,
} from "@/lib/api";

export function PromptBar({
  value,
  onChange,
  onSend,
  attachments = [],
  onFilesSelected,
  onRemoveAttachment,
  isProcessingFiles = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  attachments?: OrchestratorAttachment[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveAttachment?: (index: number) => void;
  isProcessingFiles?: boolean;
  disabled?: boolean;
}) {
  const [modelOpen, setModelOpen] = useState(false);
  const [mode, setMode] = useState(MODES[0]);
  const [listening, setListening] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);

            if (files.length > 0) {
              onFilesSelected?.(files);
            }

            event.target.value = "";
          }}
        />

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

        {attachments.length > 0 || isProcessingFiles ? (
          <div className="flex flex-wrap gap-2 px-3 pb-3">
            {attachments.map((attachment, index) => (
              <div
                key={`${attachment.name}-${index}`}
                className="flex items-center gap-2 rounded-[9px] border border-[var(--line)] bg-[var(--inset)] px-2.5 py-1.5"
              >
                <FileText className="size-3.5 text-[var(--secondary-700)]" />

                <span className="max-w-[170px] truncate text-[10.5px] font-bold text-[var(--ink-2)]">
                  {attachment.name}
                </span>

                <span className="font-mono text-[8px] uppercase text-[var(--ink-3)]">
                  {attachment.kind}
                </span>

                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => onRemoveAttachment?.(index)}
                  className="text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {isProcessingFiles ? (
              <div className="flex items-center gap-2 rounded-[9px] border border-[var(--line)] bg-[var(--inset)] px-2.5 py-1.5 text-[10.5px] font-bold text-[var(--ink-3)]">
                <Loader2 className="size-3.5 animate-spin" />
                Reading file…
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 border-t border-[var(--line)] px-2.5 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || isProcessingFiles}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[9px] text-[var(--ink-3)] hover:text-[var(--ink)]"
            aria-label="Attach PDF, DOCX or CSV"
          >
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
