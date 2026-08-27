"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  Cpu,
  Database,
} from "lucide-react";

import type {
  RunDetails,
} from "@/lib/api";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Separator,
} from "@/components/ui/separator";

type Props = {
  result: RunDetails;
};

function asRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getPrimaryText(
  output: Record<string, unknown>
): string | null {
  for (
    const key of [
      "review",
      "text",
      "summary",
      "message",
    ]
  ) {
    const value = output[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return null;
}

export function AgentResultPanel({
  result,
}: Props) {
  const output =
    asRecord(
      result.result?.output
    ) ?? {};

  const primaryText =
    getPrimaryText(output);

  const model =
    typeof output.model === "string"
      ? output.model
      : null;

  const usage =
    asRecord(
      output.usage
    );

  const extraOutput =
    Object.entries(output).filter(
      ([key]) =>
        ![
          "review",
          "text",
          "summary",
          "message",
          "model",
          "usage",
        ].includes(key)
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>

          <div>
            <h3 className="font-semibold text-foreground">
              Execution completed
            </h3>

            <p className="text-xs text-muted-foreground">
              Agent result
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {model ? (
            <Badge
              variant="outline"
              className="gap-1.5"
            >
              <Cpu className="size-3" />
              {model}
            </Badge>
          ) : null}

          <Badge variant="secondary">
            SUCCESS
          </Badge>
        </div>
      </div>

      {primaryText ? (
        <div className="px-5 py-6">
          <div className="prose prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-8 prose-h2:border-b prose-h2:border-border/60 prose-h2:pb-2 prose-h2:text-xl prose-h3:text-base prose-p:leading-7 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-border/70 prose-pre:bg-muted/40 prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-hr:border-border/60 prose-th:text-left prose-td:text-muted-foreground">
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
              ]}
            >
              {primaryText}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}

      {extraOutput.length > 0 ? (
        <>
          <Separator />

          <div className="space-y-3 px-5 py-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="size-4 text-muted-foreground" />
              Structured output
            </div>

            <div className="grid gap-3">
              {extraOutput.map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-border/60 bg-muted/20 p-4"
                  >
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {key}
                    </p>

                    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm text-foreground">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(
                            value,
                            null,
                            2
                          )}
                    </pre>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      ) : null}

      {usage ? (
        <>
          <Separator />

          <details className="group px-5 py-4">
            <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Usage metadata
            </summary>

            <pre className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
              {JSON.stringify(
                usage,
                null,
                2
              )}
            </pre>
          </details>
        </>
      ) : null}
    </section>
  );
}
