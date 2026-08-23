import type {
  OrchestrationMemoryState,
} from "./orchestration-memory.types.js";

export type OrchestrationEvaluationOutcome =
  | "SATISFIED"
  | "REPLAN"
  | "FAILED";

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

/*
 * Number of replans Vigil may request before
 * declaring that the orchestration cannot
 * recover automatically.
 *
 * iteration starts at 0.
 *
 * 0 -> initial plan
 * 1 -> first replan
 * 2 -> second replan
 */
export const MAX_REPLAN_ITERATIONS =
  2;

type EvaluationStep = {
  id:
    string;

  status:
    string;

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

  steps:
    EvaluationStep[];
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

/*
 * --------------------------------------------------
 * Deterministic evaluator
 * --------------------------------------------------
 *
 * This layer intentionally performs ZERO LLM calls.
 *
 * It answers structural questions such as:
 *
 * - Did execution fail?
 * - Did all required capabilities actually complete?
 * - Are some graph nodes stranded?
 * - Have we already exhausted our replan budget?
 *
 * Semantic quality evaluation comes later and only
 * runs when structural evaluation is insufficient.
 */
export function evaluateOrchestrationDeterministically(
  input:
    EvaluateOrchestrationInput
): OrchestrationEvaluationResult {
  const {
    memory,
    steps,
  } =
    input;

  if (
    steps.length ===
    0
  ) {
    return {
      outcome:
        "FAILED",

      reason:
        "The orchestration contains no execution steps.",

      missingCapabilities:
        [],

      failedStepIds:
        [],

      strandedStepIds:
        [],

      requiresSemanticEvaluation:
        false,
    };
  }

  const failedStepIds =
    steps
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

  /*
   * A pending step with no Run once execution has
   * settled means that the graph could not reach it.
   *
   * The most common reason is an upstream failure.
   */
  const strandedStepIds =
    steps
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

  const requiredCapabilities =
    unique(
      steps.flatMap(
        (
          step
        ) =>
          step.requiredCapabilities
      )
    );

  /*
   * Only SUCCESS steps count as having actually
   * satisfied capabilities.
   */
  const satisfiedCapabilities =
    new Set(
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

  const missingCapabilities =
    requiredCapabilities.filter(
      (
        capability
      ) =>
        !satisfiedCapabilities.has(
          capability
        )
    );

  const needsRecovery =
    failedStepIds.length >
      0 ||
    strandedStepIds.length >
      0 ||
    missingCapabilities.length >
      0;

  /*
   * Execution failure and planning insufficiency are
   * different things.
   *
   * A failed agent/tool/provider call does not imply
   * that generating another plan will help.
   *
   * In particular, blindly replanning after an LLM
   * provider outage would simply execute the same
   * work again and waste requests.
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

  const needsReplan =
    strandedStepIds.length >
      0 ||
    missingCapabilities.length >
      0;

  if (
    needsReplan
  ) {
    if (
      memory.iteration >=
      MAX_REPLAN_ITERATIONS
    ) {
      return {
        outcome:
          "FAILED",

        reason:
          `Vigil could not satisfy the goal after ${memory.iteration} replanning iteration(s).`,

        missingCapabilities,

        failedStepIds:
          [],

        strandedStepIds,

        requiresSemanticEvaluation:
          false,
      };
    }

    const reasons:
      string[] = [];

    if (
      strandedStepIds.length >
      0
    ) {
      reasons.push(
        `${strandedStepIds.length} execution step(s) became unreachable`
      );
    }

    if (
      missingCapabilities.length >
      0
    ) {
      reasons.push(
        `required capabilities remain unsatisfied: ${missingCapabilities.join(
          ", "
        )}`
      );
    }

    return {
      outcome:
        "REPLAN",

      reason:
        `The current plan is incomplete because ${reasons.join(
          "; "
        )}.`,

      missingCapabilities,

      failedStepIds:
        [],

      strandedStepIds,

      requiresSemanticEvaluation:
        false,
    };
  }

  const everyStepComplete =
    steps.every(
      (
        step
      ) =>
        step.status ===
          "SUCCESS" ||
        step.status ===
          "SKIPPED"
    );

  if (
    everyStepComplete
  ) {
    return {
      outcome:
        "SATISFIED",

      reason:
        "All planned execution steps completed and all required capabilities were structurally satisfied.",

      missingCapabilities:
        [],

      failedStepIds:
        [],

      strandedStepIds:
        [],

      /*
       * Later this becomes the hook for an
       * optional semantic evaluator:
       *
       * "The agents succeeded, but are their
       * outputs actually good enough?"
       */
      requiresSemanticEvaluation:
        true,
    };
  }

  /*
   * We should normally never reach this branch
   * because evaluation only starts after a wave
   * has settled.
   */
  return {
    outcome:
      "FAILED",

    reason:
      "The orchestration reached an inconsistent execution state.",

    missingCapabilities,

    failedStepIds,

    strandedStepIds,

    requiresSemanticEvaluation:
      false,
  };
}