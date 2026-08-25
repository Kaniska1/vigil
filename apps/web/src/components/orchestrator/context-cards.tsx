"use client";

import {
  Braces,
  FileUp,
  Plus,
  Trash2,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import type {
  MissingOrchestrationInput,
} from "@/lib/api";

export type ContextEntry = {
  id: string;
  key: string;
  value: string;
};

type ContextCardsProps = {
  entries:
    ContextEntry[];

  missingInputs?:
    MissingOrchestrationInput[];

  onChange: (
    entries:
      ContextEntry[]
  ) => void;

  onReplan?: () => void;

  isReplanning?: boolean;

  disabled?: boolean;
};

function createContextEntry(): ContextEntry {
  return {
    id:
      crypto.randomUUID(),

    key:
      "",

    value:
      "",
  };
}

function getEntryForKey(
  entries:
    ContextEntry[],
  key:
    string
): ContextEntry | undefined {
  return entries.find(
    (
      entry
    ) =>
      entry.key.trim() ===
      key
  );
}

function getInputPlaceholder(
  input:
    MissingOrchestrationInput
): string {
  switch (
    input.type
  ) {
    case "number":
      return "Enter a number";

    case "boolean":
      return "true or false";

    case "json":
      return '{"key":"value"}';

    case "file":
      return "Upload required";

    case "string":
    default:
      return "Enter value";
  }
}

function getFileRequirementLabel(
  input:
    MissingOrchestrationInput
): string {
  const accepted =
    input.acceptedFileTypes?.length
      ? input.acceptedFileTypes
          .map(
            (
              type
            ) =>
              `.${type}`
          )
          .join(
            ", "
          )
      : "Supported file";

  if (
    typeof input.maxFileSizeBytes !==
      "number"
  ) {
    return accepted;
  }

  const megabytes =
    input.maxFileSizeBytes /
    1_000_000;

  return `${accepted} · max ${megabytes.toFixed(
    megabytes >= 10
      ? 0
      : 1
  )} MB`;
}

export function ContextCards({
  entries,
  missingInputs = [],
  onChange,
  onReplan,
  isReplanning = false,
  disabled = false,
}: ContextCardsProps) {
  function updateEntry(
    id:
      string,
    field:
      "key" |
      "value",
    value:
      string
  ) {
    onChange(
      entries.map(
        (
          entry
        ) =>
          entry.id ===
          id
            ? {
                ...entry,
                [field]:
                  value,
              }
            : entry
      )
    );
  }

  function updateRequiredInput(
    key:
      string,
    value:
      string
  ) {
    const existing =
      getEntryForKey(
        entries,
        key
      );

    if (
      existing
    ) {
      updateEntry(
        existing.id,
        "value",
        value
      );

      return;
    }

    onChange([
      ...entries,
      {
        id:
          crypto.randomUUID(),

        key,

        value,
      },
    ]);
  }

  function addEntry() {
    onChange([
      ...entries,
      createContextEntry(),
    ]);
  }

  function removeEntry(
    id:
      string
  ) {
    onChange(
      entries.filter(
        (
          entry
        ) =>
          entry.id !==
          id
      )
    );
  }

  const hasMissingInputs =
    missingInputs.length >
    0;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_14px_40px_rgba(0,0,0,.22)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-[10px] border border-[var(--line)] bg-[var(--inset)] text-[var(--accent-800)]">
              <Braces className="size-4" />
            </div>

            <div>
              <p className="text-[12.5px] font-extrabold text-[var(--ink)]">
                Runtime context
              </p>

              <p className="mt-0.5 text-[10.5px] font-medium text-[var(--ink-3)]">
                Optional information available to selected agents.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-bold"
            onClick={
              addEntry
            }
            disabled={
              disabled
            }
          >
            <Plus className="size-3.5" />
            Add context
          </Button>
        </div>

        <div className="p-3">
          {entries.length ===
          0 ? (
            <button
              type="button"
              onClick={
                addEntry
              }
              disabled={
                disabled
              }
              className="flex w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--line-strong)] bg-[var(--inset)]/40 px-4 py-7 text-center transition hover:bg-[var(--inset)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Braces className="mb-2 size-4 text-[var(--accent-800)]" />

              <span className="text-[11.5px] font-bold text-[var(--ink)]">
                No runtime context
              </span>

              <span className="mt-1 max-w-[260px] text-[10.5px] font-medium leading-4 text-[var(--ink-3)]">
                Add context now, or let Vigil tell you what a selected agent needs.
              </span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_32px] gap-2 px-1">
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.09em] text-[var(--ink-3)]">
                  Key
                </span>

                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.09em] text-[var(--ink-3)]">
                  Value
                </span>
              </div>

              {entries.map(
                (
                  entry,
                  index
                ) => (
                  <div
                    key={
                      entry.id
                    }
                    className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_32px] items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--inset)]/35 p-2"
                    style={{
                      animation:
                        `fade-up 280ms cubic-bezier(.23,1,.32,1) ${
                          index *
                          40
                        }ms both`,
                    }}
                  >
                    <Input
                      value={
                        entry.key
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateEntry(
                            entry.id,
                            "key",
                            event
                              .target
                              .value
                          )
                      }
                      placeholder="repository"
                      disabled={
                        disabled
                      }
                      className="h-8 rounded-[9px] bg-[var(--surface)] font-mono text-[10.5px]"
                    />

                    <Input
                      value={
                        entry.value
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateEntry(
                            entry.id,
                            "value",
                            event
                              .target
                              .value
                          )
                      }
                      placeholder="value"
                      disabled={
                        disabled
                      }
                      className="h-8 rounded-[9px] bg-[var(--surface)] text-[10.5px]"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-[9px] text-[var(--ink-3)] hover:text-red-300"
                      onClick={
                        () =>
                          removeEntry(
                            entry.id
                          )
                      }
                      disabled={
                        disabled
                      }
                      aria-label="Remove context"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {hasMissingInputs ? (
        <div className="overflow-hidden rounded-[20px] border border-[var(--primary-500)]/25 bg-[var(--surface)] shadow-[0_14px_40px_rgba(0,0,0,.22)]">
          <div className="border-b border-[var(--line)] px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12.5px] font-extrabold text-[var(--ink)]">
                  Vigil needs more context
                </p>

                <p className="mt-1 text-[10.5px] font-medium leading-4 text-[var(--ink-3)]">
                  These requirements came from the agents selected for this plan.
                </p>
              </div>

              <span className="rounded-[7px] border border-[var(--primary-500)]/20 bg-[var(--blue-tint)] px-2 py-1 font-mono text-[9px] font-bold text-[var(--primary-800)]">
                {missingInputs.length} REQUIRED
              </span>
            </div>
          </div>

          <div className="space-y-3 p-3">
            {missingInputs.map(
              (
                input
              ) => {
                const existing =
                  getEntryForKey(
                    entries,
                    input.key
                  );

                const requiredBy =
                  input.requiredBy
                    .map(
                      (
                        agent
                      ) =>
                        agent.agentName
                    )
                    .join(
                      ", "
                    );

                return (
                  <div
                    key={
                      input.key
                    }
                    className="rounded-[13px] border border-[var(--line)] bg-[var(--inset)]/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-[10.5px] font-bold text-[var(--primary-800)]">
                          {
                            input.key
                          }
                        </p>

                        <p className="mt-1 text-[10.5px] font-medium leading-4 text-[var(--ink-3)]">
                          {
                            input.description
                          }
                        </p>
                      </div>

                      <span className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-1.5 py-1 font-mono text-[8.5px] font-bold uppercase text-[var(--ink-3)]">
                        {
                          input.type
                        }
                      </span>
                    </div>

                    <p className="mt-2 text-[9.5px] font-semibold text-[var(--ink-3)]">
                      Required by{" "}
                      <span className="text-[var(--ink-2)]">
                        {
                          requiredBy
                        }
                      </span>
                    </p>

                    {input.type ===
                    "file" ? (
                      <div className="mt-3 rounded-[10px] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-3">
                        <div className="flex items-center gap-2">
                          <FileUp className="size-4 text-[var(--accent-800)]" />

                          <div>
                            <p className="text-[10.5px] font-bold text-[var(--ink)]">
                              File input
                            </p>

                            <p className="mt-0.5 text-[9.5px] font-medium text-[var(--ink-3)]">
                              {getFileRequirementLabel(
                                input
                              )}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 h-8 w-full rounded-[9px] text-[10px]"
                          disabled
                        >
                          <FileUp className="size-3.5" />
                          Upload support coming next
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type={
                          input.type ===
                          "number"
                            ? "number"
                            : "text"
                        }
                        value={
                          existing
                            ?.value ??
                          ""
                        }
                        onChange={
                          (
                            event
                          ) =>
                            updateRequiredInput(
                              input.key,
                              event
                                .target
                                .value
                            )
                        }
                        placeholder={
                          getInputPlaceholder(
                            input
                          )
                        }
                        disabled={
                          disabled
                        }
                        className="mt-3 h-9 rounded-[10px] bg-[var(--surface)] text-[11px]"
                      />
                    )}
                  </div>
                );
              }
            )}

            {onReplan ? (
              <Button
                type="button"
                className="w-full rounded-[12px]"
                onClick={
                  onReplan
                }
                disabled={
                  disabled ||
                  isReplanning ||
                  missingInputs.some(
                    (
                      input
                    ) => {
                      if (
                        input.type ===
                        "file"
                      ) {
                        return true;
                      }

                      return !getEntryForKey(
                        entries,
                        input.key
                      )?.value.trim();
                    }
                  )
                }
              >
                {isReplanning
                  ? "Re-planning..."
                  : "Re-plan with context"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
