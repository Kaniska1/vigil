"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bot,
  ChevronDown,
  Code2,
  Network,
  Plus,
  Radar,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  {
    href: "/agents",
    label: "Agents",
    icon: Bot,
  },
  {
    href: "/orchestrator",
    label: "Orchestrator",
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
    workspaceOpen,
    setWorkspaceOpen,
  ] = useState(false);

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
        {/* ─────────────────────────────────────────────
         * WORKSPACE SWITCHER
         * ───────────────────────────────────────────── */}
        <div className="relative h-[58px] shrink-0 px-2 pt-2">
          <button
            type="button"
            aria-expanded={
              workspaceOpen
            }
            onClick={() =>
              setWorkspaceOpen(
                (open) => !open
              )
            }
            className="
              flex h-10 w-full items-center gap-2
              rounded-[11px] px-2.5
              text-left
              transition-colors
              hover:bg-[var(--hover)]
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
                Agent Runtime
              </span>
            </span>

            <ChevronDown
              className={`
                size-3.5 shrink-0
                text-[var(--ink-3)]
                transition-transform
                duration-200
                ${
                  workspaceOpen
                    ? "rotate-180"
                    : ""
                }
              `}
            />
          </button>

          {workspaceOpen ? (
            <div
              className="
                absolute left-2 top-[54px]
                z-50
                w-[216px]
                rounded-[14px]
                border border-[var(--line)]
                bg-[var(--surface-raised)]
                p-1.5
                shadow-[0_18px_55px_rgba(0,0,0,.55)]
              "
            >
              <div
                className="
                  flex h-10 items-center gap-2
                  rounded-[9px]
                  bg-[var(--hover)]
                  px-2.5
                "
              >
                <span
                  className="
                    flex size-6 items-center
                    justify-center
                    rounded-[7px]
                    bg-[var(--accent-300)]
                    text-[10px]
                    font-black
                    text-[var(--accent-950)]
                  "
                >
                  V
                </span>

                <span
                  className="
                    min-w-0 flex-1 truncate
                    text-[13px]
                    font-bold
                    text-[var(--ink)]
                  "
                >
                  Vigil workspace
                </span>

                <Badge
                  variant="secondary"
                  className="
                    h-5 px-1.5
                    text-[9px]
                  "
                >
                  LOCAL
                </Badge>
              </div>

              <div className="my-1.5 h-px bg-[var(--line)]" />

              <button
                type="button"
                className="
                  flex h-9 w-full
                  items-center gap-2
                  rounded-[9px]
                  px-2.5
                  text-[12.5px]
                  font-semibold
                  text-[var(--ink-2)]
                  transition-colors
                  hover:bg-[var(--hover)]
                  hover:text-[var(--ink)]
                "
              >
                <Plus className="size-3.5" />

                New workspace
              </button>

              <button
                type="button"
                className="
                  flex h-9 w-full
                  items-center gap-2
                  rounded-[9px]
                  px-2.5
                  text-[12.5px]
                  font-semibold
                  text-[var(--ink-2)]
                  transition-colors
                  hover:bg-[var(--hover)]
                  hover:text-[var(--ink)]
                "
              >
                <Settings className="size-3.5" />

                Workspace settings
              </button>
            </div>
          ) : null}
        </div>

        {/* ─────────────────────────────────────────────
         * PRIMARY ACTION
         * ───────────────────────────────────────────── */}
        <div className="px-2 pb-2">
          <Link
            href="/orchestrator"
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
            <button
              type="button"
              className="
                flex h-9 w-full
                items-center gap-2
                rounded-[10px]
                px-2.5
                text-left
                text-[13px]
                font-semibold
                text-[var(--ink-2)]
                transition-colors
                hover:bg-[var(--hover)]
                hover:text-[var(--ink)]
              "
            >
              <Code2
                className="
                  size-4
                  text-[var(--ink-3)]
                "
              />

              API & SDK
            </button>

            <button
              type="button"
              className="
                flex h-9 w-full
                items-center gap-2
                rounded-[10px]
                px-2.5
                text-left
                text-[13px]
                font-semibold
                text-[var(--ink-2)]
                transition-colors
                hover:bg-[var(--hover)]
                hover:text-[var(--ink)]
              "
            >
              <Settings
                className="
                  size-4
                  text-[var(--ink-3)]
                "
              />

              Settings
            </button>
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