"use client";

import { GitPullRequest, Link2, TextCursorInput } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ContextCards({
  repository,
  pullRequest,
  onRepositoryChange,
  onPullRequestChange,
}: {
  repository: string;
  pullRequest: string;
  onRepositoryChange: (value: string) => void;
  onPullRequestChange: (value: string) => void;
}) {
  const cards = [
    {
      title: "Repository context",
      meta: "owner / repository",
      description: "The GitHub repository passed to every selected reviewer agent.",
      icon: Link2,
      content: <Input value={repository} onChange={(event) => onRepositoryChange(event.target.value)} placeholder="owner/repository" className="h-9 rounded-[10px]" />,
      chip: repository || "Not set",
      tone: "from-[var(--primary-300)] to-[var(--primary-600)]",
    },
    {
      title: "Pull request",
      meta: "positive integer",
      description: "The pull request number Vigil will resolve, inspect and route through the execution graph.",
      icon: GitPullRequest,
      content: <Input type="number" min="1" value={pullRequest} onChange={(event) => onPullRequestChange(event.target.value)} placeholder="1" className="h-9 rounded-[10px]" />,
      chip: pullRequest ? `PR #${pullRequest}` : "Not set",
      tone: "from-[var(--secondary-500)] to-[var(--accent-600)]",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-[12.5px] font-extrabold text-[var(--ink)]">Runtime context</span>
        <span className="inline-flex h-5 items-center rounded-md bg-[var(--inset)] px-1.5 text-[10.5px] font-bold text-[var(--ink-3)] ring-1 ring-inset ring-[var(--line)]">2 inputs</span>
      </div>

      {cards.map((card, index) => (
        <div key={card.title} className="overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(0,0,0,.22)]" style={{ animation: `fade-up 380ms cubic-bezier(.23,1,.32,1) ${index * 80}ms both` }}>
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-3 py-2.5">
            <span className={`flex size-7 items-center justify-center rounded-[9px] bg-gradient-to-br ${card.tone} text-white`}><card.icon className="size-3.5" /></span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[var(--ink)]">{card.title}</span>
            <span className="shrink-0 font-mono text-[10px] text-[var(--ink-3)]">{card.meta}</span>
          </div>
          <p className="px-3 pt-2.5 text-[11.5px] leading-5 text-[var(--ink-2)]">{card.description}</p>
          <div className="px-3 py-2.5">{card.content}</div>
          <div className="px-3 pb-3">
            <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full bg-[var(--inset)] px-2 text-[10.5px] font-semibold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)]">
              <TextCursorInput className="size-3 text-[var(--accent-800)]" />
              <span className="truncate">{card.chip}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
