import type {
  VigilAgent,
} from "../agents/agent.types.js";

import {
  getAgentImplementation,
} from "../agents/agent.registry.js";

import {
  createRemoteAgentAdapter,
} from "../agents/remote-agent.adapter.js";

type AgentExecutionRecord = {
  slug: string;
  name: string;
  version: string;
  source: "FIRST_PARTY" | "REMOTE";
  endpointUrl: string | null;
  capabilities: string[];
};

export async function resolveAgentImplementation(
  agent:
    AgentExecutionRecord
): Promise<VigilAgent | undefined> {
  if (
    agent.source ===
    "REMOTE"
  ) {
    if (
      !agent.endpointUrl
    ) {
      throw new Error(
        "REMOTE_AGENT_ENDPOINT_MISSING"
      );
    }

    return createRemoteAgentAdapter({
      slug:
        agent.slug,

      name:
        agent.name,

      version:
        agent.version,

      endpointUrl:
        agent.endpointUrl,

      capabilities:
        agent.capabilities,
    });
  }

  return getAgentImplementation(
    agent.slug
  );
}
