import prisma from "../lib/prisma.js";

import {
  llm,
} from "../llm/index.js";

import {
  estimateLLMCost,
} from "../metrics/pricing.js";

import {
  GetPullRequestTool,
} from "../tools/github/get-pull-request.tool.js";

import {
  GetPullRequestFilesTool,
} from "../tools/github/get-pull-request-files.tool.js";

import {
  publishRunEvent,
} from "./run-event-bus.js";

import type {
  ExecutionContext,
} from "./execution-context.types.js";
import { Prisma } from "@vigil/db";

const getPullRequestTool =
  new GetPullRequestTool();

const getPullRequestFilesTool =
  new GetPullRequestFilesTool();

export function createExecutionContext(
  runId: string
): ExecutionContext {
  const trace:
    ExecutionContext["trace"] =
    async (
      type,
      message,
      metadata
    ) => {
      const event =
        await prisma.traceEvent.create({
          data: {
            runId,
            type,
            message,
            metadata:
              metadata === undefined
                ? undefined
                : (metadata as Prisma.InputJsonValue),
          },
        });

      publishRunEvent(
        runId,
        event
      );
    };

  return {
    runId,

    trace,

    llm: {
      async generate(request) {
        const startedAt =
          Date.now();

        await trace(
          "LLM_STARTED",
          `LLM request started using ${llm.name}`,
          {
            provider:
              llm.name,
          }
        );

        try {
          const response =
            await llm.generate(
              request
            );

          const latencyMs =
            Date.now() -
            startedAt;

          const estimatedCostUsd =
            estimateLLMCost(
              response.model,
              response.usage
            );

          await trace(
            "LLM_COMPLETED",
            `LLM request completed using ${response.model}`,
            {
              provider:
                llm.name,

              model:
                response.model,

              latencyMs,

              usage:
                response.usage ??
                null,

              estimatedCostUsd,
            }
          );

          return response;
        } catch (error) {
          const latencyMs =
            Date.now() -
            startedAt;

          await trace(
            "ERROR",
            "LLM execution failed",
            {
              provider:
                llm.name,

              latencyMs,

              error:
                error instanceof
                Error
                  ? error.message
                  : "Unknown LLM error",
            }
          );

          throw error;
        }
      },
    },

    tools: {
      github: {
        async getPullRequest(
          input
        ) {
          const startedAt =
            Date.now();

          await trace(
            "TOOL_CALLED",
            "GitHub pull request lookup started",
            {
              tool:
                getPullRequestTool.name,

              input,
            }
          );

          try {
            const result =
              await getPullRequestTool.execute(
                input
              );

            const latencyMs =
              Date.now() -
              startedAt;

            await trace(
              "TOOL_COMPLETED",
              "GitHub pull request lookup completed",
              {
                tool:
                  getPullRequestTool.name,

                latencyMs,
              }
            );

            return result.data;
          } catch (error) {
            const latencyMs =
              Date.now() -
              startedAt;

            await trace(
              "ERROR",
              "GitHub tool execution failed",
              {
                tool:
                  getPullRequestTool.name,

                latencyMs,

                error:
                  error instanceof
                  Error
                    ? error.message
                    : "Unknown tool error",
              }
            );

            throw error;
          }
        },

        async getPullRequestFiles(
          input
        ) {
          const startedAt =
            Date.now();

          await trace(
            "TOOL_CALLED",
            "GitHub changed-files lookup started",
            {
              tool:
                getPullRequestFilesTool.name,

              input,
            }
          );

          try {
            const result =
              await getPullRequestFilesTool.execute(
                input
              );

            const latencyMs =
              Date.now() -
              startedAt;

            await trace(
              "TOOL_COMPLETED",
              "GitHub changed-files lookup completed",
              {
                tool:
                  getPullRequestFilesTool.name,

                latencyMs,

                fileCount:
                  result.data.length,
              }
            );

            return result.data;
          } catch (error) {
            const latencyMs =
              Date.now() -
              startedAt;

            await trace(
              "ERROR",
              "GitHub changed-files tool failed",
              {
                tool:
                  getPullRequestFilesTool.name,

                latencyMs,

                error:
                  error instanceof
                  Error
                    ? error.message
                    : "Unknown GitHub error",
              }
            );

            throw error;
          }
        },
      },
    },
  };
}