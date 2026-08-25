import {
  InMemorySessionService,
  Runner,
  isFinalResponse,
} from "@google/adk";

import type {
  LlmAgent,
} from "@google/adk";

import type {
  AgentExecutionResult,
  AgentInput,
  VigilAgent,
} from "../agent.types.js";

import type {
  ExecutionContext,
} from "../../runtime/execution-context.types.js";

type AdkAgentAdapterOptions = {
  slug: string;

  name: string;

  agent: LlmAgent;

  buildPrompt: (
    input: AgentInput
  ) => string;

  appName?: string;
};

function getTextFromContent(
  content: unknown
): string {
  if (
    typeof content !==
      "object" ||
    content === null
  ) {
    return "";
  }

  const maybeContent =
    content as {
      parts?: unknown;
    };

  if (
    !Array.isArray(
      maybeContent.parts
    )
  ) {
    return "";
  }

  return maybeContent.parts
    .map(
      (
        part
      ) => {
        if (
          typeof part !==
            "object" ||
          part === null
        ) {
          return "";
        }

        const maybePart =
          part as {
            text?: unknown;
          };

        return typeof maybePart.text ===
          "string"
          ? maybePart.text
          : "";
      }
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function createAdkAgentAdapter(
  options: AdkAgentAdapterOptions
): VigilAgent {
  return {
    slug:
      options.slug,

    name:
      options.name,

    async execute(
      input: AgentInput,
      context: ExecutionContext
    ): Promise<AgentExecutionResult> {
      const prompt =
        options.buildPrompt(
          input
        );

      const appName =
        options.appName ??
        `vigil-${options.slug}`;

      /*
       * ADK session state remains
       * invocation-local for now.
       *
       * Vigil remains the durable source
       * of truth for:
       *
       * - orchestration memory
       * - execution state
       * - traces
       * - results
       * - retries
       * - evaluation
       */
      const sessionService =
        new InMemorySessionService();

      const userId =
        "vigil-runtime";

      const sessionId =
        context.runId;

      await sessionService.createSession({
        appName,
        userId,
        sessionId,
      });

      const runner =
        new Runner({
          agent:
            options.agent,

          appName,

          sessionService,
        });

      await context.trace(
        "LLM_STARTED",
        `${options.name} started Google ADK execution`,
        {
          runtime:
            "google-adk",

          appName,

          sessionId,
        }
      );

      const startedAt =
        performance.now();

      /*
       * ADK tool-using agents can emit
       * multiple events:
       *
       * model response
       * -> tool call
       * -> tool result
       * -> model response
       * -> final response
       *
       * We therefore:
       *
       * 1. inspect every event
       * 2. remember the latest textual response
       * 3. prefer text from the ADK final response
       * 4. fall back to the latest valid text
       *
       * This protects us against ADK event
       * shape/version differences where a
       * useful textual response exists but is
       * not marked as final in the way we
       * originally expected.
       */
      let finalText =
        "";

      let lastText =
        "";

      for await (
        const event of
        runner.runAsync({
          userId,

          sessionId,

          newMessage: {
            role:
              "user",

            parts: [
              {
                text:
                  prompt,
              },
            ],
          },
        })
      ) {
        const text =
          getTextFromContent(
            event.content
          );

        const isFinal =
          isFinalResponse(
            event
          );

        /*
         * Temporary diagnostics.
         *
         * Keep this while we validate the
         * first ADK integration. Once the
         * integration is stable, we can
         * remove this console output and
         * rely entirely on Vigil traces.
         */
        console.log(
          "[ADK Event]",
          {
            author:
              event.author,

            isFinal,

            hasContent:
              Boolean(
                event.content
              ),

            text,

            errorCode:
              event.errorCode,

            errorMessage:
              event.errorMessage,
          }
        );

        if (
  event.errorCode ||
  event.errorMessage
) {
  console.warn(
    "[ADK Event Error]",
    {
      errorCode:
        event.errorCode,

      errorMessage:
        event.errorMessage,
    }
  );

  const providerError =
    new Error(
      event.errorMessage ??
        "Google ADK execution failed"
    ) as Error & {
      status?: number;
    };

  const parsedStatus =
    Number(
      event.errorCode
    );

  if (
    Number.isFinite(
      parsedStatus
    )
  ) {
    providerError.status =
      parsedStatus;
  }

  throw providerError;
}

        if (
          text
        ) {
          lastText =
            text;
        }

        if (
          isFinal &&
          text
        ) {
          finalText =
            text;
        }
      }

      /*
       * Some ADK tool flows may yield useful
       * textual output without the exact
       * final-response shape we originally
       * expected.
       */
      if (
        !finalText &&
        lastText
      ) {
        finalText =
          lastText;
      }

      const latencyMs =
        Math.round(
          performance.now() -
            startedAt
        );

      if (
        !finalText
      ) {
        await context.trace(
          "ERROR",
          `${options.name} returned no textual ADK response`,
          {
            runtime:
              "google-adk",

            latencyMs,
          }
        );

        throw new Error(
          "ADK_AGENT_RETURNED_NO_FINAL_RESPONSE"
        );
      }

      await context.trace(
        "LLM_COMPLETED",
        `${options.name} completed Google ADK execution`,
        {
          runtime:
            "google-adk",

          latencyMs,
        }
      );

      return {
        output: {
          text:
            finalText,

          runtime:
            "google-adk",
        },
      };
    },
  };
}