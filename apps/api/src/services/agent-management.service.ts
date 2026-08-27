import type {
  Prisma,
} from "@vigil/db";

import prisma from "../lib/prisma.js";

import {
  isKnownCapability,
} from "../orchestrator/capability-catalog.js";

type JsonObject =
  Record<string, unknown>;

export type UpdatePublishedAgentInput = {
  name?: string;
  description?: string;
  version?: string;
  capabilities?: string[];
  permissions?: string[];
  category?: string | null;
  endpointUrl?: string;
  inputSchema?: JsonObject | null;
  outputSchema?: JsonObject | null;
  isActive?: boolean;
};

function uniqueStrings(
  values: string[]
) {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean)
    ),
  ];
}

function validateEndpoint(
  value: string
) {
  let url: URL;

  try {
    url =
      new URL(
        value
      );
  } catch {
    throw new Error(
      "AGENT_ENDPOINT_INVALID"
    );
  }

  const developmentHost =
    url.hostname ===
      "localhost" ||
    url.hostname ===
      "127.0.0.1";

  if (
    url.protocol !==
      "https:" &&
    !developmentHost
  ) {
    throw new Error(
      "AGENT_ENDPOINT_REQUIRES_HTTPS"
    );
  }

  return url.toString();
}

export async function getPublishedAgentForOwner(
  userId: string,
  agentId: string
) {
  return prisma.agent.findFirst({
    where: {
      id:
        agentId,

      creatorId:
        userId,

      source:
        "REMOTE",
    },
  });
}

export async function updatePublishedAgent(
  userId: string,
  agentId: string,
  input:
    UpdatePublishedAgentInput
) {
  const existing =
    await getPublishedAgentForOwner(
      userId,
      agentId
    );

  if (!existing) {
    throw new Error(
      "PUBLISHED_AGENT_NOT_FOUND"
    );
  }

  const data:
    Prisma.AgentUpdateInput =
    {};

  if (
    input.name !==
    undefined
  ) {
    const name =
      input.name.trim();

    if (!name) {
      throw new Error(
        "AGENT_NAME_REQUIRED"
      );
    }

    data.name =
      name;
  }

  if (
    input.description !==
    undefined
  ) {
    const description =
      input.description.trim();

    if (!description) {
      throw new Error(
        "AGENT_DESCRIPTION_REQUIRED"
      );
    }

    data.description =
      description;
  }

  if (
    input.version !==
    undefined
  ) {
    const version =
      input.version.trim();

    if (!version) {
      throw new Error(
        "AGENT_VERSION_REQUIRED"
      );
    }

    data.version =
      version;
  }

  if (
    input.capabilities !==
    undefined
  ) {
    const capabilities =
      uniqueStrings(
        input.capabilities
      );

    if (
      capabilities.length ===
      0
    ) {
      throw new Error(
        "AGENT_CAPABILITY_REQUIRED"
      );
    }

    const unknownCapabilities =
      capabilities.filter(
        (capability) =>
          !isKnownCapability(
            capability
          )
      );

    if (
      unknownCapabilities.length >
      0
    ) {
      throw new Error(
        `AGENT_UNKNOWN_CAPABILITIES:${unknownCapabilities.join(",")}`
      );
    }

    data.capabilities =
      capabilities;
  }

  if (
    input.permissions !==
    undefined
  ) {
    data.permissions =
      uniqueStrings(
        input.permissions
      );
  }

  if (
    input.category !==
    undefined
  ) {
    data.category =
      input.category
        ?.trim() ||
      null;
  }

  if (
    input.endpointUrl !==
    undefined
  ) {
    data.endpointUrl =
      validateEndpoint(
        input.endpointUrl
      );
  }

  if (
    input.inputSchema !==
      undefined &&
    input.inputSchema !==
      null
  ) {
    data.inputSchema =
      JSON.parse(
        JSON.stringify(
          input.inputSchema
        )
      ) as Prisma.InputJsonValue;
  }

  if (
    input.outputSchema !==
      undefined &&
    input.outputSchema !==
      null
  ) {
    data.outputSchema =
      JSON.parse(
        JSON.stringify(
          input.outputSchema
        )
      ) as Prisma.InputJsonValue;
  }

  if (
    input.isActive !==
    undefined
  ) {
    data.isActive =
      input.isActive;
  }

  return prisma.agent.update({
    where: {
      id:
        existing.id,
    },

    data,
  });
}
