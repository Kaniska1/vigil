import prisma from "../lib/prisma.js";

import {
  scheduleReadyOrchestrationSteps,
} from "./orchestration-scheduler.service.js";

import {
  evaluateOrchestrationDeterministically,
} from "./orchestration-evaluator.service.js";

import {
  getOrchestrationMemory,
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

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,
    }
  );

  /*
   * Success may unlock downstream graph nodes.
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

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,
    }
  );

  /*
   * Do NOT immediately fail the orchestration.
   *
   * Failure is now an observation that the
   * evaluator reasons about.
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

      /*
       * Root steps are runnable immediately.
       */
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
 * Multiple workers may call this almost
 * simultaneously.
 *
 * The parent status transition:
 *
 * RUNNING -> EVALUATING
 *
 * acts as an atomic evaluation claim.
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

  const memory =
    await getOrchestrationMemory(
      orchestrationId
    );

  if (!memory) {
    throw new Error(
      "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
    );
  }

  const steps =
    (
      orchestration.steps as
        OrchestrationStep[]
    ).filter(
      (
        step
      ) =>
        step.iteration ===
        memory.iteration
    );

  /*
   * Some jobs are still queued or executing.
   */
  if (
    hasActiveExecution(
      steps
    )
  ) {
    return;
  }

  /*
   * A runnable node exists but has not been
   * scheduled yet.
   *
   * Give the scheduler another opportunity
   * before evaluating the plan.
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
   *
   * If two workers arrive here simultaneously,
   * exactly one transition from RUNNING succeeds.
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

    const evaluation =
      evaluateOrchestrationDeterministically({
        memory,

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

    await recordOrchestrationEvaluation({
      orchestrationId,

      iteration:
        memory.iteration,

      satisfied:
        evaluation.outcome ===
        "SATISFIED",

      reason:
        evaluation.reason,

      missingCapabilities:
        evaluation.missingCapabilities,

      shouldReplan:
        evaluation.outcome ===
        "REPLAN",
    });

    console.log(
      `[Orchestrator] Evaluation iteration ${memory.iteration}: ${evaluation.outcome}`,
      {
        reason:
          evaluation.reason,

        missingCapabilities:
          evaluation.missingCapabilities,

        failedStepIds:
          evaluation.failedStepIds,

        strandedStepIds:
          evaluation.strandedStepIds,
      }
    );

    if (
      evaluation.outcome ===
      "SATISFIED"
    ) {
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
        "Orchestration completed successfully"
      );

      return;
    }

    if (
  evaluation.outcome ===
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
    evaluation.reason
  );

  return;
}

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
      evaluation.reason
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
  orchestrationId: string
): Promise<void> {
  /*
   * An orchestration can be left in EVALUATING
   * if the API/worker dies after claiming the
   * evaluation boundary but before evaluation
   * finishes.
   *
   * Move it back to RUNNING atomically and let
   * the normal execution → evaluation boundary
   * run again.
   *
   * Evaluation memory writes are idempotent per
   * iteration, so replaying this boundary is safe.
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