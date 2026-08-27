import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  getPublishedAgentsByUser,
  publishRemoteAgent,
} from "../services/agent-publishing.service.js";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

export async function publishAgent(
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

    const body =
      isRecord(req.body)
        ? req.body
        : {};

    const agent =
      await publishRemoteAgent(
        userId,
        {
          slug:
            typeof body.slug ===
            "string"
              ? body.slug
              : "",

          name:
            typeof body.name ===
            "string"
              ? body.name
              : "",

          description:
            typeof body.description ===
            "string"
              ? body.description
              : "",

          version:
            typeof body.version ===
            "string"
              ? body.version
              : "1.0.0",

          capabilities:
            readStringArray(
              body.capabilities
            ),

          permissions:
            readStringArray(
              body.permissions
            ),

          category:
            typeof body.category ===
            "string"
              ? body.category
              : undefined,

          endpointUrl:
            typeof body.endpointUrl ===
            "string"
              ? body.endpointUrl
              : "",

          inputSchema:
            isRecord(
              body.inputSchema
            )
              ? body.inputSchema
              : undefined,

          outputSchema:
            isRecord(
              body.outputSchema
            )
              ? body.outputSchema
              : undefined,
        }
      );

    return res
      .status(201)
      .json({
        success: true,
        data: agent,
      });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AGENT_PUBLISH_FAILED";

    if (
      message ===
      "AGENT_SLUG_ALREADY_EXISTS"
    ) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "An agent with this slug already exists.",
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
        "AGENT_SLUG_INVALID",
        "AGENT_NAME_REQUIRED",
        "AGENT_DESCRIPTION_REQUIRED",
        "AGENT_VERSION_REQUIRED",
        "AGENT_CAPABILITY_REQUIRED",
        "AGENT_ENDPOINT_INVALID",
        "AGENT_ENDPOINT_REQUIRES_HTTPS",
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
      "Failed to publish agent:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to publish agent",
      });
  }
}

export async function getMyPublishedAgents(
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

    const agents =
      await getPublishedAgentsByUser(
        userId
      );

    return res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error(
      "Failed to fetch published agents:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to fetch published agents",
      });
  }
}
