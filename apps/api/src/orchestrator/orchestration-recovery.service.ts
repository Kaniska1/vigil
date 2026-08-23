import prisma from "../lib/prisma.js";

import {
  getOrchestrationMemory,
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
   * The evaluation that requested replanning
   * is the canonical reason for resuming it.
   */
  const evaluation =
    [...memory.evaluations]
      .reverse()
      .find(
        (item) =>
          item.shouldReplan
      );

  if (evaluation) {
    return evaluation.reason;
  }

  /*
   * Fallback for the narrow case where a
   * replan record exists but evaluation
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
   * BullMQ already persists jobs in Redis.
   *
   * We do NOT recreate Runs or requeue steps
   * that already have runIds here.
   *
   * The scheduler only claims still-pending,
   * unscheduled graph nodes.
   */
  await scheduleReadyOrchestrationSteps(
    orchestrationId
  );

  /*
   * The orchestration may have died after the
   * final worker state mutation but before the
   * evaluation boundary was entered.
   *
   * Re-check whether execution has settled.
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
     * REPLANNING without a persisted reason is
     * not safe to guess about.
     *
     * Leave it visible rather than fabricating
     * planner context.
     */
    throw new Error(
      "ORCHESTRATION_REPLAN_REASON_MISSING"
    );
  }

  /*
   * This may make an LLM call, but only because
   * the orchestration was already in the middle
   * of a requested replan before the restart.
   *
   * A normal restart does not trigger planning.
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
   * Sequential recovery is intentional.
   *
   * Startup recovery is rare, and doing this
   * sequentially avoids creating a sudden burst
   * of planner/queue/database work after restart.
   */
  for (
  const orchestration of
  recoverable
) {
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
  }
}}