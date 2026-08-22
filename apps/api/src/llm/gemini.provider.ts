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
  new Set([429, 503]);

type GeminiGenerationOptions = {
  lowLatency?: boolean;
};

function sleep(
  milliseconds: number
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

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

export class GeminiProvider
  implements LLMProvider
{
  name = "gemini";

  private client: GoogleGenAI;

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
    options: GeminiGenerationOptions = {}
  ): Promise<LLMResponse> {
    const maxRetries =
      options.lowLatency
        ? 1
        : 3;

    let attempt = 0;

    while (true) {
      const startedAt =
        Date.now();

      try {
        const response =
          await this.client.models.generateContent(
            {
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
            }
          );

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
          getErrorStatus(
            error
          );

        const retryable =
          status !==
            undefined &&
          RETRYABLE_STATUS_CODES.has(
            status
          );

        console.warn(
          `[Gemini] Request attempt ${
            attempt + 1
          } failed after ${
            Date.now() -
            startedAt
          }ms`,
          {
            status,
            retryable,
          }
        );

        if (
          !retryable ||
          attempt >=
            maxRetries
        ) {
          throw error;
        }

        const delay =
          1000 *
          Math.pow(
            2,
            attempt
          );

        attempt++;

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