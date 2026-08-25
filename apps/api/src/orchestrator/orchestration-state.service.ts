import prisma from "../lib/prisma.js";

import {
  scheduleReadyOrchestrationSteps,
} from "./orchestration-scheduler.service.js";

import {
  evaluateOrchestrationDeterministically,
  evaluateOrchestrationSemantically,
} from "./orchestration-evaluator.service.js";

import {
  getOrchestrationMemory,
  recordOrchestrationDecision,
  recordOrchestrationEvaluation,
  recordOrchestrationStepMemory,
  setOrchestrationMemoryPhase,
} from "./orchestration-memory.service.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

import {
  replanOrchestration,
} from "./orchestration-replanner.service.js";

import {
  persistFinalOrchestrationResult,
} from "./orchestration-result.service.js";

import type {
  OrchestrationStep,
} from "@vigil/db";

export async function markOrchestrationStepRunning(
  runId: string
): Promise<void> {
  const step =
    await prisma.orchestrationStep.findUnique({
      where: {
        runId,
      },

      include: {
        agent:
          true,
      },
    });

  if (!step) {
    return;
  }

  if (
    step.status !==
    "PENDING"
  ) {
    return;
  }

  const startedAt =
    new Date();

  await prisma.orchestrationStep.update({
    where: {
      id:
        step.id,
    },

    data: {
      status:
        "RUNNING",

      startedAt,
    },
  });

  await recordOrchestrationStepMemory({
    orchestrationId:
      step.orchestrationId,

    stepId:
      step.id,

    position:
      step.position,

    runId,

    agentId:
      step.agentId ||
      null,

    agentSlug:
      step.agent?.slug ??
      null,

    status:
      "RUNNING",

    startedAt,
  });

  await traceOrchestration(
    step.orchestrationId,
    "STEP_STARTED",
    `${step.agent?.name ?? "Agent"} started`,
    {
      stepId:
        step.id,

      runId,

      position:
        step.position,

      iteration:
        step.iteration,

      dependsOnPositions:
        step.dependsOnPositions,

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,

      satisfies:
        step.satisfies,
    }
  );
}

export async function markOrchestrationStepSuccess(
  runId: string
): Promise<void> {
  const step =
    await prisma.orchestrationStep.findUnique({
      where: {
        runId,
      },

      include: {
        agent:
          true,

        run: {
          select: {
            result:
              true,
          },
        },
      },
    });

  if (!step) {
    return;
  }

  if (
    step.status ===
    "SUCCESS"
  ) {
    return;
  }

  const completedAt =
    new Date();

  await prisma.orchestrationStep.update({
    where: {
      id:
        step.id,
    },

    data: {
      status:
        "SUCCESS",

      completedAt,
    },
  });

  await recordOrchestrationStepMemory({
    orchestrationId:
      step.orchestrationId,

    stepId:
      step.id,

    position:
      step.position,

    runId,

    agentId:
      step.agentId ||
      null,

    agentSlug:
      step.agent?.slug ??
      null,

    status:
      "SUCCESS",

    result:
      step.run?.result ??
      null,

    startedAt:
      step.startedAt,

    completedAt,
  });

  await traceOrchestration(
    step.orchestrationId,
    "STEP_COMPLETED",
    `${step.agent?.name ?? "Agent"} completed`,
    {
      stepId:
        step.id,

      runId,

      position:
        step.position,

      iteration:
        step.iteration,

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,

      satisfies:
        step.satisfies,
    }
  );

  /*
   * A successful step may unlock another DAG node.
   */
  await scheduleReadyOrchestrationSteps(
    step.orchestrationId
  );

  await evaluateIfExecutionSettled(
    step.orchestrationId
  );
}

export async function markOrchestrationStepFailed(
  runId: string
): Promise<void> {
  const step =
    await prisma.orchestrationStep.findUnique({
      where: {
        runId,
      },

      include: {
        agent:
          true,
      },
    });

  if (!step) {
    return;
  }

  if (
    step.status ===
    "FAILED"
  ) {
    return;
  }

  const completedAt =
    new Date();

  await prisma.orchestrationStep.update({
    where: {
      id:
        step.id,
    },

    data: {
      status:
        "FAILED",

      completedAt,
    },
  });

  await recordOrchestrationStepMemory({
    orchestrationId:
      step.orchestrationId,

    stepId:
      step.id,

    position:
      step.position,

    runId,

    agentId:
      step.agentId ||
      null,

    agentSlug:
      step.agent?.slug ??
      null,

    status:
      "FAILED",

    startedAt:
      step.startedAt,

    completedAt,
  });

  await traceOrchestration(
    step.orchestrationId,
    "STEP_FAILED",
    `${step.agent?.name ?? "Agent"} failed`,
    {
      stepId:
        step.id,

      runId,

      position:
        step.position,

      iteration:
        step.iteration,

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,

      satisfies:
        step.satisfies,
    }
  );

  /*
   * Do not immediately fail the parent.
   *
   * The evaluator owns the transition from
   * execution state to orchestration outcome.
   */
  await evaluateIfExecutionSettled(
    step.orchestrationId
  );
}

function hasActiveExecution(
  steps:
    OrchestrationStep[]
): boolean {
  return steps.some(
    (
      step
    ) =>
      step.status ===
        "RUNNING" ||
      (
        step.status ===
          "PENDING" &&
        step.runId !==
          null
      )
  );
}

function hasRunnablePendingStep(
  steps:
    OrchestrationStep[]
): boolean {
  return steps.some(
    (
      step
    ) => {
      if (
        step.status !==
          "PENDING" ||
        step.runId !==
          null
      ) {
        return false;
      }

      if (
        step.dependsOnPositions.length ===
        0
      ) {
        return true;
      }

      return step.dependsOnPositions.every(
        (
          dependencyPosition
        ) => {
          const dependency =
            steps.find(
              (
                candidate
              ) =>
                candidate.position ===
                dependencyPosition
            );

          return (
            dependency?.status ===
            "SUCCESS"
          );
        }
      );
    }
  );
}

/*
 * --------------------------------------------------
 * Execution → Evaluation boundary
 * --------------------------------------------------
 *
 * Multiple workers can arrive here at almost
 * exactly the same time.
 *
 * RUNNING → EVALUATING therefore acts as our
 * atomic evaluation claim.
 */
export async function evaluateIfExecutionSettled(
  orchestrationId:
    string
): Promise<void> {
  const orchestration =
    await prisma.orchestrationRun.findUnique({
      where: {
        id:
          orchestrationId,
      },

      include: {
        steps:
          true,
      },
    });

  if (!orchestration) {
    return;
  }

  if (
    orchestration.status !==
    "RUNNING"
  ) {
    return;
  }

  const currentMemory =
    await getOrchestrationMemory(
      orchestrationId
    );

  if (!currentMemory) {
    throw new Error(
      "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
    );
  }

  const allSteps =
    orchestration.steps as
      OrchestrationStep[];

  /*
   * ------------------------------------------------
   * Historical successful capability reuse
   * ------------------------------------------------
   *
   * We intentionally collect only SUCCESS from
   * older iterations.
   *
   * Old failures must never poison the current
   * iteration.
   */
  const previouslySatisfiedCapabilities =
    [
      ...new Set(
        allSteps
          .filter(
            (
              step
            ) =>
              step.iteration <
                currentMemory.iteration &&
              step.status ===
                "SUCCESS"
          )
          .flatMap(
            (
              step
            ) =>
              step.satisfies
          )
      ),
    ];

  /*
   * Execution state itself remains scoped to the
   * currently active iteration.
   */
  const steps =
    allSteps.filter(
      (
        step
      ) =>
        step.iteration ===
        currentMemory.iteration
    );

  /*
   * Some child runs are still queued/executing.
   */
  if (
    hasActiveExecution(
      steps
    )
  ) {
    return;
  }

  /*
   * A runnable step may simply not have been
   * claimed yet.
   *
   * Let the scheduler make one more pass before
   * deciding the execution graph is settled.
   */
  if (
    hasRunnablePendingStep(
      steps
    )
  ) {
    await scheduleReadyOrchestrationSteps(
      orchestrationId
    );

    return;
  }

  /*
   * Atomically claim evaluation.
   */
  const claimed =
    await prisma.orchestrationRun.updateMany({
      where: {
        id:
          orchestrationId,

        status:
          "RUNNING",
      },

      data: {
        status:
          "EVALUATING",
      },
    });

  if (
    claimed.count !==
    1
  ) {
    return;
  }

  try {
    await setOrchestrationMemoryPhase(
      orchestrationId,
      "EVALUATING"
    );

    const memory =
      await getOrchestrationMemory(
        orchestrationId
      );

    if (!memory) {
      throw new Error(
        "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
      );
    }

    /*
     * ------------------------------------------------
     * Structural evaluation
     * ------------------------------------------------
     */
    const structuralEvaluation =
      evaluateOrchestrationDeterministically({
        memory,

        previouslySatisfiedCapabilities,

        steps:
          steps.map(
            (
              step
            ) => ({
              id:
                step.id,

              status:
                step.status,

              runId:
                step.runId,

              satisfies:
                step.satisfies,

              requiredCapabilities:
                step.requiredCapabilities,

              dependsOnPositions:
                step.dependsOnPositions,
            })
          ),
      });

    let finalOutcome =
      structuralEvaluation.outcome;

    let finalReason =
      structuralEvaluation.reason;

    let finalMissingCapabilities =
      structuralEvaluation.missingCapabilities;

    let semanticSource:
      string =
      "structural";

    /*
     * ------------------------------------------------
     * Optional semantic evaluation
     * ------------------------------------------------
     *
     * Never ask Gemini about an orchestration that
     * is structurally FAILED or already requires a
     * deterministic REPLAN.
     */
    if (
      structuralEvaluation.outcome ===
        "SATISFIED" &&
      structuralEvaluation.requiresSemanticEvaluation
    ) {
      const semanticEvaluation =
        await evaluateOrchestrationSemantically({
          memory,

          previouslySatisfiedCapabilities,

          steps:
            steps.map(
              (
                step
              ) => ({
                id:
                  step.id,

                status:
                  step.status,

                runId:
                  step.runId,

                satisfies:
                  step.satisfies,

                requiredCapabilities:
                  step.requiredCapabilities,

                dependsOnPositions:
                  step.dependsOnPositions,
              })
            ),
        });

      if (
        semanticEvaluation
      ) {
        semanticSource =
          semanticEvaluation.provider;

        finalReason =
          semanticEvaluation.reason;

        if (
          semanticEvaluation.outcome ===
          "REPLAN"
        ) {
          finalOutcome =
            "REPLAN";

          finalMissingCapabilities =
            semanticEvaluation.missingCapabilities;
        } else {
          finalOutcome =
            "SATISFIED";

          finalMissingCapabilities =
            [];
        }
      }
    }

    /*
     * Evaluation memory is idempotent per
     * iteration.
     */
    await recordOrchestrationEvaluation({
      orchestrationId,

      iteration:
        memory.iteration,

      satisfied:
        finalOutcome ===
        "SATISFIED",

      reason:
        finalReason,

      missingCapabilities:
        finalMissingCapabilities,

      shouldReplan:
        finalOutcome ===
        "REPLAN",
    });

    await recordOrchestrationDecision({
      orchestrationId,

      type:
        "EVALUATION_DECISION",

      reason:
        finalReason,

      metadata: {
        iteration:
          memory.iteration,

        outcome:
          finalOutcome,

        semanticSource,

        previouslySatisfiedCapabilities,

        missingCapabilities:
          finalMissingCapabilities,

        failedStepIds:
          structuralEvaluation.failedStepIds,

        strandedStepIds:
          structuralEvaluation.strandedStepIds,

        semanticEvaluationUsed:
          semanticSource ===
          "gemini",
      },
    });

    console.log(
      `[Orchestrator] Evaluation iteration ${memory.iteration}: ${finalOutcome}`,
      {
        reason:
          finalReason,

        previouslySatisfiedCapabilities,

        missingCapabilities:
          finalMissingCapabilities,

        failedStepIds:
          structuralEvaluation.failedStepIds,

        strandedStepIds:
          structuralEvaluation.strandedStepIds,

        semanticSource,
      }
    );

    /*
     * ------------------------------------------------
     * SUCCESS
     * ------------------------------------------------
     */
    if (
      finalOutcome ===
      "SATISFIED"
    ) {
      /*
       * Build the parent result before marking the
       * orchestration terminal.
       *
       * Our result builder now aggregates useful
       * successful results across iterations.
       */
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
        },
      });

      await setOrchestrationMemoryPhase(
        orchestrationId,
        "COMPLETED"
      );

      await traceOrchestration(
        orchestrationId,
        "ORCHESTRATION_COMPLETED",
        "Orchestration completed successfully",
        {
          iteration:
            finalResult.iteration,

          resultCount:
            finalResult.results.length,

          capabilitiesSatisfied:
            finalResult.capabilitiesSatisfied,

          previouslySatisfiedCapabilities,
        }
      );

      return;
    }

    /*
     * ------------------------------------------------
     * REPLAN
     * ------------------------------------------------
     */
    if (
      finalOutcome ===
      "REPLAN"
    ) {
      await prisma.orchestrationRun.update({
        where: {
          id:
            orchestrationId,
        },

        data: {
          status:
            "REPLANNING",

          completedAt:
            null,
        },
      });

      await setOrchestrationMemoryPhase(
        orchestrationId,
        "REPLANNING"
      );

      await replanOrchestration(
        orchestrationId,
        finalReason
      );

      return;
    }

    /*
     * ------------------------------------------------
     * FAILED
     * ------------------------------------------------
     */
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
      },
    });

    await setOrchestrationMemoryPhase(
      orchestrationId,
      "FAILED"
    );

    await traceOrchestration(
      orchestrationId,
      "ORCHESTRATION_FAILED",
      finalReason,
      {
        iteration:
          memory.iteration,

        missingCapabilities:
          finalMissingCapabilities,

        failedStepIds:
          structuralEvaluation.failedStepIds,

        strandedStepIds:
          structuralEvaluation.strandedStepIds,
      }
    );
  } catch (
    error
  ) {
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
      },
    });

    await setOrchestrationMemoryPhase(
      orchestrationId,
      "FAILED"
    );

    await traceOrchestration(
      orchestrationId,
      "ORCHESTRATION_FAILED",
      "Vigil failed while evaluating orchestration execution",
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Unknown evaluation error",
      }
    );

    throw error;
  }
}

export async function resumeOrchestrationEvaluation(
  orchestrationId:
    string
): Promise<void> {
  /*
   * A process may die after:
   *
   * RUNNING → EVALUATING
   *
   * but before evaluation finishes.
   *
   * Release the claim back to RUNNING and run the
   * normal evaluation boundary again.
   */
  const released =
    await prisma.orchestrationRun.updateMany({
      where: {
        id:
          orchestrationId,

        status:
          "EVALUATING",
      },

      data: {
        status:
          "RUNNING",
      },
    });

  if (
    released.count !==
    1
  ) {
    return;
  }

  await setOrchestrationMemoryPhase(
    orchestrationId,
    "EXECUTING"
  );

  await evaluateIfExecutionSettled(
    orchestrationId
  );
}