import prisma from "../lib/prisma.js";

import type {
  Prisma,
} from "@vigil/db";

import {
  createOrchestratorPlan,
} from "./orchestrator.service.js";

import {
  getOrchestrationMemory,
  recordOrchestrationDecision,
  recordOrchestrationReplan,
  setOrchestrationMemoryPhase,
} from "./orchestration-memory.service.js";

import {
  scheduleReadyOrchestrationSteps,
} from "./orchestration-scheduler.service.js";

import {
  persistFinalOrchestrationResult,
} from "./orchestration-result.service.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

import type {
  OrchestrationExecutionStep,
} from "./orchestrator.types.js";

type ReplanGraphNode = {
  step:
    OrchestrationExecutionStep;

  relativePosition:
    number;

  dependsOnRelativePositions:
    number[];
};

const MAX_RESULT_CHARS_PER_STEP =
  2_500;

const MAX_TOTAL_RESULT_CHARS =
  7_500;

function stringifySafely(
  value: unknown
): string {
  try {
    return JSON.stringify(
      value
    );
  } catch {
    return String(
      value
    );
  }
}

function truncate(
  value: string,
  maxLength: number
): string {
  if (
    value.length <=
    maxLength
  ) {
    return value;
  }

  return `${value.slice(
    0,
    maxLength
  )}...[truncated]`;
}

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

function getExecutionStepSatisfiedCapabilities(
  executionSteps:
    OrchestrationExecutionStep[]
): string[] {
  return unique(
    executionSteps.flatMap(
      (
        step
      ) =>
        step.satisfies
    )
  );
}

function buildReplanGraph(
  executionSteps:
    OrchestrationExecutionStep[]
): ReplanGraphNode[] {
  const keyToPosition =
    new Map<
      string,
      number
    >();

  for (
    const [
      position,
      step,
    ] of executionSteps.entries()
  ) {
    const key =
      step.key.trim();

    if (!key) {
      throw new Error(
        `ORCHESTRATION_STEP_KEY_REQUIRED:${position}`
      );
    }

    if (
      keyToPosition.has(
        key
      )
    ) {
      throw new Error(
        `ORCHESTRATION_DUPLICATE_STEP_KEY:${key}`
      );
    }

    keyToPosition.set(
      key,
      position
    );
  }

  return executionSteps.map(
    (
      step,
      relativePosition
    ) => {
      const seenDependencies =
        new Set<string>();

      const dependsOnRelativePositions =
        step.dependsOnKeys.map(
          (
            dependencyKey
          ) => {
            if (
              dependencyKey ===
              step.key
            ) {
              throw new Error(
                `ORCHESTRATION_SELF_DEPENDENCY:${step.key}`
              );
            }

            if (
              seenDependencies.has(
                dependencyKey
              )
            ) {
              throw new Error(
                `ORCHESTRATION_DUPLICATE_DEPENDENCY:${step.key}:${dependencyKey}`
              );
            }

            seenDependencies.add(
              dependencyKey
            );

            const dependencyPosition =
              keyToPosition.get(
                dependencyKey
              );

            if (
              dependencyPosition ===
              undefined
            ) {
              throw new Error(
                `ORCHESTRATION_UNKNOWN_DEPENDENCY:${step.key}:${dependencyKey}`
              );
            }

            if (
              dependencyPosition >=
              relativePosition
            ) {
              throw new Error(
                `ORCHESTRATION_INVALID_DEPENDENCY_ORDER:${step.key}:${dependencyKey}`
              );
            }

            return dependencyPosition;
          }
        );

      return {
        step,

        relativePosition,

        dependsOnRelativePositions,
      };
    }
  );
}

type ReplanExecutionRecord = {
  position:
    number;

  agentSlug:
    string | null;

  status:
    string;

  result:
    string | null;
};

function buildCompactExecutionHistory(
  stepResults:
    Record<
      string,
      {
        position:
          number;

        agentSlug:
          string | null;

        status:
          string;

        result:
          unknown;
      }
    >
): ReplanExecutionRecord[] {
  let remaining =
    MAX_TOTAL_RESULT_CHARS;

  return Object.values(
    stepResults
  )
    .sort(
      (
        a,
        b
      ) =>
        a.position -
        b.position
    )
    .map(
      (
        step
      ) => {
        let result:
          string | null =
          null;

        if (
          step.result !==
            null &&
          step.result !==
            undefined &&
          remaining >
            0
        ) {
          const raw =
            stringifySafely(
              step.result
            );

          const allowed =
            Math.min(
              MAX_RESULT_CHARS_PER_STEP,
              remaining
            );

          result =
            truncate(
              raw,
              allowed
            );

          remaining -=
            result.length;
        }

        return {
          position:
            step.position,

          agentSlug:
            step.agentSlug,

          status:
            step.status,

          result,
        };
      }
    );
}

export async function replanOrchestration(
  orchestrationId:
    string,

  reason:
    string
): Promise<void> {
  const orchestration =
    await prisma.orchestrationRun.findUnique({
      where: {
        id:
          orchestrationId,
      },

      include: {
        steps: {
          orderBy: {
            position:
              "asc",
          },
        },
      },
    });

  if (!orchestration) {
    throw new Error(
      "ORCHESTRATION_NOT_FOUND"
    );
  }

  if (
    orchestration.status !==
    "REPLANNING"
  ) {
    return;
  }

  const memory =
    await getOrchestrationMemory(
      orchestrationId
    );

  if (!memory) {
    throw new Error(
      "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
    );
  }

  const nextIteration =
    memory.iteration +
    1;

  /*
   * Build compact persistent-memory context.
   *
   * We intentionally do not feed full traces,
   * events or every historical prompt back into
   * the planner.
   */
  const executionHistory =
    buildCompactExecutionHistory(
      memory.stepResults
    );

  const currentIterationSteps =
    orchestration.steps.filter(
      (
        step
      ) =>
        step.iteration ===
        memory.iteration
    );

  const attemptedCapabilities =
    unique(
      currentIterationSteps.flatMap(
        (
          step
        ) =>
          step.satisfies
      )
    );

  const successfullySatisfiedCapabilities =
  unique(
    orchestration.steps
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

  const failedCapabilities =
    unique(
      currentIterationSteps
        .filter(
          (
            step
          ) =>
            step.status ===
            "FAILED"
        )
        .flatMap(
          (
            step
          ) =>
            step.satisfies
        )
    );

  const latestEvaluation =
    [...memory.evaluations]
      .reverse()
      .find(
        (
          evaluation
        ) =>
          evaluation.iteration ===
          memory.iteration
      ) ??
    null;

  /*
   * Capabilities requested by the evaluator are
   * first-class replanning requirements.
   *
   * This is the bridge from:
   *
   * worker result
   *   -> semantic evaluation
   *   -> newly discovered capability
   *   -> next orchestration iteration
   *
   * We remove anything already satisfied so the
   * replanner never repeats completed work merely
   * because it appeared in an evaluation record.
   */
  const evaluationMissingCapabilities =
    unique(
      latestEvaluation
        ?.missingCapabilities ??
      []
    );

  const evaluationGapCapabilities =
    evaluationMissingCapabilities.filter(
      (
        capability
      ) =>
        !successfullySatisfiedCapabilities.includes(
          capability
        )
    );

  const replanContext = {
    ...memory.workingContext,

    vigilMemory: {
      currentIteration:
        memory.iteration,

      nextIteration,

      evaluation: {
        reason,

        missingCapabilities:
          evaluationMissingCapabilities,

        requiredGapCapabilities:
          evaluationGapCapabilities,

        previousDecision:
          latestEvaluation
            ? {
                satisfied:
                  latestEvaluation.satisfied,

                shouldReplan:
                  latestEvaluation.shouldReplan,
              }
            : null,
      },

      capabilities: {
        attempted:
          attemptedCapabilities,

        satisfied:
          successfullySatisfiedCapabilities,

        failed:
          failedCapabilities,
      },

      previousExecution:
        executionHistory,

      instructions: [
        "Do not repeat completed work unless it is necessary for the new plan.",
        "Treat evaluation.requiredGapCapabilities as mandatory requirements for this replan.",
        "Prefer capabilities that directly address the evaluation reason and worker findings.",
        "Reuse successful prior results when possible.",
        "Do not choose concrete agents; choose capabilities only.",
      ],
    },
  };

  console.log(
    `[Orchestrator] Replanning iteration ${memory.iteration} → ${nextIteration}`,
    {
      attemptedCapabilities,

      successfullySatisfiedCapabilities,

      failedCapabilities,

      evaluationMissingCapabilities,

      evaluationGapCapabilities,

      reason,
    }
  );

  /*
   * Reuse the same generic planner.
   *
   * The planner reasons about capabilities.
   * Concrete agents are still resolved from the
   * registry afterwards.
   */
  const plan =
  await createOrchestratorPlan({
    goal:
      orchestration.goal,

    context:
      replanContext,

    constraints: {
      alreadySatisfiedCapabilities:
        successfullySatisfiedCapabilities,
    },
  });

  /*
   * The LLM may reason about WHAT is needed, but
   * the runtime must verify that an evaluator-
   * required capability actually survives into the
   * concrete execution plan.
   *
   * This prevents a semantic evaluation such as
   * "security-analysis is still required" from
   * being accidentally dropped by a later planner
   * call that decides previous work is sufficient.
   */
  const plannedSatisfiedCapabilities =
    getExecutionStepSatisfiedCapabilities(
      plan.executionSteps
    );

  const omittedEvaluationCapabilities =
    evaluationGapCapabilities.filter(
      (
        capability
      ) =>
        !plannedSatisfiedCapabilities.includes(
          capability
        )
    );

  if (
    omittedEvaluationCapabilities.length >
    0
  ) {
    await recordOrchestrationDecision({
      orchestrationId,

      type:
        "REPLAN_REJECTED",

      reason:
        "The generated replan omitted capabilities explicitly required by the latest orchestration evaluation.",

      metadata: {
        fromIteration:
          memory.iteration,

        attemptedIteration:
          nextIteration,

        evaluationReason:
          reason,

        requiredEvaluationCapabilities:
          evaluationGapCapabilities,

        plannedSatisfiedCapabilities,

        omittedEvaluationCapabilities,

        unresolvedCapabilities:
          plan.unresolvedCapabilities,
      },
    });

    await prisma.orchestrationRun.update({
      where: {
        id:
          orchestrationId,
      },

      data: {
        status:
          "FAILED",

        completedAt:
          new Date(),

        unresolvedCapabilities:
          unique([
            ...plan.unresolvedCapabilities,
            ...omittedEvaluationCapabilities,
          ]),
      },
    });

    await setOrchestrationMemoryPhase(
      orchestrationId,
      "FAILED"
    );

    await traceOrchestration(
      orchestrationId,
      "ORCHESTRATION_FAILED",
      "Vigil rejected a replan that did not preserve evaluator-required capabilities",
      {
        iteration:
          nextIteration,

        evaluationReason:
          reason,

        requiredEvaluationCapabilities:
          evaluationGapCapabilities,

        omittedEvaluationCapabilities,
      }
    );

    return;
  }

  /*
 * The planner may decide that every capability it
 * needs has already been successfully satisfied by
 * an earlier iteration.
 *
 * In that case there is no reason to create another
 * execution graph.
 */
if (
  plan.satisfiedByReuse
) {
  await recordOrchestrationDecision({
    orchestrationId,

    type:
      "REPLAN_REUSED_RESULTS",

    reason:
      "All capabilities requested by the replan were already satisfied by previous successful execution.",

    metadata: {
      iteration:
        memory.iteration,

      attemptedIteration:
        nextIteration,

      reusedCapabilities:
        successfullySatisfiedCapabilities,

      evaluationGapCapabilities,

      summary:
        plan.summary,
    },
  });

  const finalResult =
    await persistFinalOrchestrationResult(
      orchestrationId
    );

  await prisma.orchestrationRun.update({
    where: {
      id:
        orchestrationId,
    },

    data: {
      status:
        "SUCCESS",

      completedAt:
        new Date(),

      unresolvedCapabilities:
        [],
    },
  });

  await setOrchestrationMemoryPhase(
    orchestrationId,
    "COMPLETED"
  );

  await traceOrchestration(
    orchestrationId,
    "ORCHESTRATION_COMPLETED",
    "Vigil completed the orchestration by reusing previously successful results",
    {
      iteration:
        memory.iteration,

      reusedCapabilities:
        successfullySatisfiedCapabilities,

      resultCount:
        finalResult.results.length,
    }
  );

  return;
}

  if (
    !plan.executable
  ) {
    await recordOrchestrationDecision({
      orchestrationId,

      type:
        "REPLAN_REJECTED",

      reason:
        "Vigil could not produce an executable replan.",

      metadata: {
        fromIteration:
          memory.iteration,

        attemptedIteration:
          nextIteration,

        unresolvedCapabilities:
          plan.unresolvedCapabilities,

        evaluationReason:
          reason,

        requiredEvaluationCapabilities:
          evaluationGapCapabilities,
      },
    });

    await prisma.orchestrationRun.update({
      where: {
        id:
          orchestrationId,
      },

      data: {
        status:
          "FAILED",

        completedAt:
          new Date(),

        unresolvedCapabilities:
          plan.unresolvedCapabilities,
      },
    });

    await setOrchestrationMemoryPhase(
      orchestrationId,
      "FAILED"
    );

    await traceOrchestration(
      orchestrationId,
      "ORCHESTRATION_FAILED",
      "Vigil could not produce an executable replan",
      {
        iteration:
          nextIteration,

        unresolvedCapabilities:
          plan.unresolvedCapabilities,
      }
    );

    return;
  }

  const graph =
    buildReplanGraph(
      plan.executionSteps
    );

  if (
    graph.length ===
    0
  ) {
    throw new Error(
      "ORCHESTRATION_REPLAN_EMPTY"
    );
  }

  const basePosition =
    orchestration.steps.length ===
    0
      ? 0
      : Math.max(
          ...orchestration.steps.map(
            (
              step
            ) =>
              step.position
          )
        ) +
        1;

  /*
   * Persist the new iteration without deleting
   * or mutating previous iteration history.
   */
  await prisma.$transaction(
    async (
      tx:
        Prisma.TransactionClient
    ) => {
      for (
        const node of graph
      ) {
        const absolutePosition =
          basePosition +
          node.relativePosition;

        const dependsOnPositions =
          node.dependsOnRelativePositions.map(
            (
              dependencyPosition
            ) =>
              basePosition +
              dependencyPosition
          );

        await tx.orchestrationStep.create({
          data: {
            orchestrationId,

            kind:
  node.step.kind,

agentId:
  node.step.kind ===
    "AGENT"
    ? node.step.agent.id
    : null,

actionName:
  node.step.kind ===
    "ACTION"
    ? node.step.action
    : null,

            position:
              absolutePosition,

            iteration:
              nextIteration,

            dependsOnPositions,

            status:
              "PENDING",

            satisfies:
              node.step.satisfies,

            requiredCapabilities:
              node.step.requiredCapabilities,

            optionalCapabilities:
              node.step.optionalCapabilities,
          },
        });
      }

      await tx.orchestrationRun.update({
        where: {
          id:
            orchestrationId,
        },

        data: {
          plan:
            JSON.parse(
              JSON.stringify(
                plan
              )
            ),

          unresolvedCapabilities:
            plan.unresolvedCapabilities,

          status:
            "RUNNING",

          completedAt:
            null,
        },
      });
    }
  );

  /*
   * Move durable working memory onto the new
   * iteration only after its graph exists.
   */
  await recordOrchestrationReplan({
    orchestrationId,

    fromIteration:
      memory.iteration,

    toIteration:
      nextIteration,

    reason,
  });

  /*
   * Record WHY Vigil chose this particular
   * replanning strategy.
   */
  await recordOrchestrationDecision({
    orchestrationId,

    type:
      "REPLAN_SELECTED",

    reason,

    metadata: {
      fromIteration:
        memory.iteration,

      toIteration:
        nextIteration,

      summary:
        plan.summary,

      attemptedCapabilities,

      previouslySatisfiedCapabilities:
        successfullySatisfiedCapabilities,

      failedCapabilities,

      evaluationMissingCapabilities,

      evaluationGapCapabilities,

      selectedSteps:
  plan.executionSteps.map(
    (
      step
    ) =>
      step.kind === "AGENT"
        ? {
            kind:
              "AGENT" as const,

            slug:
              step.agent.slug,

            satisfies:
              step.satisfies,
          }
        : {
            kind:
              "ACTION" as const,

            action:
              step.action,

            satisfies:
              step.satisfies,
          }
  ),

      unresolvedCapabilities:
        plan.unresolvedCapabilities,
    },
  });

  await setOrchestrationMemoryPhase(
    orchestrationId,
    "EXECUTING"
  );

  await traceOrchestration(
    orchestrationId,
    "PLAN_CREATED",
    `Vigil created replan iteration ${nextIteration}`,
    {
      iteration:
        nextIteration,

      previousIteration:
        memory.iteration,

      reason,

      summary:
        plan.summary,

      attemptedCapabilities,

      previouslySatisfiedCapabilities:
        successfullySatisfiedCapabilities,

      evaluationGapCapabilities,

      selectedSteps:
  plan.executionSteps.map(
    (
      step
    ) =>
      step.kind === "AGENT"
        ? {
            kind:
              "AGENT" as const,

            slug:
              step.agent.slug,

            satisfies:
              step.satisfies,
          }
        : {
            kind:
              "ACTION" as const,

            action:
              step.action,

            satisfies:
              step.satisfies,
          }
  ),
    }
  );

  await scheduleReadyOrchestrationSteps(
    orchestrationId
  );
}