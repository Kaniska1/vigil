import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  getUserMetrics,
} from "../services/metrics.service.js";

export async function getMetrics(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId =
      req.userId;

    if (!userId) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            "Unauthorized",
        });
    }

    const requestedDays =
      Number(
        req.query.days ??
          30
      );

    const days =
      Number.isFinite(
        requestedDays
      )
        ? requestedDays
        : 30;

    const metrics =
      await getUserMetrics(
        userId,
        days
      );

    return res.json({
      success:
        true,

      data:
        metrics,
    });
  } catch (error) {
    console.error(
      "Failed to fetch metrics:",
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Failed to fetch metrics",
      });
  }
}