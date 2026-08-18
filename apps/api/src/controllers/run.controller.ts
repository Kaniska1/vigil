import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const createRun = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };

    const agent = await prisma.agent.findUnique({
      where: {
        slug,
      },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    const run = await prisma.run.create({
      data: {
        agentId: agent.id,
        status: "RUNNING",
        startedAt: new Date(),

        events: {
          create: {
            type: "RUN_STARTED",
            message: `${agent.name} execution started`,
          },
        },
      },

      include: {
        events: true,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await prisma.traceEvent.create({
      data: {
        runId: run.id,
        type: "AGENT_STARTED",
        message: `${agent.name} started processing`,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

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
            message: `${agent.name} execution completed`,
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

    return res.status(201).json({
      success: true,
      data: completedRun,
    });
  } catch (error) {
    console.error("Failed to run agent:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to run agent",
    });
  }
};