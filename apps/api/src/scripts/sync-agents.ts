import type {
  Prisma,
} from "@vigil/db";

import prisma from "../lib/prisma.js";

import {
  getAgentDefinitions,
} from "../agents/agent.registry.js";

function toJsonValue(
  value: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonValue;
}

async function syncBuiltInAgents() {
  const definitions =
    await getAgentDefinitions();

  console.log(
    `[Vigil Registry] Syncing ${definitions.length} built-in agent(s)...`
  );

  for (
    const definition of
    definitions
  ) {
    const {
      metadata,
    } = definition;

    const inputSchema =
      metadata.inputSchema
        ? toJsonValue(
            metadata.inputSchema
          )
        : undefined;

    const outputSchema =
      metadata.outputSchema
        ? toJsonValue(
            metadata.outputSchema
          )
        : undefined;

    await prisma.agent.upsert({
      where: {
        slug:
          metadata.slug,
      },

      update: {
        name:
          metadata.name,

        description:
          metadata.description,

        version:
          metadata.version,

        capabilities:
          metadata.capabilities,

        tools:
          metadata.tools,

        permissions:
          metadata.permissions,

        category:
          metadata.category,

        ...(inputSchema
          ? {
              inputSchema,
            }
          : {}),

        ...(outputSchema
          ? {
              outputSchema,
            }
          : {}),

        isActive:
          true,
      },

      create: {
        slug:
          metadata.slug,

        name:
          metadata.name,

        description:
          metadata.description,

        version:
          metadata.version,

        capabilities:
          metadata.capabilities,

        tools:
          metadata.tools,

        permissions:
          metadata.permissions,

        category:
          metadata.category,

        ...(inputSchema
          ? {
              inputSchema,
            }
          : {}),

        ...(outputSchema
          ? {
              outputSchema,
            }
          : {}),

        isActive:
          true,
      },
    });

    console.log(
      `[Vigil Registry] Synced ${metadata.slug}@${metadata.version}`
    );
  }

  console.log(
    "[Vigil Registry] Sync complete"
  );
}

syncBuiltInAgents()
  .catch(
    (error) => {
      console.error(
        "[Vigil Registry] Sync failed:",
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    }
  );