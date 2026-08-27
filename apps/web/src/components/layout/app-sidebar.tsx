"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bot,
  Code2,
  Network,
  Plus,
  Radar,
  Search,
  Settings,
  Sparkles,
  Store,
  UploadCloud,
  ChartNoAxesCombined,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  {
    href: "/agents",
    label: "Agents",
    icon: Bot,
  },
  {
    href: "/orchestrations",
    label: "Orchestrations",
    icon: Network,
  },
  {
    href: "/runs",
    label: "Runs",
    icon: Activity,
  },
];

export function AppSidebar() {
  const pathname = usePathname();


  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  return (
    <aside
      className="
        fixed inset-y-0 left-0 z-40
        hidden w-[232px] flex-col
        border-r border-[var(--line)]
        bg-[var(--surface-sidebar)]/96
        backdrop-blur-2xl
        lg:flex
      "
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Current workspace identity.
         *
         * Vigil does not yet have a real Workspace entity,
         * membership model, or workspace-scoped persistence.
         * We therefore keep this as identity/branding rather
         * than exposing fake "New workspace" or duplicate
         * "Workspace settings" actions.
         */}
        <div className="h-[58px] shrink-0 px-2 pt-2">
          <div
            className="
              flex h-10 w-full items-center gap-2
              rounded-[11px] px-2.5
            "
          >
            <span
              className="
                flex size-7 shrink-0
                items-center justify-center
                rounded-[9px]
                bg-gradient-to-br
                from-[var(--primary-500)]
                via-[var(--secondary-500)]
                to-[var(--accent-500)]
                text-white
                shadow-[0_8px_24px_rgba(72,0,255,.25)]
              "
            >
              <Radar className="size-3.5" />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className="
                  block truncate
                  text-[13.5px]
                  font-extrabold
                  tracking-[-0.02em]
                  text-[var(--ink)]
                "
              >
                Vigil
              </span>

              <span
                className="
                  block truncate
                  text-[10px]
                  font-semibold
                  text-[var(--ink-3)]
                "
              >
                Developer workspace
              </span>
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────
         * PRIMARY ACTION
         * ───────────────────────────────────────────── */}
        <div className="px-2 pb-2">
          <Link
            href="/orchestrations/new"
            className="
              group
              flex h-9 items-center gap-2
              rounded-[10px]
              px-2.5
              text-[13px]
              font-bold
              text-[var(--ink-2)]
              transition-all
              hover:bg-[var(--hover)]
              hover:text-[var(--ink)]
              active:scale-[0.985]
            "
          >
            <span
              className="
                flex size-5
                shrink-0
                items-center
                justify-center
              "
            >
              <Plus className="size-4" />
            </span>

            <span>
              New orchestration
            </span>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────
         * MAIN NAVIGATION
         * ───────────────────────────────────────────── */}
        <nav className="px-2">
          <p
            className="
              mb-1.5 px-2.5
              text-[10px]
              font-extrabold
              uppercase
              tracking-[0.15em]
              text-[var(--ink-3)]
            "
          >
            Workspace
          </p>

          <div className="space-y-1">
            {NAV_ITEMS.map(
              (item) => {
                const active =
                  pathname ===
                    item.href ||
                  pathname.startsWith(
                    `${item.href}/`
                  );

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className={`
                      relative
                      flex h-9
                      items-center gap-2
                      rounded-[10px]
                      px-2.5
                      text-[13.5px]
                      font-bold
                      transition-all
                      active:scale-[0.985]

                      ${
                        active
                          ? `
                            bg-[var(--hover-2)]
                            text-[var(--ink)]
                          `
                          : `
                            text-[var(--ink-2)]
                            hover:bg-[var(--hover)]
                            hover:text-[var(--ink)]
                          `
                      }
                    `}
                  >
                    {active ? (
                      <span
                        className="
                          absolute
                          left-0 top-2
                          h-5 w-0.5
                          rounded-full
                          bg-gradient-to-b
                          from-[var(--primary-600)]
                          to-[var(--accent-600)]
                        "
                      />
                    ) : null}

                    <span
                      className={`
                        flex size-5
                        shrink-0
                        items-center
                        justify-center

                        ${
                          active
                            ? "text-[var(--primary-800)]"
                            : "text-[var(--ink-3)]"
                        }
                      `}
                    >
                      <item.icon className="size-[17px]" />
                    </span>

                    <span className="truncate">
                      {
                        item.label
                      }
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        </nav>

        {/* ─────────────────────────────────────────────
         * DEVELOPER SECTION
         * ───────────────────────────────────────────── */}
        <div className="mt-4 min-h-0 flex-1 px-2">
          <div
            className="
              mb-1 flex h-8
              items-center
              justify-between
              px-2.5
            "
          >
            <span
              className="
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.15em]
                text-[var(--ink-3)]
              "
            >
              Developer
            </span>

            <button
              type="button"
              aria-label="Search Vigil"
              aria-expanded={
                searchOpen
              }
              onClick={() =>
                setSearchOpen(
                  (open) => !open
                )
              }
              className="
                flex size-7
                items-center
                justify-center
                rounded-[8px]
                text-[var(--ink-3)]
                transition-colors
                hover:bg-[var(--hover)]
                hover:text-[var(--ink)]
              "
            >
              <Search className="size-3.5" />
            </button>
          </div>

          {searchOpen ? (
            <input
              autoFocus
              placeholder="Search Vigil"
              className="
                mb-2 h-8 w-full
                rounded-[9px]
                border border-[var(--line)]
                bg-[var(--field)]
                px-2.5
                text-[12px]
                font-semibold
                text-[var(--ink)]
                outline-none
                placeholder:text-[var(--ink-3)]
                focus:border-[var(--secondary-600)]
              "
            />
          ) : null}

          <div className="space-y-1">
            <Link
              href="/agents/mine"
              className={`
                flex h-9 w-full
                items-center gap-2
                rounded-[10px]
                px-2.5
                text-left
                text-[13px]
                font-semibold
                transition-colors
                ${
                  pathname === "/agents/mine" ||
                  pathname.startsWith("/agents/mine/")
                    ? "bg-[var(--hover-2)] text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                }
              `}
            >
              <Store className="size-4 text-[var(--ink-3)]" />
              My Agents
            </Link>

            <Link
              href="/agents/publish"
              className={`
                flex h-9 w-full
                items-center gap-2
                rounded-[10px]
                px-2.5
                text-left
                text-[13px]
                font-semibold
                transition-colors
                ${
                  pathname === "/agents/publish" ||
                  pathname.startsWith("/agents/publish/")
                    ? "bg-[var(--hover-2)] text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                }
              `}
            >
              <UploadCloud className="size-4 text-[var(--ink-3)]" />
              Publish Agent
            </Link>

            <Link
  href="/developer/api-sdk"
  className={`
    flex h-9 w-full
    items-center gap-2
    rounded-[10px]
    px-2.5
    text-left
    text-[13px]
    font-semibold
    transition-colors
    ${
      pathname === "/developer/api-sdk" ||
      pathname.startsWith("/developer/api-sdk/")
        ? "bg-[var(--hover-2)] text-[var(--ink)]"
        : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
    }
  `}
>
  <Code2 className="size-4 text-[var(--ink-3)]" />
  API & SDK
</Link>
<Link
  href="/developer/metrics"
  className={`
    flex h-9 w-full
    items-center gap-2
    rounded-[10px]
    px-2.5
    text-left
    text-[13px]
    font-semibold
    transition-colors
    ${
      pathname ===
        "/developer/metrics" ||
      pathname.startsWith(
        "/developer/metrics/"
      )
        ? "bg-[var(--hover-2)] text-[var(--ink)]"
        : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
    }
  `}
>
  <ChartNoAxesCombined className="size-4 text-[var(--ink-3)]" />
  Metrics
</Link>
            <Link
              href="/settings"
              className={`
                relative
                flex h-9 w-full
                items-center gap-2
                rounded-[10px]
                px-2.5
                text-left
                text-[13px]
                font-semibold
                transition-colors
                ${
                  pathname === "/settings" ||
                  pathname.startsWith("/settings/")
                    ? "bg-[var(--hover-2)] text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                }
              `}
            >
              <Settings
                className="
                  size-4
                  text-[var(--ink-3)]
                "
              />

              Settings
            </Link>
          </div>
        </div>

        {/* ─────────────────────────────────────────────
         * FOOTER
         * ───────────────────────────────────────────── */}
        <div className="m-2 mt-auto border-t border-[var(--line)] pt-2">
          <div
            className="
              rounded-[13px]
              border border-[var(--line)]
              bg-gradient-to-br
              from-[var(--secondary-100)]/55
              to-[var(--accent-100)]/60
              p-3
            "
          >
            <div
              className="
                flex items-center gap-2
                text-[12px]
                font-extrabold
                text-[var(--ink)]
              "
            >
              <Sparkles
                className="
                  size-3.5
                  text-[var(--accent-800)]
                "
              />

              Observable by default
            </div>

            <p
              className="
                mt-1.5
                text-[11px]
                font-medium
                leading-4
                text-[var(--ink-3)]
              "
            >
              Runs, tools and
              orchestration decisions
              stay inspectable.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}