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
 * A 429 can mean two very different things:
 *
 * 1. Temporary rate limiting
 *    -> retrying can help.
 *
 * 2. A hard project/model quota has been exhausted
 *    -> retrying immediately is useless.
 *
 * Gemini includes quota metadata in the error
 * message, so we detect the second case explicitly.
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
 * Used by the orchestrator to decide whether
 * deterministic planning is an acceptable
 * resilience fallback.
 *
 * This intentionally covers provider/infrastructure
 * failures only.
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
    /*
     * `maxRetries` means additional attempts
     * after the first request.
     *
     * Planning is latency-sensitive, so it gets
     * only one retry.
     */
    const maxRetries =
      options.lowLatency
        ? 1
        : 3;

    let retryCount =
      0;

    while (true) {
      const startedAt =
        Date.now();

      try {
        const response =
          await this.client.models.generateContent({
            model:
              MODEL,

            contents:
              request.prompt,

            config: {
              systemInstruction:
                request.systemPrompt,

              ...(options.lowLatency
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
          });

        const usage =
          response.usageMetadata;

        console.log(
          `[Gemini] Request completed in ${
            Date.now() -
            startedAt
          }ms${
            options.lowLatency
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

        const retryable =
          status !==
            undefined &&
          RETRYABLE_STATUS_CODES.has(
            status
          ) &&
          !quotaExhausted;

        console.warn(
          `[Gemini] Request attempt ${
            retryCount + 1
          } failed after ${
            Date.now() -
            startedAt
          }ms`,
          {
            status,
            retryable,
            quotaExhausted,
          }
        );

        /*
         * Do not burn another Gemini request when
         * the project/model quota is already known
         * to be exhausted.
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

        const delay =
          1000 *
          Math.pow(
            2,
            retryCount
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