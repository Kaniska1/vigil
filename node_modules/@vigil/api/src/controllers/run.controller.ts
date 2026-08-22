import type {
  Response,
} from "express";

import prisma from "../lib/prisma.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  createAgentRun,
  executeAgentRun,
} from "../services/run.service.js";

import {
  runQueue,
} from "../queue/run.queue.js";

export const createRun = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const slug = String(
      req.params.slug
    );

    const userId =
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { run } =
      await createAgentRun(
        slug,
        userId
      );

    await runQueue.add(
  "execute-agent-run",
  {
    runId: run.id,
    slug,
    input:
      req.body ?? {},
  },
  {
    jobId: run.id,

    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 1000,
    },

    removeOnComplete: {
      age: 60 * 60,
    },

    removeOnFail: {
      age: 24 * 60 * 60,
    },
  }
);

    return res.status(202).json({
      success: true,

      data: {
        runId: run.id,
        status: run.status,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "AGENT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "AGENT_IMPLEMENTATION_NOT_FOUND"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Agent implementation is unavailable",
      });
    }

    console.error(
      "Failed to create agent run:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create agent run",
    });
  }
};

export const listRuns = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId =
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const requestedLimit =
      Number(
        req.query.limit ?? 50
      );

    const limit =
      Number.isInteger(
        requestedLimit
      ) &&
      requestedLimit > 0
        ? Math.min(
            requestedLimit,
            100
          )
        : 50;

    const runs =
      await prisma.run.findMany({
        where: {
          userId,
        },

        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          agent: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },

          _count: {
            select: {
              events: true,
            },
          },
        },
      });

    return res.json({
      success: true,
      data: runs,
    });
  } catch (error) {
    console.error(
      "Failed to list runs:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to list runs",
    });
  }
};

export const getRun = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const runId =
      String(
        req.params.runId
      );

    const userId =
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const run =
      await prisma.run.findFirst({
        where: {
          id: runId,
          userId,
        },

        include: {
          agent: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },

          events: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (!run) {
      return res.status(404).json({
        success: false,
        message: "Run not found",
      });
    }

    return res.json({
      success: true,
      data: run,
    });
  } catch (error) {
    console.error(
      "Failed to fetch run:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch run",
    });
  }
};