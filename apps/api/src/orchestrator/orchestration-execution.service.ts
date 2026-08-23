import prisma from "../lib/prisma.js";

import {
  setOrchestrationMemoryPhase,
} from "./orchestration-memory.service.js";

import {
  scheduleReadyOrchestrationSteps,
} from "./orchestration-scheduler.service.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

type ScheduledRunStep = {
  id: string;

  runId:
    | string
    | null;

  position: number;

  dependsOnPositions:
    number[];
};

export async function executeOrchestration(
  userId: string,
  orchestrationId: string
) {
  const orchestration =
    await prisma.orchestrationRun.findFirst({
      where: {
        id:
          orchestrationId,

        userId,
      },

      include: {
        steps:
          true,
      },
    });

  if (!orchestration) {
    throw new Error(
      "ORCHESTRATION_NOT_FOUND"
    );
  }

  if (
    orchestration.status ===
    "BLOCKED"
  ) {
    throw new Error(
      "ORCHESTRATION_BLOCKED"
    );
  }

  if (
    orchestration.status !==
    "READY"
  ) {
    throw new Error(
      "ORCHESTRATION_NOT_READY"
    );
  }

  if (
    orchestration.steps.length ===
    0
  ) {
    throw new Error(
      "ORCHESTRATION_HAS_NO_STEPS"
    );
  }

  await prisma.orchestrationRun.update({
    where: {
      id:
        orchestration.id,
    },

    data: {
      status:
        "RUNNING",

      startedAt:
        new Date(),

      completedAt:
        null,
    },
  });

  await setOrchestrationMemoryPhase(
    orchestration.id,
    "EXECUTING"
  );

  await traceOrchestration(
    orchestration.id,
    "ORCHESTRATION_STARTED",
    "Vigil started orchestration execution",
    {
      stepCount:
        orchestration.steps.length,
    }
  );

  try {
    /*
     * This now schedules only steps whose
     * dependencies have been satisfied.
     */
    await scheduleReadyOrchestrationSteps(
      orchestration.id
    );

    const latest =
      await prisma.orchestrationRun.findUnique({
        where: {
          id:
            orchestration.id,
        },

        include: {
          steps: {
            select: {
              id:
                true,

              runId:
                true,

              position:
                true,

              dependsOnPositions:
                true,
            },
          },
        },
      });

    const scheduledSteps:
      ScheduledRunStep[] =
      (latest?.steps ??
        []) as ScheduledRunStep[];

    /*
     * flatMap avoids the slightly awkward
     * type-predicate inference we had before.
     */
    const runs =
      scheduledSteps.flatMap(
        (
          step:
            ScheduledRunStep
        ) => {
          if (!step.runId) {
            return [];
          }

          return [
            {
              stepId:
                step.id,

              runId:
                step.runId,

              position:
                step.position,
            },
          ];
        }
      );

    return {
      orchestrationId:
        orchestration.id,

      status:
        "RUNNING" as const,

      runs,
    };
  } catch (error) {
    await prisma.orchestrationRun.update({
      where: {
        id:
          orchestration.id,
      },

      data: {
        status:
          "FAILED",

        completedAt:
          new Date(),
      },
    });

    await traceOrchestration(
      orchestration.id,
      "ORCHESTRATION_FAILED",
      "Vigil failed while scheduling orchestration execution",
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Unknown scheduling error",
      }
    );

    throw error;
  }
}