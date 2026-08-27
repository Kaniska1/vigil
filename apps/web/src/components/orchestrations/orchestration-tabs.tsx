"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CircleDot,
  Plus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getOrchestrations,
  type OrchestrationStatus,
} from "@/lib/api";

const STORAGE_KEY =
  "vigil.open-orchestrations.v1";

type OpenOrchestrationTab = {
  id: string;
  title: string;
  href: string;
  status?: OrchestrationStatus;
  draft?: boolean;
};

type Props = {
  currentId?: string | null;
  currentTitle?: string | null;
  currentStatus?: OrchestrationStatus | null;
  draftId?: string | null;
};

function readTabs(): OpenOrchestrationTab[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function writeTabs(
  tabs: OpenOrchestrationTab[]
) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(tabs)
  );
}

function shortenTitle(
  value: string
) {
  const trimmed =
    value.trim();

  if (trimmed.length <= 34) {
    return trimmed;
  }

  return `${trimmed.slice(0, 31)}...`;
}

function statusClass(
  status?: OrchestrationStatus
) {
  switch (status) {
    case "RUNNING":
    case "EVALUATING":
    case "REPLANNING":
      return "bg-blue-400 shadow-[0_0_0_3px_rgba(96,165,250,.12)]";

    case "SUCCESS":
      return "bg-emerald-400";

    case "FAILED":
    case "CANCELLED":
      return "bg-red-400";

    case "READY":
      return "bg-violet-400";

    default:
      return "bg-zinc-500";
  }
}

export function OrchestrationTabs({
  currentId,
  currentTitle,
  currentStatus,
  draftId,
}: Props) {
  const [
    tabs,
    setTabs,
  ] = useState<OpenOrchestrationTab[]>(
    []
  );

  const currentTabId =
    currentId ??
    (draftId
      ? `draft:${draftId}`
      : null);

  const currentHref =
    currentId
      ? `/orchestrations/${currentId}`
      : draftId
        ? `/orchestrations/new?draft=${encodeURIComponent(
            draftId
          )}`
        : null;

  useEffect(() => {
    setTabs(
      readTabs()
    );
  }, []);

  useEffect(() => {
    if (
      !currentTabId ||
      !currentHref
    ) {
      return;
    }

    setTabs((current) => {
      let next =
        current.filter(
          (tab) => {
            if (
              currentId &&
              draftId &&
              tab.id ===
                `draft:${draftId}`
            ) {
              return false;
            }

            return true;
          }
        );

      const existingIndex =
        next.findIndex(
          (tab) =>
            tab.id ===
            currentTabId
        );

      const nextTab:
        OpenOrchestrationTab = {
          id: currentTabId,
          href: currentHref,
          title: shortenTitle(
            currentTitle ||
              (currentId
                ? "Orchestration"
                : "New orchestration")
          ),
          status:
            currentStatus ??
            undefined,
          draft:
            !currentId,
        };

      if (
        existingIndex >= 0
      ) {
        next = [
          ...next.slice(
            0,
            existingIndex
          ),
          {
            ...next[
              existingIndex
            ],
            ...nextTab,
          },
          ...next.slice(
            existingIndex +
              1
          ),
        ];
      } else {
        next = [
          ...next,
          nextTab,
        ].slice(-8);
      }

      writeTabs(next);
      return next;
    });
  }, [
    currentHref,
    currentId,
    currentStatus,
    currentTabId,
    currentTitle,
    draftId,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function syncStatuses() {
      try {
        const orchestrations =
          await getOrchestrations();

        if (cancelled) {
          return;
        }

        const byId =
          new Map(
            orchestrations.map(
              (item) => [
                item.id,
                item,
              ]
            )
          );

        setTabs((current) => {
          const next =
            current.map(
              (tab) => {
                if (tab.draft) {
                  return tab;
                }

                const latest =
                  byId.get(
                    tab.id
                  );

                if (!latest) {
                  return tab;
                }

                return {
                  ...tab,
                  title:
                    shortenTitle(
                      latest.goal
                    ),
                  status:
                    latest.status,
                };
              }
            );

          writeTabs(next);
          return next;
        });
      } catch {
        // Tabs are convenience UI; a failed refresh should not break a run.
      }
    }

    void syncStatuses();

    const interval =
      window.setInterval(
        () => {
          void syncStatuses();
        },
        4000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval
      );
    };
  }, []);

  const visibleTabs =
    useMemo(
      () => tabs,
      [tabs]
    );

  function closeTab(
    id: string
  ) {
    const next =
      tabs.filter(
        (tab) =>
          tab.id !== id
      );

    writeTabs(next);
    setTabs(next);

    if (
      id === currentTabId
    ) {
      const fallback =
        next.at(-1);

      window.location.href =
        fallback?.href ??
        "/orchestrations";
    }
  }

  function createNew() {
    const nextDraft =
      crypto.randomUUID();

    window.location.href =
      `/orchestrations/new?draft=${nextDraft}`;
  }

  if (
    visibleTabs.length === 0 &&
    !currentTabId
  ) {
    return null;
  }

  return (
    <div className="mb-5 flex min-w-0 items-center gap-2 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]/75 p-1.5 shadow-sm">
      <Link
        href="/orchestrations"
        className="shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold text-[var(--ink-3)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
      >
        All
      </Link>

      <div className="h-6 w-px shrink-0 bg-[var(--line)]" />

      {visibleTabs.map(
        (tab) => {
          const active =
            tab.id ===
            currentTabId;

          const running =
            tab.status ===
              "RUNNING" ||
            tab.status ===
              "EVALUATING" ||
            tab.status ===
              "REPLANNING";

          return (
            <div
              key={tab.id}
              className={`group flex shrink-0 items-center gap-1 rounded-xl border transition ${
                active
                  ? "border-violet-500/35 bg-violet-500/10 text-[var(--ink)]"
                  : "border-transparent text-[var(--ink-3)] hover:border-[var(--line)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              }`}
            >
              <Link
                href={tab.href}
                className="flex min-w-0 items-center gap-2 py-2 pl-3 pr-1"
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${statusClass(
                    tab.status
                  )} ${
                    running
                      ? "animate-pulse"
                      : ""
                  }`}
                />

                <span className="max-w-44 truncate text-xs font-bold">
                  {tab.title}
                </span>
              </Link>

              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                onClick={() =>
                  closeTab(tab.id)
                }
                className="mr-1 rounded-lg p-1 text-[var(--ink-3)] opacity-60 transition hover:bg-black/10 hover:text-[var(--ink)] group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        }
      )}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={createNew}
        className="ml-auto shrink-0"
      >
        <Plus className="size-4" />
        New
      </Button>

      <div className="hidden shrink-0 items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)] xl:flex">
        <CircleDot className="size-3.5" />
        concurrent
      </div>
    </div>
  );
}
