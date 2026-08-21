import prisma from "../lib/prisma.js";

import { getAgentImplementation } from "../agents/agent.registry.js";
import type { AgentInput } from "../agents/agent.types.js";

import { createExecutionContext } from "../runtime/create-execution-context.js";

export async function createAgentRun(
  slug: string,
  userId: string
) {
  const agentRecord =
    await prisma.agent.findUnique({
      where: {
        slug,
      },
    });

  if (!agentRecord) {
    throw new Error("AGENT_NOT_FOUND");
  }

  const agentImplementation =
    getAgentImplementation(slug);

  if (!agentImplementation) {
    throw new Error(
      "AGENT_IMPLEMENTATION_NOT_FOUND"
    );
  }

  const run = await prisma.run.create({
    data: {
      agentId: agentRecord.id,
      userId,
      status: "PENDING",
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
    await prisma.agent.findUnique({
      where: {
        slug,
      },
    });

  if (!agentRecord) {
    throw new Error("AGENT_NOT_FOUND");
  }

  const agentImplementation =
    getAgentImplementation(slug);

  if (!agentImplementation) {
    throw new Error(
      "AGENT_IMPLEMENTATION_NOT_FOUND"
    );
  }

  const context =
    createExecutionContext(runId);

  try {
    await prisma.run.update({
      where: {
        id: runId,
      },

      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

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

    await prisma.run.update({
      where: {
        id: runId,
      },

      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        result: JSON.parse(
          JSON.stringify(result)
        ),
      },
    });

    await context.trace(
      "RUN_COMPLETED",
      `${agentRecord.name} execution completed`
    );

    return result;
  } catch (error) {
    await prisma.run.update({
      where: {
        id: runId,
      },

      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });

    await context.trace(
      "ERROR",
      "Agent execution failed",
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown execution error",
      }
    );

    throw error;
  }
}