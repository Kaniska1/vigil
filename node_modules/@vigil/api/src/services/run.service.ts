import prisma from "../lib/prisma.js";

import {
  resolveAgentImplementation,
} from "./resolve-agent-implementation.service.js";

import type {
  AgentInput,
} from "../agents/agent.types.js";

import {
  createExecutionContext,
} from "../runtime/create-execution-context.js";

import {
  findAgentBySlug,
} from "./agent-registry.service.js";

import {
  markOrchestrationStepFailed,
  markOrchestrationStepRunning,
  markOrchestrationStepSuccess,
} from "../orchestrator/orchestration-state.service.js";

export async function createAgentRun(
  slug: string,
  userId: string
) {
  const agentRecord =
    await findAgentBySlug(
      slug
    );

  if (!agentRecord) {
    throw new Error(
      "AGENT_NOT_FOUND"
    );
  }

  const agentImplementation =
  await resolveAgentImplementation(
    agentRecord
  );

  if (!agentImplementation) {
    throw new Error(
      "AGENT_IMPLEMENTATION_NOT_FOUND"
    );
  }

  const run =
    await prisma.run.create({
      data: {
        agentId:
          agentRecord.id,

        userId,

        status:
          "PENDING",
      },
    });

  return {
    run,
  };
}

export async function executeAgentRun(
  runId: string,
  slug: string,
  input: AgentInput
) {
  const agentRecord =
    await findAgentBySlug(
      slug
    );

  if (!agentRecord) {
    throw new Error(
      "AGENT_NOT_FOUND"
    );
  }

  const agentImplementation =
    await resolveAgentImplementation(
      agentRecord
    );

  if (!agentImplementation) {
    throw new Error(
      "AGENT_IMPLEMENTATION_NOT_FOUND"
    );
  }

  const context =
  createExecutionContext(
    runId,
    agentRecord.permissions
  );

  /*
   * A logical Run may span multiple BullMQ attempts.
   *
   * Therefore this function does NOT decide whether
   * an execution exception means permanent failure.
   *
   * That decision belongs to the worker because the
   * worker knows:
   *
   * - current attempt
   * - maximum attempts
   * - whether an error is unrecoverable
   */
  await prisma.run.update({
    where: {
      id:
        runId,
    },

    data: {
      status:
        "RUNNING",

      /*
       * Preserve the original start time when BullMQ
       * retries the same logical Run.
       */
      startedAt:
        (
          await prisma.run.findUnique({
            where: {
              id:
                runId,
            },

            select: {
              startedAt:
                true,
            },
          })
        )?.startedAt ??
        new Date(),
    },
  });

  await markOrchestrationStepRunning(
    runId
  );

  await context.trace(
    "RUN_STARTED",
    `${agentRecord.name} execution started`
  );

  await context.trace(
    "AGENT_STARTED",
    `${agentRecord.name} started processing`
  );

  const result =
    await agentImplementation.execute(
      input,
      context
    );

  /*
   * Persist final result BEFORE publishing the
   * terminal RUN_COMPLETED event.
   *
   * This guarantees that the frontend can fetch the
   * final result immediately after receiving SSE.
   */
  await prisma.run.update({
    where: {
      id:
        runId,
    },

    data: {
      status:
        "SUCCESS",

      completedAt:
        new Date(),

      result:
        JSON.parse(
          JSON.stringify(
            result
          )
        ),
    },
  });

  await context.trace(
    "RUN_COMPLETED",
    `${agentRecord.name} execution completed`
  );

  await markOrchestrationStepSuccess(
    runId
  );

  return result;
}

export async function failAgentRun(
  runId: string,
  error: unknown,
  metadata?: Record<
    string,
    unknown
  >
) {
  const context =
    createExecutionContext(
      runId
    );

  const message =
    error instanceof Error
      ? error.message
      : typeof error ===
          "string"
        ? error
        : "Unknown execution error";

  /*
   * Avoid publishing duplicate terminal events if
   * the failure handler somehow gets invoked twice.
   */
  const existingRun =
    await prisma.run.findUnique({
      where: {
        id:
          runId,
      },

      select: {
        status:
          true,

        completedAt:
          true,
      },
    });

  if (!existingRun) {
    console.warn(
      `[Run Service] Cannot fail missing run ${runId}`
    );

    return;
  }

  if (
    existingRun.status ===
      "FAILED" &&
    existingRun.completedAt
  ) {
    return;
  }

  /*
   * ERROR is terminal for the run SSE stream.
   *
   * Therefore the durable database state must be
   * updated BEFORE publishing the event.
   */
  await prisma.run.update({
    where: {
      id:
        runId,
    },

    data: {
      status:
        "FAILED",

      completedAt:
        new Date(),
    },
  });

  await context.trace(
    "ERROR",
    "Agent execution failed",
    {
      error:
        message,

      ...metadata,
    }
  );

  /*
   * This transitions the attached orchestration step
   * to FAILED and allows the parent orchestration
   * state service to transition the parent to FAILED.
   *
   * Normal standalone agent runs simply have no
   * orchestration step and are safely ignored there.
   */
  await markOrchestrationStepFailed(
    runId
  );
}