import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  getPublishedAgentForOwner,
  updatePublishedAgent,
} from "../services/agent-management.service.js";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function readStringArray(
  value: unknown
):
  | string[]
  | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    throw new Error(
      "INVALID_STRING_ARRAY"
    );
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
      "string"
  );
}

function mapError(
  error: unknown,
  res: Response
) {
  const message =
    error instanceof
      Error
      ? error.message
      : "AGENT_UPDATE_FAILED";

  if (
    message ===
    "PUBLISHED_AGENT_NOT_FOUND"
  ) {
    return res
      .status(404)
      .json({
        success: false,
        message:
          "Published agent not found",
      });
  }

  if (
    message.startsWith(
      "AGENT_UNKNOWN_CAPABILITIES:"
    )
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "One or more capabilities are not part of Vigil's canonical capability catalog.",
        unknownCapabilities:
          message
            .split(":")[1]
            ?.split(",") ??
          [],
      });
  }

  const clientErrors =
    new Set([
      "AGENT_NAME_REQUIRED",
      "AGENT_DESCRIPTION_REQUIRED",
      "AGENT_VERSION_REQUIRED",
      "AGENT_CAPABILITY_REQUIRED",
      "AGENT_ENDPOINT_INVALID",
      "AGENT_ENDPOINT_REQUIRES_HTTPS",
      "INVALID_STRING_ARRAY",
    ]);

  if (
    clientErrors.has(
      message
    )
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message,
      });
  }

  console.error(
    "Failed to manage published agent:",
    error
  );

  return res
    .status(500)
    .json({
      success: false,
      message:
        "Failed to update published agent",
    });
}

export async function getPublishedAgent(
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

    const agentId =
      String(
        req.params.agentId
      );

    const agent =
      await getPublishedAgentForOwner(
        userId,
        agentId
      );

    if (!agent) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Published agent not found",
        });
    }

    return res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    return mapError(
      error,
      res
    );
  }
}

export async function patchPublishedAgent(
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

    const agentId =
      String(
        req.params.agentId
      );

    const body =
      isRecord(
        req.body
      )
        ? req.body
        : {};

    const inputSchema =
      body.inputSchema ===
        null
        ? null
        : isRecord(
              body.inputSchema
            )
          ? body.inputSchema
          : undefined;

    const outputSchema =
      body.outputSchema ===
        null
        ? null
        : isRecord(
              body.outputSchema
            )
          ? body.outputSchema
          : undefined;

    const agent =
      await updatePublishedAgent(
        userId,
        agentId,
        {
          name:
            typeof body.name ===
            "string"
              ? body.name
              : undefined,

          description:
            typeof body.description ===
            "string"
              ? body.description
              : undefined,

          version:
            typeof body.version ===
            "string"
              ? body.version
              : undefined,

          capabilities:
            readStringArray(
              body.capabilities
            ),

          permissions:
            readStringArray(
              body.permissions
            ),

          category:
            body.category ===
              null
              ? null
              : typeof body.category ===
                  "string"
                ? body.category
                : undefined,

          endpointUrl:
            typeof body.endpointUrl ===
            "string"
              ? body.endpointUrl
              : undefined,

          inputSchema,

          outputSchema,

          isActive:
            typeof body.isActive ===
            "boolean"
              ? body.isActive
              : undefined,
        }
      );

    return res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    return mapError(
      error,
      res
    );
  }
}
