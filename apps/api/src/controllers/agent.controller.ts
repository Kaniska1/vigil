import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const getAgents = async (_req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error("Failed to fetch agents:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agents",
    });
  }
};