import prisma from "../lib/prisma.js";

import { getAgentImplementation } from "../agents/agent.registry.js";
import type { AgentInput } from "../agents/agent.types.js";

export const executeAgentRun = async (
  slug: string,
  input: AgentInput
) => {
  const agentRecord = await prisma.agent.findUnique({
    where: {
      slug,
    },
  });

  if (!agentRecord) {
    throw new Error("AGENT_NOT_FOUND");
  }

  const agentImplementation = getAgentImplementation(slug);

  if (!agentImplementation) {
    throw new Error("AGENT_IMPLEMENTATION_NOT_FOUND");
  }

  const run = await prisma.run.create({
    data: {
      agentId: agentRecord.id,

      status: "RUNNING",

      startedAt: new Date(),

      events: {
        create: {
          type: "RUN_STARTED",
          message: `${agentRecord.name} execution started`,
        },
      },
    },
  });

  try {
    await prisma.traceEvent.create({
      data: {
        runId: run.id,

        type: "AGENT_STARTED",

        message: `${agentRecord.name} started processing`,
      },
    });

    const result = await agentImplementation.execute(input);

    const completedRun = await prisma.run.update({
      where: {
        id: run.id,
      },

      data: {
        status: "SUCCESS",

        completedAt: new Date(),

        events: {
          create: {
            type: "RUN_COMPLETED",

            message: `${agentRecord.name} execution completed`,
          },
        },
      },

      include: {
        events: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return {
      run: completedRun,
      result,
    };
  } catch (error) {
    await prisma.run.update({
      where: {
        id: run.id,
      },

      data: {
        status: "FAILED",

        completedAt: new Date(),

        events: {
          create: {
            type: "ERROR",

            message:
              error instanceof Error
                ? error.message
                : "Unknown agent execution error",
          },
        },
      },
    });

    throw error;
  }
};