import type {
  Prisma,
} from "@vigil/db";

import prisma from "../lib/prisma.js";

import {
  isKnownCapability,
} from "../orchestrator/capability-catalog.js";

type JsonObject =
  Record<
    string,
    unknown
  >;

export type PublishRemoteAgentInput = {
  slug: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  permissions: string[];
  category?: string;
  endpointUrl: string;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
};

function normalizeSlug(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function validateSlug(
  slug: string
) {
  /*
   * v1 keeps slugs path-safe because the existing
   * run route is /agents/:slug/runs.
   *
   * Publisher namespaces can be added later with a
   * dedicated slug route that safely supports "/".
   */
  if (
    !/^[a-z0-9][a-z0-9-]*$/.test(
      slug
    )
  ) {
    throw new Error(
      "AGENT_SLUG_INVALID"
    );
  }
}

function validateEndpoint(
  value: string
) {
  let url: URL;

  try {
    url =
      new URL(value);
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

export async function publishRemoteAgent(
  userId: string,
  input:
    PublishRemoteAgentInput
) {
  const slug =
    normalizeSlug(
      input.slug
    );

  validateSlug(
    slug
  );

  const name =
    input.name.trim();

  const description =
    input.description.trim();

  const version =
    input.version.trim();

  if (!name) {
    throw new Error(
      "AGENT_NAME_REQUIRED"
    );
  }

  if (!description) {
    throw new Error(
      "AGENT_DESCRIPTION_REQUIRED"
    );
  }

  if (!version) {
    throw new Error(
      "AGENT_VERSION_REQUIRED"
    );
  }

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

  const endpointUrl =
    validateEndpoint(
      input.endpointUrl
    );

  const existing =
    await prisma.agent.findUnique({
      where: {
        slug,
      },
    });

  if (existing) {
    throw new Error(
      "AGENT_SLUG_ALREADY_EXISTS"
    );
  }

  return prisma.agent.create({
    data: {
      slug,
      name,
      description,
      version,

      capabilities,

      tools: [],

      permissions:
        uniqueStrings(
          input.permissions
        ),

      inputSchema:
        input.inputSchema
          ? (
              JSON.parse(
                JSON.stringify(
                  input.inputSchema
                )
              ) as Prisma.InputJsonValue
            )
          : undefined,

      outputSchema:
        input.outputSchema
          ? (
              JSON.parse(
                JSON.stringify(
                  input.outputSchema
                )
              ) as Prisma.InputJsonValue
            )
          : undefined,

      category:
        input.category
          ?.trim() ||
        null,

      source:
        "REMOTE",

      endpointUrl,

      visibility:
        "PUBLIC",

      creatorId:
        userId,

      isActive:
        true,

      publishedAt:
        new Date(),
    },
  });
}

export async function getPublishedAgentsByUser(
  userId: string
) {
  return prisma.agent.findMany({
    where: {
      creatorId:
        userId,

      source:
        "REMOTE",
    },

    orderBy: {
      createdAt:
        "desc",
    },
  });
}
