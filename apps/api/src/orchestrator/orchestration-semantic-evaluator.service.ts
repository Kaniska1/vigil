import {
  GeminiProvider,
  isGeminiQuotaExhausted,
} from "../llm/gemini.provider.js";

import type {
  OrchestrationMemoryState,
} from "./orchestration-memory.types.js";

export type SemanticEvaluationResult = {
  performed: boolean;

  satisfied: boolean;

  shouldReplan: boolean;

  reason: string;

  missingCapabilities: string[];

  source:
    | "disabled"
    | "gemini"
    | "provider-unavailable";
};

const MAX_RESULT_CHARS_PER_STEP =
  4_000;

const MAX_TOTAL_RESULT_CHARS =
  10_000;

function isEnabled(): boolean {
  return (
    process.env
      .VIGIL_SEMANTIC_EVALUATION ===
    "true"
  );
}

function stringifySafely(
  value: unknown
): string {
  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(
      value
    );
  }
}

function truncate(
  value: string,
  limit: number
): string {
  if (
    value.length <=
    limit
  ) {
    return value;
  }

  return `${value.slice(
    0,
    limit
  )}\n...[truncated]`;
}

function buildCompactExecutionContext(
  memory:
    OrchestrationMemoryState
): string {
  let remaining =
    MAX_TOTAL_RESULT_CHARS;

  const currentResults =
    Object.values(
      memory.stepResults
    )
      .filter(
        (step) =>
          step.status ===
          "SUCCESS"
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      );

  const compact =
    currentResults.map(
      (step) => {
        const raw =
          stringifySafely(
            step.result
          );

        const allowed =
          Math.min(
            MAX_RESULT_CHARS_PER_STEP,
            remaining
          );

        const result =
          truncate(
            raw,
            allowed
          );

        remaining -=
          result.length;

        return {
          stepId:
            step.stepId,

          agentSlug:
            step.agentSlug,

          result,
        };
      }
    );

  return JSON.stringify(
    compact
  );
}

function stripFence(
  value: string
): string {
  return value
    .trim()
    .replace(
      /^```(?:json)?\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}

function parseResponse(
  raw: string
): Omit<
  SemanticEvaluationResult,
  "performed" | "source"
> {
  const parsed =
    JSON.parse(
      stripFence(
        raw
      )
    ) as {
      satisfied?: unknown;

      shouldReplan?: unknown;

      reason?: unknown;

      missingCapabilities?: unknown;
    };

  if (
    typeof parsed.satisfied !==
      "boolean" ||
    typeof parsed.shouldReplan !==
      "boolean" ||
    typeof parsed.reason !==
      "string" ||
    !Array.isArray(
      parsed.missingCapabilities
    )
  ) {
    throw new Error(
      "SEMANTIC_EVALUATOR_INVALID_RESPONSE"
    );
  }

  const missingCapabilities =
    parsed.missingCapabilities.filter(
      (
        value
      ): value is string =>
        typeof value ===
        "string"
    );

  return {
    satisfied:
      parsed.satisfied,

    shouldReplan:
      parsed.shouldReplan,

    reason:
      parsed.reason,

    missingCapabilities,
  };
}

function providerUnavailable(
  error: unknown
): boolean {
  if (
    isGeminiQuotaExhausted(
      error
    )
  ) {
    return true;
  }

  if (
    error instanceof Error
  ) {
    const message =
      error.message.toLowerCase();

    return (
      message.includes(
        "gemini_api_key"
      ) ||
      message.includes(
        "fetch failed"
      ) ||
      message.includes(
        "econnreset"
      ) ||
      message.includes(
        "etimedout"
      ) ||
      message.includes(
        "503"
      )
    );
  }

  return false;
}

export async function evaluateOrchestrationSemantically(
  memory:
    OrchestrationMemoryState
): Promise<SemanticEvaluationResult> {
  if (
    !isEnabled()
  ) {
    return {
      performed:
        false,

      satisfied:
        true,

      shouldReplan:
        false,

      reason:
        "Semantic evaluation is disabled. Vigil accepted the deterministic structural evaluation.",

      missingCapabilities:
        [],

      source:
        "disabled",
    };
  }

  const executionContext =
    buildCompactExecutionContext(
      memory
    );

  const provider =
    new GeminiProvider();

  try {
    const response =
      await provider.generate(
        {
          systemPrompt:
            `You are Vigil's orchestration evaluator.

Your job is to determine whether the completed execution results actually satisfy the user's goal.

Do not judge whether the agents executed successfully; the runtime has already verified that.

Evaluate only semantic sufficiency.

Return ONLY valid JSON:

{
  "satisfied": boolean,
  "shouldReplan": boolean,
  "reason": "brief explanation",
  "missingCapabilities": ["capability-id"]
}

Rules:
- If the results adequately satisfy the goal, satisfied=true and shouldReplan=false.
- If important work is missing, satisfied=false and shouldReplan=true.
- Do not invent failures.
- Be conservative about requesting replanning.
- Keep the response concise.`,

          prompt:
            `Goal:
${memory.goal}

Iteration:
${memory.iteration}

Successful execution results:
${executionContext}`,
        },
        {
          lowLatency:
            true,
        }
      );

    const parsed =
      parseResponse(
        response.text
      );

    return {
      performed:
        true,

      ...parsed,

      source:
        "gemini",
    };
  } catch (
    error
  ) {
    if (
      providerUnavailable(
        error
      )
    ) {
      console.warn(
        "[Orchestrator] Semantic evaluation unavailable; accepting structural evaluation"
      );

      return {
        performed:
          false,

        satisfied:
          true,

        shouldReplan:
          false,

        reason:
          "Semantic evaluation was unavailable. Vigil accepted the deterministic structural evaluation.",

        missingCapabilities:
          [],

        source:
          "provider-unavailable",
      };
    }

    /*
     * Invalid evaluator output is different
     * from provider downtime.
     *
     * We expose this rather than silently
     * trusting malformed model output.
     */
    throw error;
  }
}