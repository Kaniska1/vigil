import type {
  Prisma,
} from "@vigil/db";

import prisma from "../lib/prisma.js";

export type AgentDiscoveryFilters = {
  capability?: string;
  tool?: string;
  permission?: string;
  category?: string;
  search?: string;
};

export async function discoverAgents(
  filters: AgentDiscoveryFilters = {}
) {
  const {
    capability,
    tool,
    permission,
    category,
    search,
  } = filters;

  const where:
    Prisma.AgentWhereInput = {
      isActive:
        true,
    };

  if (capability) {
    where.capabilities = {
      has:
        capability,
    };
  }

  if (tool) {
    where.tools = {
      has:
        tool,
    };
  }

  if (permission) {
    where.permissions = {
      has:
        permission,
    };
  }

  if (category) {
    where.category =
      category;
  }

  if (search) {
    const normalizedSearch =
      search.trim();

    if (normalizedSearch) {
      where.OR = [
        {
          name: {
            contains:
              normalizedSearch,

            mode:
              "insensitive",
          },
        },

        {
          slug: {
            contains:
              normalizedSearch,

            mode:
              "insensitive",
          },
        },

        {
          description: {
            contains:
              normalizedSearch,

            mode:
              "insensitive",
          },
        },
      ];
    }
  }

  /*
   * --------------------------------------------------
   * Discovery diagnostics
   * --------------------------------------------------
   *
   * The orchestrator resolves capabilities through
   * this DB-backed registry.
   *
   * Logging the requested capability makes stale
   * registry metadata immediately visible.
   */
  if (capability) {
    console.log(
      `[Agent Discovery] Looking for capability: ${capability}`
    );
  }

  const agents =
    await prisma.agent.findMany({
      where,

      orderBy: {
        createdAt:
          "desc",
      },
    });

  /*
   * Only expose useful discovery metadata here.
   *
   * Do not dump complete agent rows or schemas into
   * normal logs.
   */
  console.log(
    `[Agent Discovery] Found ${agents.length} matching agent(s)`,
    agents.map(
      (agent) => ({
        slug:
          agent.slug,

        version:
          agent.version,

        capabilities:
          agent.capabilities,
      })
    )
  );

  return agents;
}

export async function findAgentBySlug(
  slug: string
) {
  return prisma.agent.findFirst({
    where: {
      slug,

      isActive:
        true,
    },
  });
}

export async function findAgentsByCapabilities(
  capabilities: string[]
) {
  if (
    capabilities.length ===
    0
  ) {
    return [];
  }

  return prisma.agent.findMany({
    where: {
      isActive:
        true,

      capabilities: {
        hasSome:
          capabilities,
      },
    },

    orderBy: {
      createdAt:
        "desc",
    },
  });
}

export async function findAgentsWithAllCapabilities(
  capabilities: string[]
) {
  if (
    capabilities.length ===
    0
  ) {
    return [];
  }

  return prisma.agent.findMany({
    where: {
      isActive:
        true,

      AND:
        capabilities.map(
          (
            capability
          ) => ({
            capabilities: {
              has:
                capability,
            },
          })
        ),
    },

    orderBy: {
      createdAt:
        "desc",
    },
  });
}