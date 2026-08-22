import prisma from "../lib/prisma.js";

import type {
  ExecutionContext,
} from "./execution-context.types.js";

import {
  publishRunEvent,
} from "./run-event-bus.js";

import {
  GeminiProvider,
} from "../llm/gemini.provider.js";

import {
  estimateLLMCost,
} from "../metrics/pricing.js";

import {
  GetPullRequestTool,
} from "../tools/github/get-pull-request.tool.js";

import {
  GetPullRequestFilesTool,
} from "../tools/github/get-pull-request-files.tool.js";

import type {
  GetPullRequestInput,
  GetPullRequestFilesInput,
} from "../tools/github/github.types.js";

const llmProvider =
  new GeminiProvider();

const getPullRequestTool =
  new GetPullRequestTool();

const getPullRequestFilesTool =
  new GetPullRequestFilesTool();

export function createExecutionContext(
  runId: string
): ExecutionContext {
  const trace: ExecutionContext["trace"] =
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
                : JSON.parse(
                    JSON.stringify(
                      metadata
                    )
                  ),
          },
        });

      /*
       * PostgreSQL stores the permanent trace.
       *
       * Redis Pub/Sub broadcasts the same
       * event to the API process so it can
       * stream it to the browser through SSE.
       */
      await publishRunEvent(event);
    };

  async function getPullRequest(
    input: GetPullRequestInput
  ) {
    const startedAt =
      performance.now();

    await trace(
      "TOOL_CALLED",
      `${getPullRequestTool.name} called`,
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
        Math.round(
          performance.now() -
            startedAt
        );

      await trace(
        "TOOL_COMPLETED",
        `${getPullRequestTool.name} completed`,
        {
          tool:
            getPullRequestTool.name,

          latencyMs,

          output:
            result.data,
        }
      );

      return result.data;
    } catch (error) {
      const latencyMs =
        Math.round(
          performance.now() -
            startedAt
        );

      await trace(
        "ERROR",
        `${getPullRequestTool.name} failed`,
        {
          tool:
            getPullRequestTool.name,

          latencyMs,

          error:
            error instanceof Error
              ? error.message
              : "Unknown tool error",
        }
      );

      throw error;
    }
  }

  async function getPullRequestFiles(
    input: GetPullRequestFilesInput
  ) {
    const startedAt =
      performance.now();

    await trace(
      "TOOL_CALLED",
      `${getPullRequestFilesTool.name} called`,
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
        Math.round(
          performance.now() -
            startedAt
        );

      await trace(
        "TOOL_COMPLETED",
        `${getPullRequestFilesTool.name} completed`,
        {
          tool:
            getPullRequestFilesTool.name,

          latencyMs,

          output:
            result.data,
        }
      );

      return result.data;
    } catch (error) {
      const latencyMs =
        Math.round(
          performance.now() -
            startedAt
        );

      await trace(
        "ERROR",
        `${getPullRequestFilesTool.name} failed`,
        {
          tool:
            getPullRequestFilesTool.name,

          latencyMs,

          error:
            error instanceof Error
              ? error.message
              : "Unknown tool error",
        }
      );

      throw error;
    }
  }

  const generate:
    ExecutionContext["llm"]["generate"] =
    async (request) => {
      const startedAt =
        performance.now();

      await trace(
        "LLM_STARTED",
        "LLM generation started",
        {
          provider:
            llmProvider.name,
        }
      );

      try {
        const response =
          await llmProvider.generate(
            request
          );

        const latencyMs =
          Math.round(
            performance.now() -
              startedAt
          );

        const estimatedCostUsd =
          estimateLLMCost(
            response.model,
            response.usage
          );

        await trace(
          "LLM_COMPLETED",
          "LLM generation completed",
          {
            provider:
              llmProvider.name,

            model:
              response.model,

            latencyMs,

            usage:
              response.usage,

            estimatedCostUsd,
          }
        );

        return response;
      } catch (error) {
        const latencyMs =
          Math.round(
            performance.now() -
              startedAt
          );

        await trace(
          "ERROR",
          "LLM generation failed",
          {
            provider:
              llmProvider.name,

            latencyMs,

            error:
              error instanceof Error
                ? error.message
                : "Unknown LLM error",
          }
        );

        throw error;
      }
    };

  return {
    runId,

    trace,

    llm: {
      generate,
    },

    tools: {
      github: {
        getPullRequest,
        getPullRequestFiles,
      },
    },
  };
}