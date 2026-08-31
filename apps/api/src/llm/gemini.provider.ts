import "dotenv/config";

import {
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "./llm.types.js";

const MODEL =
  "gemini-3.6-flash";

const RETRYABLE_STATUS_CODES =
  new Set([
    429,
    503,
  ]);

/*
 * Planning should fail fast because Vigil has a
 * deterministic fallback.
 *
 * Agent execution can tolerate slightly more latency,
 * but should never keep a run alive for several
 * minutes.
 */
const LOW_LATENCY_ATTEMPT_TIMEOUT_MS =
  8_000;

const STANDARD_ATTEMPT_TIMEOUT_MS =
  25_000;

const LOW_LATENCY_TOTAL_TIMEOUT_MS =
  15_000;

const STANDARD_TOTAL_TIMEOUT_MS =
  45_000;

const LOW_LATENCY_MAX_RETRIES =
  1;

const STANDARD_MAX_RETRIES =
  1;

type GeminiGenerationOptions = {
  lowLatency?: boolean;
};

function sleep(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeoutPromise =
    new Promise<never>(
      (_, reject) => {
        timer =
          setTimeout(
            () => {
              reject(
                new Error(
                  message
                )
              );
            },
            timeoutMs
          );
      }
    );

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    if (timer) {
      clearTimeout(
        timer
      );
    }
  }
}

export function getGeminiErrorStatus(
  error: unknown
): number | undefined {
  if (
    typeof error !==
      "object" ||
    error === null
  ) {
    return undefined;
  }

  if (
    "status" in error &&
    typeof error.status ===
      "number"
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
    typeof error ===
    "string"
  ) {
    return error;
  }

  try {
    return JSON.stringify(
      error
    );
  } catch {
    return "";
  }
}

/*
 * A 429 can mean two different things:
 *
 * 1. Temporary throttling
 *    -> retrying may help.
 *
 * 2. Hard project/model quota exhaustion
 *    -> retrying immediately is pointless.
 */
export function isGeminiQuotaExhausted(
  error: unknown
): boolean {
  const message =
    getErrorMessage(
      error
    ).toLowerCase();

  return (
    message.includes(
      "quota exceeded"
    ) ||
    message.includes(
      "exceeded your current quota"
    ) ||
    message.includes(
      "current quota"
    ) ||
    message.includes(
      "resource_exhausted"
    ) ||
    message.includes(
      "free_tier_requests"
    ) ||
    message.includes(
      "generaterequestsperdayperprojectpermodel"
    ) ||
    message.includes(
      "generativelanguage.googleapis.com/generate_content_free_tier_requests"
    )
  );
}

/*
 * Availability failures may safely trigger
 * deterministic planning fallback or bounded job
 * retries.
 */
export function isGeminiAvailabilityError(
  error: unknown
): boolean {
  const status =
    getGeminiErrorStatus(
      error
    );

  if (
    status === 429 ||
    status === 503
  ) {
    return true;
  }

  const message =
    getErrorMessage(
      error
    ).toLowerCase();

  return (
    message.includes(
      "timeout"
    ) ||
    message.includes(
      "timed out"
    ) ||
    message.includes(
      "fetch failed"
    ) ||
    message.includes(
      "network"
    ) ||
    message.includes(
      "econnreset"
    ) ||
    message.includes(
      "econnrefused"
    ) ||
    message.includes(
      "socket"
    )
  );
}

export class GeminiProvider
  implements LLMProvider
{
  name =
    "gemini";

  private client:
    GoogleGenAI;

  constructor() {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured"
      );
    }

    this.client =
      new GoogleGenAI({
        apiKey,
      });
  }

  async generate(
    request: LLMRequest,
    options:
      GeminiGenerationOptions = {}
  ): Promise<LLMResponse> {
    const lowLatency =
      options.lowLatency ===
      true;

    /*
     * maxRetries means retries AFTER the first
     * attempt.
     *
     * Both modes currently allow one retry only.
     */
    const maxRetries =
      lowLatency
        ? LOW_LATENCY_MAX_RETRIES
        : STANDARD_MAX_RETRIES;

    const attemptTimeoutMs =
      lowLatency
        ? LOW_LATENCY_ATTEMPT_TIMEOUT_MS
        : STANDARD_ATTEMPT_TIMEOUT_MS;

    const totalTimeoutMs =
      lowLatency
        ? LOW_LATENCY_TOTAL_TIMEOUT_MS
        : STANDARD_TOTAL_TIMEOUT_MS;

    const overallStartedAt =
      Date.now();

    let retryCount =
      0;

    while (true) {
      const elapsed =
        Date.now() -
        overallStartedAt;

      const remainingTotalTime =
        totalTimeoutMs -
        elapsed;

      if (
        remainingTotalTime <=
        0
      ) {
        throw new Error(
          lowLatency
            ? "GEMINI_LOW_LATENCY_TOTAL_TIMEOUT"
            : "GEMINI_TOTAL_TIMEOUT"
        );
      }

      /*
       * Never allow an individual attempt to exceed
       * the remaining total request budget.
       */
      const effectiveAttemptTimeout =
        Math.min(
          attemptTimeoutMs,
          remainingTotalTime
        );

      const attemptNumber =
        retryCount +
        1;

      const startedAt =
        Date.now();

      try {
        const response =
          await withTimeout(
            this.client.models.generateContent({
              model:
                MODEL,

              contents:
                request.prompt,

              config: {
                systemInstruction:
                  request.systemPrompt,

                ...(lowLatency
                  ? {
                      thinkingConfig: {
                        thinkingLevel:
                          ThinkingLevel.MINIMAL,
                      },

                      maxOutputTokens:
                        800,
                    }
                  : {}),
              },
            }),

            effectiveAttemptTimeout,

            lowLatency
              ? "GEMINI_LOW_LATENCY_ATTEMPT_TIMEOUT"
              : "GEMINI_ATTEMPT_TIMEOUT"
          );

        const usage =
          response.usageMetadata;

        console.log(
          `[Gemini] Request completed in ${
            Date.now() -
            overallStartedAt
          }ms after ${attemptNumber} attempt(s)${
            lowLatency
              ? " [low-latency]"
              : ""
          }`
        );

        return {
          text:
            response.text ??
            "",

          model:
            MODEL,

          usage:
            usage
              ? {
                  inputTokens:
                    usage.promptTokenCount,

                  outputTokens:
                    usage.candidatesTokenCount,

                  thinkingTokens:
                    usage.thoughtsTokenCount,

                  totalTokens:
                    usage.totalTokenCount,
                }
              : undefined,
        };
      } catch (error) {
        const status =
          getGeminiErrorStatus(
            error
          );

        const quotaExhausted =
          isGeminiQuotaExhausted(
            error
          );

        const availabilityError =
          isGeminiAvailabilityError(
            error
          );

        /*
         * Status-based failures such as 429/503 are
         * retryable.
         *
         * Local timeout/network failures are also
         * considered retryable availability failures.
         */
        const retryable =
          (
            (
              status !==
              undefined &&
              RETRYABLE_STATUS_CODES.has(
                status
              )
            ) ||
            availabilityError
          ) &&
          !quotaExhausted;

        console.warn(
          `[Gemini] Request attempt ${attemptNumber} failed after ${
            Date.now() -
            startedAt
          }ms`,
          {
            status,
            retryable,
            quotaExhausted,
            lowLatency,
            totalElapsedMs:
              Date.now() -
              overallStartedAt,
            error:
              getErrorMessage(
                error
              ),
          }
        );

        /*
         * Hard quota exhaustion cannot be fixed by an
         * immediate retry.
         */
        if (
          quotaExhausted
        ) {
          console.warn(
            "[Gemini] Hard quota exhausted; skipping retries"
          );

          throw error;
        }

        if (
          !retryable ||
          retryCount >=
          maxRetries
        ) {
          throw error;
        }

        const elapsedAfterFailure =
          Date.now() -
          overallStartedAt;

        const remainingAfterFailure =
          totalTimeoutMs -
          elapsedAfterFailure;

        if (
          remainingAfterFailure <=
          0
        ) {
          throw new Error(
            lowLatency
              ? "GEMINI_LOW_LATENCY_TOTAL_TIMEOUT"
              : "GEMINI_TOTAL_TIMEOUT"
          );
        }

        /*
         * Exponential backoff with small jitter.
         */
        const baseDelay =
          1000 *
          Math.pow(
            2,
            retryCount
          );

        const jitter =
          Math.floor(
            Math.random() *
            250
          );

        const requestedDelay =
          baseDelay +
          jitter;

        /*
         * Never sleep beyond the remaining total
         * request budget.
         */
        const delay =
          Math.min(
            requestedDelay,
            remainingAfterFailure
          );

        retryCount++;

        console.warn(
          `[Gemini] Retrying in ${delay}ms`
        );

        await sleep(
          delay
        );
      }
    }
  }
}