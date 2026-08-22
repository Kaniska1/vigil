import prisma from "../lib/prisma.js";

import {
  getAgentImplementation,
} from "../agents/agent.registry.js";

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
  markOrchestrationStepRunning,
  markOrchestrationStepSuccess,
  markOrchestrationStepFailed,
} from "../orchestrator/orchestration-state.service.js";

export async function createAgentRun(
  slug: string,
  userId: string
) {
  const agentRecord =
  await findAgentBySlug(slug);

  if (!agentRecord) {
    throw new Error(
      "AGENT_NOT_FOUND"
    );
  }

  const agentImplementation =
  await getAgentImplementation(
    slug
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
  await findAgentBySlug(slug);

  if (!agentRecord) {
    throw new Error(
      "AGENT_NOT_FOUND"
    );
  }

  const agentImplementation =
  await getAgentImplementation(
    slug
  );

  if (!agentImplementation) {
    throw new Error(
      "AGENT_IMPLEMENTATION_NOT_FOUND"
    );
  }

  const context =
    createExecutionContext(
      runId
    );

  /*
   * Do NOT mark the run FAILED in this function.
   *
   * BullMQ may retry this execution.
   *
   * The worker decides whether an error belongs
   * to a retryable attempt or the final attempt.
   */
  await prisma.run.update({
    where: {
      id: runId,
    },

    data: {
      status:
        "RUNNING",

      startedAt:
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
   * Persist the result before broadcasting
   * RUN_COMPLETED.
   *
   * That guarantees that when the frontend
   * receives the terminal event and fetches
   * the run, the final result already exists.
   */
  await prisma.run.update({
    where: {
      id: runId,
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
      : "Unknown execution error";

  /*
   * Set FAILED before publishing ERROR.
   *
   * ERROR is considered a terminal event by
   * the SSE layer, so the database must already
   * reflect the final state.
   */
  await prisma.run.update({
    where: {
      id: runId,
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
  await markOrchestrationStepFailed(
  runId
);
}