"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileUp,
  Loader2,
  Play,
} from "lucide-react";

import type {
  Agent,
  AgentInputField,
  RunDetails,
} from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { AgentResultPanel } from "./agent-result-panel";

type Props = {
  agent: Agent;
  running: boolean;
  status: string;
  result: RunDetails | null;
  onRun(
    input: Record<string, unknown>
  ): Promise<void>;
};

type DraftValues =
  Record<string, string | boolean>;

function buildInitialValues(
  agent: Agent
): DraftValues {
  return Object.fromEntries(
    Object.entries(
      agent.inputSchema ?? {}
    ).map(([key, field]) => [
      key,
      field.type === "boolean"
        ? false
        : "",
    ])
  );
}

function hasValue(
  field: AgentInputField,
  value:
    | string
    | boolean
    | undefined
) {
  if (field.type === "boolean") {
    return typeof value === "boolean";
  }

  if (field.type === "file") {
    return false;
  }

  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function parseValue(
  key: string,
  field: AgentInputField,
  value:
    | string
    | boolean
    | undefined
): unknown {
  if (field.type === "boolean") {
    return Boolean(value);
  }

  const text =
    typeof value === "string"
      ? value.trim()
      : "";

  if (field.type === "number") {
    const parsed = Number(text);

    if (!Number.isFinite(parsed)) {
      throw new Error(
        `${key} must be a valid number`
      );
    }

    return parsed;
  }

  if (field.type === "json") {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `${key} must contain valid JSON`
      );
    }
  }

  return text;
}

export function AgentPlayground({
  agent,
  running,
  status,
  result,
  onRun,
}: Props) {
  const schema = useMemo(
    () => agent.inputSchema ?? {},
    [agent.inputSchema]
  );

  const [values, setValues] =
    useState<DraftValues>(() =>
      buildInitialValues(agent)
    );

  const [
    validationError,
    setValidationError,
  ] = useState<string | null>(null);

  useEffect(() => {
    setValues(
      buildInitialValues(agent)
    );
    setValidationError(null);
  }, [agent]);

  const fields =
    Object.entries(schema);

  const requiredFileBlocked =
    fields.some(
      ([, field]) =>
        field.required &&
        field.type === "file"
    );

  const complete =
    fields.every(
      ([key, field]) =>
        !field.required ||
        hasValue(
          field,
          values[key]
        )
    );

  const canRun =
    !running &&
    complete &&
    !requiredFileBlocked;

  function setField(
    key: string,
    value: string | boolean
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
    setValidationError(null);
  }

  async function submit() {
    try {
      const input:
        Record<string, unknown> = {};

      for (
        const [key, field]
        of fields
      ) {
        const value = values[key];

        if (
          !field.required &&
          !hasValue(field, value)
        ) {
          continue;
        }

        if (field.type === "file") {
          throw new Error(
            `${key} requires file upload support`
          );
        }

        input[key] =
          parseValue(
            key,
            field,
            value
          );
      }

      await onRun(input);
    } catch (error) {
      setValidationError(
        error instanceof Error
          ? error.message
          : "Invalid agent input"
      );
    }
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-medium">
            Agent Input
          </h2>
          <p className="text-sm text-muted-foreground">
            Inputs are generated from this
            agent&apos;s declared schema.
          </p>
        </div>

        <Badge variant="outline">
          {status}
        </Badge>
      </div>

      <Separator />

      {fields.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map(
            ([key, field]) => {
              const value =
                values[key];

              const label =
                key
                  .replace(
                    /([A-Z])/g,
                    " $1"
                  )
                  .replace(
                    /^./,
                    (char) =>
                      char.toUpperCase()
                  );

              if (
                field.type ===
                "boolean"
              ) {
                return (
                  <div
                    key={key}
                    className="space-y-2"
                  >
                    <Label>
                      {label}
                      {field.required
                        ? " *"
                        : ""}
                    </Label>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          value === true
                            ? "default"
                            : "outline"
                        }
                        disabled={running}
                        onClick={() =>
                          setField(
                            key,
                            true
                          )
                        }
                      >
                        True
                      </Button>

                      <Button
                        type="button"
                        variant={
                          value === false
                            ? "default"
                            : "outline"
                        }
                        disabled={running}
                        onClick={() =>
                          setField(
                            key,
                            false
                          )
                        }
                      >
                        False
                      </Button>
                    </div>

                    <p className="text-xs leading-5 text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                );
              }

              if (
                field.type ===
                "json"
              ) {
                return (
                  <div
                    key={key}
                    className="space-y-2 md:col-span-2"
                  >
                    <Label
                      htmlFor={`agent-input-${key}`}
                    >
                      {label}
                      {field.required
                        ? " *"
                        : ""}
                    </Label>

                    <Textarea
                      id={`agent-input-${key}`}
                      value={
                        typeof value === "string"
                          ? value
                          : ""
                      }
                      onChange={(event) =>
                        setField(
                          key,
                          event.target.value
                        )
                      }
                      placeholder='{"key":"value"}'
                      disabled={running}
                      className="min-h-32 font-mono"
                    />

                    <p className="text-xs leading-5 text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                );
              }

              if (
                field.type ===
                "file"
              ) {
                return (
                  <div
                    key={key}
                    className="space-y-2"
                  >
                    <Label>
                      {label}
                      {field.required
                        ? " *"
                        : ""}
                    </Label>

                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      className="w-full justify-start"
                    >
                      <FileUp />
                      Upload support coming next
                    </Button>

                    <p className="text-xs leading-5 text-muted-foreground">
                      {field.description}
                      {field.acceptedFileTypes?.length
                        ? ` Accepted: ${field.acceptedFileTypes.join(", ")}.`
                        : ""}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="space-y-2"
                >
                  <Label
                    htmlFor={`agent-input-${key}`}
                  >
                    {label}
                    {field.required
                      ? " *"
                      : ""}
                  </Label>

                  <Input
                    id={`agent-input-${key}`}
                    type={
                      field.type === "number"
                        ? "number"
                        : "text"
                    }
                    value={
                      typeof value === "string"
                        ? value
                        : ""
                    }
                    onChange={(event) =>
                      setField(
                        key,
                        event.target.value
                      )
                    }
                    placeholder={
                      field.description
                    }
                    disabled={running}
                  />

                  <p className="text-xs leading-5 text-muted-foreground">
                    {field.description}
                  </p>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#333333] bg-[#111111] px-5 py-8 text-center">
          <p className="text-sm font-semibold text-white">
            This agent does not require any
            input.
          </p>
        </div>
      )}

      {validationError ? (
        <p className="text-sm font-medium text-destructive">
          {validationError}
        </p>
      ) : null}

      {requiredFileBlocked ? (
        <p className="text-sm text-muted-foreground">
          This agent requires a file input.
          File-reference uploads are not
          enabled yet.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          disabled={!canRun}
          onClick={submit}
        >
          {running ? (
            <>
              <Loader2 className="animate-spin" />
              Executing
            </>
          ) : (
            <>
              <Play />
              Run agent
            </>
          )}
        </Button>

        {running ? (
          <span className="text-sm text-muted-foreground">
            Execution is streaming live.
          </span>
        ) : null}
      </div>

      {result?.result?.output ? (
        <>
          <Separator />
          <AgentResultPanel
            result={result}
          />
        </>
      ) : null}
    </div>
  );
}
