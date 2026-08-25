import {
  GeminiProvider,
  isGeminiAvailabilityError,
} from "../llm/gemini.provider.js";

import {
  isKnownCapability,
} from "./capability-catalog.js";

import type {
  OrchestrationMemoryState,
} from "./orchestration-memory.types.js";

const MAX_REPLAN_ITERATIONS =
  2;

export type OrchestrationEvaluationOutcome =
  | "SATISFIED"
  | "REPLAN"
  | "FAILED";

export type EvaluatorStep = {
  id: string;

  status:
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED";

  runId:
    string | null;

  satisfies:
    string[];

  requiredCapabilities:
    string[];

  dependsOnPositions:
    number[];
};

type EvaluateOrchestrationInput = {
  memory:
    OrchestrationMemoryState;

  /*
   * Successful capabilities from older
   * orchestration iterations.
   *
   * We deliberately pass only the capabilities,
   * not old failed-step state.
   */
  previouslySatisfiedCapabilities:
    string[];

  /*
   * Only the currently active iteration's
   * execution steps belong here.
   */
  steps:
    EvaluatorStep[];
};

export type OrchestrationEvaluationResult = {
  outcome:
    OrchestrationEvaluationOutcome;

  reason:
    string;

  missingCapabilities:
    string[];

  failedStepIds:
    string[];

  strandedStepIds:
    string[];

  requiresSemanticEvaluation:
    boolean;
};

function unique(
  values:
    string[]
): string[] {
  return [
    ...new Set(
      values
    ),
  ];
}

function getRequiredCapabilities(
  steps:
    EvaluatorStep[]
): string[] {
  return unique(
    steps.flatMap(
      (
        step
      ) =>
        step.requiredCapabilities
    )
  );
}

function getCurrentSatisfiedCapabilities(
  steps:
    EvaluatorStep[]
): string[] {
  return unique(
    steps
      .filter(
        (
          step
        ) =>
          step.status ===
          "SUCCESS"
      )
      .flatMap(
        (
          step
        ) =>
          step.satisfies
      )
  );
}

function getFailedStepIds(
  steps:
    EvaluatorStep[]
): string[] {
  return steps
    .filter(
      (
        step
      ) =>
        step.status ===
        "FAILED"
    )
    .map(
      (
        step
      ) =>
        step.id
    );
}

function getStrandedStepIds(
  steps:
    EvaluatorStep[]
): string[] {
  const stepByPosition =
    new Map<
      number,
      EvaluatorStep
    >();

  /*
   * EvaluatorStep itself intentionally does not
   * carry the DB position because the evaluator
   * does not otherwise need it.
   *
   * Dependency-stranding is therefore determined
   * conservatively below:
   *
   * a PENDING step with no runId after scheduling
   * has settled is considered stranded.
   *
   * The scheduler has already had another chance
   * to schedule runnable nodes before this
   * evaluator is called.
   */
  void stepByPosition;

  return steps
    .filter(
      (
        step
      ) =>
        step.status ===
          "PENDING" &&
        step.runId ===
          null
    )
    .map(
      (
        step
      ) =>
        step.id
    );
}

export function evaluateOrchestrationDeterministically(
  input:
    EvaluateOrchestrationInput
): OrchestrationEvaluationResult {
  const requiredCapabilities =
    getRequiredCapabilities(
      input.steps
    );

  const currentSatisfiedCapabilities =
    getCurrentSatisfiedCapabilities(
      input.steps
    );

  /*
   * ------------------------------------------------
   * Cross-iteration capability reuse
   * ------------------------------------------------
   *
   * Prior SUCCESS contributes to coverage.
   *
   * Prior FAILURE does not.
   */
  const satisfiedCapabilities =
    new Set([
      ...input.previouslySatisfiedCapabilities,

      ...currentSatisfiedCapabilities,
    ]);

  const missingCapabilities =
    requiredCapabilities.filter(
      (
        capability
      ) =>
        !satisfiedCapabilities.has(
          capability
        )
    );

  const failedStepIds =
    getFailedStepIds(
      input.steps
    );

  const strandedStepIds =
    getStrandedStepIds(
      input.steps
    );

  /*
   * ------------------------------------------------
   * Execution/provider failures
   * ------------------------------------------------
   *
   * A failed agent execution is not automatically
   * evidence that a different plan will work.
   *
   * This prevents quota/provider failures from
   * creating useless replanning loops.
   */
  if (
    failedStepIds.length >
    0
  ) {
    return {
      outcome:
        "FAILED",

      reason:
        `${failedStepIds.length} execution step(s) failed. Vigil will not automatically replan an execution/provider failure without evidence that another plan can recover from it.`,

      missingCapabilities,

      failedStepIds,

      strandedStepIds,

      requiresSemanticEvaluation:
        false,
    };
  }

  /*
   * ------------------------------------------------
   * Structurally incomplete graph
   * ------------------------------------------------
   */
  if (
    strandedStepIds.length >
      0 ||
    missingCapabilities.length >
      0
  ) {
    if (
      input.memory.iteration >=
      MAX_REPLAN_ITERATIONS
    ) {
      return {
        outcome:
          "FAILED",

        reason:
          "The orchestration is still structurally incomplete after reaching the maximum replanning limit.",

        missingCapabilities,

        failedStepIds,

        strandedStepIds,

        requiresSemanticEvaluation:
          false,
      };
    }

    const reasons:
      string[] =
      [];

    if (
      missingCapabilities.length >
      0
    ) {
      reasons.push(
        `Missing required capabilities: ${missingCapabilities.join(
          ", "
        )}`
      );
    }

    if (
      strandedStepIds.length >
      0
    ) {
      reasons.push(
        `${strandedStepIds.length} execution step(s) are stranded and cannot currently make progress.`
      );
    }

    return {
      outcome:
        "REPLAN",

      reason:
        reasons.join(
          " "
        ),

      missingCapabilities,

      failedStepIds,

      strandedStepIds,

      requiresSemanticEvaluation:
        false,
    };
  }

  /*
   * ------------------------------------------------
   * Structural success
   * ------------------------------------------------
   *
   * Deterministically, every required capability
   * has now been covered either:
   *
   * - in this iteration, or
   * - by a reusable success from an older iteration.
   *
   * Semantic evaluation may optionally decide
   * whether those successful outputs really
   * satisfy the user's goal.
   */
  return {
    outcome:
      "SATISFIED",

    reason:
      input.previouslySatisfiedCapabilities.length >
      0
        ? "All required capabilities were satisfied using the current execution together with reusable successful results from previous iterations."
        : "All required capabilities were satisfied successfully.",

    missingCapabilities:
      [],

    failedStepIds:
      [],

    strandedStepIds:
      [],

    requiresSemanticEvaluation:
      true,
  };
}
/*
 * ==================================================
 * RESULT-AWARE SEMANTIC EVALUATION
 * ==================================================
 */

const SEMANTIC_EVALUATION_TIMEOUT_MS = 15_000;
const MAX_SEMANTIC_RESULT_CHARS = 3_000;
const MAX_SEMANTIC_CONTEXT_CHARS = 10_000;

export type SemanticEvaluationOutcome =
  | "SATISFIED"
  | "REPLAN";

export type SemanticOrchestrationEvaluationResult = {
  outcome: SemanticEvaluationOutcome;
  reason: string;
  missingCapabilities: string[];
  evaluatedResultCount: number;
  provider: "gemini";
};

type SemanticEvaluationCandidate = {
  stepId: string;
  position: number;
  agentSlug: string | null;
  result: unknown;
};

function semanticEvaluationEnabled(): boolean {
  return process.env.VIGIL_SEMANTIC_EVALUATION === "true";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(message)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function stripMarkdownCodeFence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function stringifyResult(result: unknown): string {
  try {
    const serialized = JSON.stringify(result);

    if (!serialized) {
      return "null";
    }

    return serialized.length <= MAX_SEMANTIC_RESULT_CHARS
      ? serialized
      : `${serialized.slice(0, MAX_SEMANTIC_RESULT_CHARS)}...[truncated]`;
  } catch {
    return String(result).slice(0, MAX_SEMANTIC_RESULT_CHARS);
  }
}

function getSuccessfulResultCandidates(
  memory: OrchestrationMemoryState
): SemanticEvaluationCandidate[] {
  return Object.values(memory.stepResults)
    .filter(
      (step) =>
        step.status === "SUCCESS" &&
        step.result !== null &&
        step.result !== undefined
    )
    .sort((left, right) => left.position - right.position)
    .map((step) => ({
      stepId: step.stepId,
      position: step.position,
      agentSlug: step.agentSlug,
      result: step.result,
    }));
}

function buildSemanticEvaluationPrompt(
  memory: OrchestrationMemoryState,
  candidates: SemanticEvaluationCandidate[]
): string {
  const compactResults: string[] = [];
  let totalChars = 0;

  for (const candidate of candidates) {
    const entry = JSON.stringify({
      stepId: candidate.stepId,
      position: candidate.position,
      agentSlug: candidate.agentSlug,
      result: stringifyResult(candidate.result),
    });

    if (totalChars + entry.length > MAX_SEMANTIC_CONTEXT_CHARS) {
      break;
    }

    compactResults.push(entry);
    totalChars += entry.length;
  }

  return [
    "You are Vigil's semantic orchestration evaluator.",
    "",
    "Determine whether the user's goal is actually satisfied by the successful worker outputs.",
    "",
    "Rules:",
    "- Judge the CONTENT of results, not merely execution status.",
    "- Do not invent agents.",
    "- If more work is needed, request only canonical capabilities.",
    "- A technically successful worker may still reveal a blocker.",
    "- Request a new capability only when additional work is genuinely necessary to satisfy the original goal.",
    "",
    `Goal: ${memory.goal}`,
    "",
    "Successful worker results:",
    compactResults.length ? compactResults.join("\n") : "(none)",
    "",
    "Return ONLY valid JSON:",
    "{",
    '  "outcome": "SATISFIED" | "REPLAN",',
    '  "reason": "brief explanation",',
    '  "missingCapabilities": ["canonical-capability-id"]',
    "}",
  ].join("\n");
}

function parseSemanticEvaluation(raw: string): {
  outcome: SemanticEvaluationOutcome;
  reason: string;
  missingCapabilities: string[];
} {
  const cleaned = stripMarkdownCodeFence(raw);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "ORCHESTRATION_SEMANTIC_EVALUATION_INVALID_JSON"
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "ORCHESTRATION_SEMANTIC_EVALUATION_INVALID_RESPONSE"
    );
  }

  const candidate = parsed as {
    outcome?: unknown;
    reason?: unknown;
    missingCapabilities?: unknown;
  };

  if (
    candidate.outcome !== "SATISFIED" &&
    candidate.outcome !== "REPLAN"
  ) {
    throw new Error(
      "ORCHESTRATION_SEMANTIC_EVALUATION_INVALID_OUTCOME"
    );
  }

  if (
    typeof candidate.reason !== "string" ||
    !candidate.reason.trim()
  ) {
    throw new Error(
      "ORCHESTRATION_SEMANTIC_EVALUATION_INVALID_REASON"
    );
  }

  if (!Array.isArray(candidate.missingCapabilities)) {
    throw new Error(
      "ORCHESTRATION_SEMANTIC_EVALUATION_INVALID_CAPABILITIES"
    );
  }

  const missingCapabilities = unique(
    candidate.missingCapabilities
      .filter(
        (capability): capability is string =>
          typeof capability === "string" &&
          capability.trim().length > 0
      )
      .map((capability) => capability.trim())
      .filter((capability) => isKnownCapability(capability))
  );

  if (
    candidate.outcome === "REPLAN" &&
    missingCapabilities.length === 0
  ) {
    return {
      outcome: "SATISFIED",
      reason:
        `${candidate.reason.trim()} No valid canonical capability was requested, so Vigil will not create an unresolvable semantic replan.`,
      missingCapabilities: [],
    };
  }

  return {
    outcome: candidate.outcome,
    reason: candidate.reason.trim(),
    missingCapabilities:
      candidate.outcome === "REPLAN"
        ? missingCapabilities
        : [],
  };
}

export async function evaluateOrchestrationSemantically(
  input: EvaluateOrchestrationInput
): Promise<SemanticOrchestrationEvaluationResult | null> {
  if (!semanticEvaluationEnabled()) {
    return null;
  }

  const structural =
    evaluateOrchestrationDeterministically(input);

  if (
    structural.outcome !== "SATISFIED" ||
    !structural.requiresSemanticEvaluation
  ) {
    return null;
  }

  const candidates =
    getSuccessfulResultCandidates(input.memory);

  if (candidates.length === 0) {
    return null;
  }

  const prompt =
    buildSemanticEvaluationPrompt(input.memory, candidates);

  try {
    const llm = new GeminiProvider();

    const response = await withTimeout(
      llm.generate(
        { prompt },
        { lowLatency: true }
      ),
      SEMANTIC_EVALUATION_TIMEOUT_MS,
      "ORCHESTRATION_SEMANTIC_EVALUATION_TIMEOUT"
    );

    const semantic =
      parseSemanticEvaluation(response.text);

    return {
      ...semantic,
      evaluatedResultCount: candidates.length,
      provider: "gemini",
    };
  } catch (error) {
    if (isGeminiAvailabilityError(error)) {
      console.warn(
        "[OrchestrationEvaluator] Semantic evaluation unavailable; preserving deterministic result."
      );
      return null;
    }

    console.warn(
      "[OrchestrationEvaluator] Semantic evaluation failed; preserving deterministic result:",
      error
    );

    return null;
  }
}