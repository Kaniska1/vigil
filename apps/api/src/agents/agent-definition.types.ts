import type {
  VigilAgent,
} from "./agent.types.js";

export type AgentRegistryMetadata = {
  slug: string;
  name: string;
  description: string;

  version: string;

  capabilities: string[];
  tools: string[];
  permissions: string[];

  category:
    | string
    | null;
};

export type AgentDefinition = {
  metadata: AgentRegistryMetadata;

  implementation: VigilAgent;
};