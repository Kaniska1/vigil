import type { Request, Response } from "express";

import { executeAgentRun } from "../services/run.service.js";

export const createRun = async (
  req: Request,
  res: Response
) => {
  try {
    const { slug } = req.params;

    const execution = await executeAgentRun(
      Array.isArray(slug) ? slug[0] : slug,
      req.body ?? {}
    );

    return res.status(201).json({
      success: true,
      data: execution,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "AGENT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "AGENT_IMPLEMENTATION_NOT_FOUND"
    ) {
      return res.status(500).json({
        success: false,
        message: "Agent implementation is unavailable",
      });
    }

    console.error("Agent execution failed:", error);

    return res.status(500).json({
      success: false,
      message: "Agent execution failed",
    });
  }
};