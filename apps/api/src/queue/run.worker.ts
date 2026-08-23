import {
  UnrecoverableError,
  Worker,
} from "bullmq";

import {
  executeAgentRun,
  failAgentRun,
} from "../services/run.service.js";

import {
  isGeminiQuotaExhausted,
} from "../llm/gemini.provider.js";

import {
  redisConnection,
} from "./redis.js";

import type {
  AgentRunJobData,
} from "./run.queue.js";

function getErrorStatus(
  error: unknown
): number | undefined {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return undefined;
  }

  if (
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  try {
    return JSON.stringify(
      error
    );
  } catch {
    return "Unknown execution error";
  }
}

/*
 * Errors in this category should not consume
 * BullMQ retries.
 *
 * Examples:
 *
 * - exhausted provider quota
 * - invalid/missing agent implementation
 * - bad authentication/permissions
 * - malformed request/input
 * - resource that definitely does not exist
 *
 * Temporary provider throttling, 5xx responses
 * and network failures remain retryable.
 */
function isUnrecoverableExecutionError(
  error: unknown
): boolean {
  if (
    isGeminiQuotaExhausted(
      error
    )
  ) {
    return true;
  }

  const status =
    getErrorStatus(
      error
    );

  if (
    status !== undefined &&
    [
      400,
      401,
      403,
      404,
      422,
    ].includes(
      status
    )
  ) {
    return true;
  }

  const message =
    getErrorMessage(
      error
    );

  const permanentErrors = [
    "AGENT_NOT_FOUND",
    "AGENT_IMPLEMENTATION_NOT_FOUND",
    "ORCHESTRATION_INVALID_DEPENDENCY",
    "ORCHESTRATION_STEP_AGENT_MISSING",
  ];

  return permanentErrors.some(
    (value) =>
      message.includes(
        value
      )
  );
}

export const runWorker =
  new Worker<AgentRunJobData>(
    "agent-runs",

    async (job) => {
      const {
        runId,
        slug,
        input,
      } = job.data;

      /*
       * BullMQ's attemptsMade represents attempts
       * already completed before this execution.
       *
       * Therefore:
       *
       * current attempt = attemptsMade + 1
       */
      const currentAttempt =
        job.attemptsMade + 1;

      const maxAttempts =
        job.opts.attempts ??
        1;

      try {
        await executeAgentRun(
          runId,
          slug,
          input
        );
      } catch (error) {
        const unrecoverable =
          isUnrecoverableExecutionError(
            error
          );

        const finalAttempt =
          currentAttempt >=
          maxAttempts;

        const message =
          getErrorMessage(
            error
          );

        /*
         * Permanent failure:
         *
         * persist FAILED immediately and tell BullMQ
         * not to retry this job.
         */
        if (unrecoverable) {
          console.error(
            `[Run Worker] Run ${runId} failed with unrecoverable error on attempt ${currentAttempt}/${maxAttempts}:`,
            message
          );

          await failAgentRun(
            runId,
            error,
            {
              slug,

              attempt:
                currentAttempt,

              maxAttempts,

              retryable:
                false,

              reason:
                isGeminiQuotaExhausted(
                  error
                )
                  ? "PROVIDER_QUOTA_EXHAUSTED"
                  : "UNRECOVERABLE_EXECUTION_ERROR",
            }
          );

          /*
           * BullMQ recognises UnrecoverableError and
           * skips all remaining retry attempts.
           */
          throw new UnrecoverableError(
            message
          );
        }

        /*
         * Temporary failure with retries remaining.
         *
         * Keep the logical Run alive. BullMQ will
         * retry the same Run/job.
         */
        if (!finalAttempt) {
          console.warn(
            `[Run Worker] Run ${runId} failed on attempt ${currentAttempt}/${maxAttempts}; retrying`,
            {
              slug,
              error:
                message,
            }
          );

          throw error;
        }

        /*
         * Retryable error, but all attempts have now
         * been exhausted.
         *
         * This is the point at which the logical Run,
         * orchestration step and parent orchestration
         * become FAILED.
         */
        console.error(
          `[Run Worker] Run ${runId} exhausted all ${maxAttempts} attempt(s):`,
          message
        );

        await failAgentRun(
          runId,
          error,
          {
            slug,

            attempt:
              currentAttempt,

            maxAttempts,

            retryable:
              true,

            retriesExhausted:
              true,
          }
        );

        throw error;
      }
    },

    {
      connection:
        redisConnection,

      concurrency:
        2,
    }
  );

runWorker.on(
  "completed",
  (job) => {
    console.log(
      `Run job ${job.id} completed`
    );
  }
);

runWorker.on(
  "failed",
  (
    job,
    error
  ) => {
    console.error(
      `Run job ${job?.id} failed:`,
      error
    );
  }
);

runWorker.on(
  "error",
  (error) => {
    console.error(
      "[Run Worker] Worker error:",
      error
    );
  }
);