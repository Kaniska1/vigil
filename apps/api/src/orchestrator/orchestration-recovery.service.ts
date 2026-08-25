import prisma from "../lib/prisma.js";

import {
  getOrchestrationMemory,
  recordOrchestrationDecision,
} from "./orchestration-memory.service.js";

import {
  scheduleReadyOrchestrationSteps,
} from "./orchestration-scheduler.service.js";

import {
  evaluateIfExecutionSettled,
  resumeOrchestrationEvaluation,
} from "./orchestration-state.service.js";

import {
  replanOrchestration,
} from "./orchestration-replanner.service.js";

type RecoverableStatus =
  | "RUNNING"
  | "EVALUATING"
  | "REPLANNING";

type RecoverableOrchestration = {
  id: string;

  status:
    RecoverableStatus;

  state:
    unknown;
};

function getLatestReplanReason(
  memory:
    Awaited<
      ReturnType<
        typeof getOrchestrationMemory
      >
    >
): string | null {
  if (!memory) {
    return null;
  }

  /*
   * Prefer the persisted evaluator decision that
   * actually requested replanning.
   */
  const evaluation =
    [...memory.evaluations]
      .reverse()
      .find(
        (
          item
        ) =>
          item.shouldReplan
      );

  if (evaluation) {
    return evaluation.reason;
  }

  /*
   * Fallback for an orchestration that recorded
   * the replan transition but whose evaluator
   * history is unavailable.
   */
  const replan =
    memory.replans[
      memory.replans.length -
        1
    ];

  return (
    replan?.reason ??
    null
  );
}

async function recoverRunningOrchestration(
  orchestrationId:
    string
): Promise<void> {
  /*
   * BullMQ owns already-created jobs.
   *
   * The scheduler will only claim PENDING graph
   * nodes that do not already have a runId.
   */
  await scheduleReadyOrchestrationSteps(
    orchestrationId
  );

  /*
   * The process may have died after the final
   * execution state update but before entering
   * evaluation.
   */
  await evaluateIfExecutionSettled(
    orchestrationId
  );
}

async function recoverReplanningOrchestration(
  orchestrationId:
    string
): Promise<void> {
  const memory =
    await getOrchestrationMemory(
      orchestrationId
    );

  if (!memory) {
    throw new Error(
      "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
    );
  }

  const reason =
    getLatestReplanReason(
      memory
    );

  if (!reason) {
    /*
     * Never fabricate reasoning during recovery.
     */
    throw new Error(
      "ORCHESTRATION_REPLAN_REASON_MISSING"
    );
  }

  /*
   * This may invoke the planner because the
   * orchestration had already reached REPLANNING
   * before the worker died.
   *
   * Normal startup alone does not trigger an
   * additional planner request.
   */
  await replanOrchestration(
    orchestrationId,
    reason
  );
}

async function recoverOne(
  orchestration:
    RecoverableOrchestration
): Promise<void> {
  console.log(
    `[Orchestration Recovery] Recovering ${orchestration.id} from ${orchestration.status}`
  );

  switch (
    orchestration.status
  ) {
    case "RUNNING": {
      await recoverRunningOrchestration(
        orchestration.id
      );

      return;
    }

    case "EVALUATING": {
      await resumeOrchestrationEvaluation(
        orchestration.id
      );

      return;
    }

    case "REPLANNING": {
      await recoverReplanningOrchestration(
        orchestration.id
      );

      return;
    }
  }
}

export async function recoverInFlightOrchestrations(): Promise<void> {
  const orchestrations =
    await prisma.orchestrationRun.findMany({
      where: {
        status: {
          in: [
            "RUNNING",
            "EVALUATING",
            "REPLANNING",
          ],
        },
      },

      select: {
        id:
          true,

        status:
          true,

        state:
          true,
      },

      orderBy: {
        updatedAt:
          "asc",
      },
    });

  const recoverable =
    orchestrations as
      RecoverableOrchestration[];

  if (
    recoverable.length ===
    0
  ) {
    console.log(
      "[Orchestration Recovery] No in-flight orchestrations found"
    );

    return;
  }

  console.log(
    `[Orchestration Recovery] Found ${recoverable.length} in-flight orchestration(s)`
  );

  /*
   * Sequential recovery avoids producing a burst
   * of queue/planner/database work immediately
   * after the worker starts.
   */
  for (
    const orchestration of
    recoverable
  ) {
    /*
     * Pre-memory orchestrations cannot be safely
     * reconstructed.
     *
     * Skip rather than inventing state.
     */
    if (
      orchestration.state ===
      null
    ) {
      console.warn(
        `[Orchestration Recovery] Skipping legacy orchestration ${orchestration.id}: persistent memory is not initialized`
      );

      continue;
    }

    try {
      /*
       * Record the fact that Vigil chose to resume
       * this orchestration after process restart.
       */
      await recordOrchestrationDecision({
        orchestrationId:
          orchestration.id,

        type:
          "RECOVERY_RESUMED",

        reason:
          `Worker restart found orchestration in ${orchestration.status} state.`,

        metadata: {
          recoveredFrom:
            orchestration.status,
        },
      });

      await recoverOne(
        orchestration
      );

      console.log(
        `[Orchestration Recovery] Recovered ${orchestration.id}`
      );
    } catch (
      error
    ) {
      console.error(
        `[Orchestration Recovery] Failed to recover ${orchestration.id}`,
        error
      );

      /*
       * A stale/corrupt orchestration should never
       * stop the worker from starting.
       */
    }
  }

  console.log(
    "[Orchestration Recovery] Startup recovery complete"
  );
}