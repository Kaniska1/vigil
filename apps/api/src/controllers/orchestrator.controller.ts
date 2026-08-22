import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  createPersistentOrchestration,
  getUserOrchestration,
  getUserOrchestrations,
} from "../orchestrator/orchestration.service.js";

import {
  executeOrchestration,
} from "../orchestrator/orchestration-execution.service.js";

export async function planGoal(
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
          success: false,
          message:
            "Unauthorized",
        });
    }

    const goal =
      typeof req.body
        ?.goal ===
      "string"
        ? req.body.goal
        : "";

    const context =
      typeof req.body
        ?.context ===
        "object" &&
      req.body.context !==
        null &&
      !Array.isArray(
        req.body.context
      )
        ? req.body.context
        : undefined;

    if (!goal.trim()) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Goal is required",
        });
    }

    const result =
      await createPersistentOrchestration(
        userId,
        {
          goal,
          context,
        }
      );

    return res
      .status(201)
      .json({
        success: true,

        data: {
          orchestrationId:
            result.orchestration.id,

          status:
            result.orchestration.status,

          plan:
            result.plan,
        },
      });
  } catch (error) {
    console.error(
      "Failed to create orchestrator plan:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to create execution plan",
      });
  }
}

export async function listOrchestrations(
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
          success: false,
          message:
            "Unauthorized",
        });
    }

    const rawLimit =
      Number(
        req.query.limit
      );

    const limit =
      Number.isInteger(
        rawLimit
      ) &&
      rawLimit > 0 &&
      rawLimit <= 100
        ? rawLimit
        : 50;

    const orchestrations =
      await getUserOrchestrations(
        userId,
        limit
      );

    return res.json({
      success: true,
      data:
        orchestrations,
    });
  } catch (error) {
    console.error(
      "Failed to list orchestrations:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to list orchestrations",
      });
  }
}

export async function getOrchestration(
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
          success: false,
          message:
            "Unauthorized",
        });
    }

    const orchestrationId =
      String(
        req.params
          .orchestrationId
      );

    const orchestration =
      await getUserOrchestration(
        userId,
        orchestrationId
      );

    if (!orchestration) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Orchestration not found",
        });
    }

    return res.json({
      success: true,
      data:
        orchestration,
    });
  } catch (error) {
    console.error(
      "Failed to get orchestration:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to get orchestration",
      });
  }
}

export async function startOrchestration(
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
          success: false,
          message:
            "Unauthorized",
        });
    }

    const orchestrationId =
      String(
        req.params
          .orchestrationId
      );

    const result =
      await executeOrchestration(
        userId,
        orchestrationId
      );

    return res
      .status(202)
      .json({
        success: true,
        data:
          result,
      });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "ORCHESTRATION_NOT_FOUND"
    ) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Orchestration not found",
        });
    }

    if (
      message ===
      "ORCHESTRATION_BLOCKED"
    ) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "This orchestration is blocked by missing required capabilities",
        });
    }

    if (
      message ===
      "ORCHESTRATION_NOT_READY"
    ) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Orchestration is not ready for execution",
        });
    }

    console.error(
      "Failed to execute orchestration:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to execute orchestration",
      });
  }
}