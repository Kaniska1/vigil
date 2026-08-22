import prisma from "../lib/prisma.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

export async function markOrchestrationStepRunning(
  runId: string
) {
  const step =
    await prisma.orchestrationStep.findUnique({
      where: {
        runId,
      },

      include: {
        agent: true,
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

  await prisma.orchestrationStep.update({
    where: {
      id:
        step.id,
    },

    data: {
      status:
        "RUNNING",

      startedAt:
        new Date(),
    },
  });

  await traceOrchestration(
    step.orchestrationId,
    "STEP_STARTED",
    `${step.agent?.name ?? "Agent"} started`,
    {
      stepId:
        step.id,

      runId,

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,

      position:
        step.position,

      satisfies:
        step.satisfies,
    }
  );
}

export async function markOrchestrationStepSuccess(
  runId: string
) {
  const step =
    await prisma.orchestrationStep.findUnique({
      where: {
        runId,
      },

      include: {
        agent: true,
      },
    });

  if (!step) {
    return;
  }

  await prisma.orchestrationStep.update({
    where: {
      id:
        step.id,
    },

    data: {
      status:
        "SUCCESS",

      completedAt:
        new Date(),
    },
  });

  await traceOrchestration(
    step.orchestrationId,
    "STEP_COMPLETED",
    `${step.agent?.name ?? "Agent"} completed`,
    {
      stepId:
        step.id,

      runId,

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,

      position:
        step.position,
    }
  );

  await refreshOrchestrationStatus(
    step.orchestrationId
  );
}

export async function markOrchestrationStepFailed(
  runId: string
) {
  const step =
    await prisma.orchestrationStep.findUnique({
      where: {
        runId,
      },

      include: {
        agent: true,
      },
    });

  if (!step) {
    return;
  }

  await prisma.orchestrationStep.update({
    where: {
      id:
        step.id,
    },

    data: {
      status:
        "FAILED",

      completedAt:
        new Date(),
    },
  });

  await traceOrchestration(
    step.orchestrationId,
    "STEP_FAILED",
    `${step.agent?.name ?? "Agent"} failed`,
    {
      stepId:
        step.id,

      runId,

      agentId:
        step.agentId,

      agentSlug:
        step.agent?.slug,

      position:
        step.position,
    }
  );

  await refreshOrchestrationStatus(
    step.orchestrationId
  );
}

async function refreshOrchestrationStatus(
  orchestrationId: string
) {
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

  const hasFailed =
    orchestration.steps.some(
      (step: { status: string; }) =>
        step.status ===
        "FAILED"
    );

  if (hasFailed) {
    if (
      orchestration.status !==
      "FAILED"
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

      await traceOrchestration(
        orchestrationId,
        "ORCHESTRATION_FAILED",
        "Orchestration failed because one or more execution steps failed"
      );
    }

    return;
  }

  const allComplete =
    orchestration.steps.length >
      0 &&
    orchestration.steps.every(
      (step: { status: string; }) =>
        step.status ===
          "SUCCESS" ||
        step.status ===
          "SKIPPED"
    );

  if (
    allComplete &&
    orchestration.status !==
      "SUCCESS"
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

    await traceOrchestration(
      orchestrationId,
      "ORCHESTRATION_COMPLETED",
      "Orchestration completed successfully"
    );
  }
}