"use client";

import { useState } from "react";

import {
  Loader2,
  Play,
} from "lucide-react";

import type {
  RunDetails,
} from "@/lib/api";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Separator,
} from "@/components/ui/separator";

type Props = {
  running: boolean;

  status: string;

  result: RunDetails | null;

  onRun(input: {
    repository: string;
    pullRequest: number;
  }): Promise<void>;
};

export function AgentPlayground({
  running,
  status,
  result,
  onRun,
}: Props) {
  const [
    repository,
    setRepository,
  ] = useState(
    "Kaniska1/blahblah"
  );

  const [
    pullRequest,
    setPullRequest,
  ] = useState("1");

  const parsedPullRequest =
    Number(pullRequest);

  const canRun =
    !running &&
    repository.trim().length >
      0 &&
    pullRequest.trim().length >
      0 &&
    Number.isInteger(
      parsedPullRequest
    ) &&
    parsedPullRequest > 0;

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-medium">
            Agent Input
          </h2>

          <p className="text-sm text-muted-foreground">
            Configure this
            execution and start a
            new run.
          </p>
        </div>

        <Badge variant="outline">
          {status}
        </Badge>
      </div>

      <Separator />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="repository">
            Repository
          </Label>

          <Input
            id="repository"
            value={
              repository
            }
            onChange={(
              event
            ) =>
              setRepository(
                event.target
                  .value
              )
            }
            placeholder="owner/repository"
            disabled={
              running
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pull-request">
            Pull request
          </Label>

          <Input
            id="pull-request"
            type="number"
            min="1"
            value={
              pullRequest
            }
            onChange={(
              event
            ) =>
              setPullRequest(
                event.target
                  .value
              )
            }
            placeholder="1"
            disabled={
              running
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          disabled={
            !canRun
          }
          onClick={() =>
            onRun({
              repository:
                repository.trim(),

              pullRequest:
                parsedPullRequest,
            })
          }
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
            Execution is
            streaming live.
          </span>
        ) : null}
      </div>

      {running ? (
        <p className="text-sm text-muted-foreground">
          Open the Trace tab to
          watch tool calls and LLM
          execution appear in real
          time.
        </p>
      ) : null}

      {result?.result?.output
        ?.review ? (
        <>
          <Separator />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">
                Review Result
              </h2>

              {result.result
                .output.model ? (
                <Badge variant="secondary">
                  {
                    result.result
                      .output
                      .model
                  }
                </Badge>
              ) : null}
            </div>

            <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
              {
                result.result
                  .output.review
              }
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}