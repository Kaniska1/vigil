import type {
  AgentInputSchema,
} from "../agents/agent-definition.types.js";

export type OrchestratorGoalInput = {
  goal: string;

  context?: Record<
    string,
    unknown
  >;

  constraints?: {
    alreadySatisfiedCapabilities?:
      string[];
  };
};

export type PlannedCapability = {
  capability: string;
  reason: string;
  required: boolean;
};

export type OrchestratorGeneratedPlan = {
  summary: string;

  capabilities:
    PlannedCapability[];
};

export type ResolvedAgent = {
  id: string;
  slug: string;
  name: string;
  version: string;

  capabilities:
    string[];

  inputSchema:
    AgentInputSchema;
};

export type ResolvedPlanStep = {
  capability: string;
  reason: string;
  required: boolean;

  providerType:
    | "AGENT"
    | "ACTION";

  action?: string;

  dependsOnCapabilities?:
    string[];

  candidates:
    ResolvedAgent[];
};

type BaseExecutionStep = {
  /*
   * Stable graph-local identity.
   *
   * Other steps depend on this key instead
   * of depending directly on database IDs
   * or array positions.
   */
  key: string;

  /*
   * Graph dependencies expressed using
   * execution-step keys.
   *
   * The persistence layer converts these
   * into dependsOnPositions for the current
   * database representation.
   */
  dependsOnKeys: string[];

  satisfies:
    string[];

  requiredCapabilities:
    string[];

  optionalCapabilities:
    string[];
};

export type AgentExecutionStep =
  BaseExecutionStep & {
    kind: "AGENT";

    agent: ResolvedAgent;
  };

export type ActionExecutionStep =
  BaseExecutionStep & {
    kind: "ACTION";

    action: string;
  };

export type OrchestrationExecutionStep =
  | AgentExecutionStep
  | ActionExecutionStep;

export type OrchestratorPlan = {
  goal: string;

  summary: string;

  steps:
    ResolvedPlanStep[];

  executionSteps:
    OrchestrationExecutionStep[];

  executable: boolean;

  satisfiedByReuse: boolean;
  
  unresolvedCapabilities:
    string[];

  unresolvedOptionalCapabilities:
    string[];

  missingInputs:
    MissingOrchestrationInput[];
};

export type MissingOrchestrationInput = {
  key:
    string;

  type:
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "file";

  description:
    string;

  /*
   * Used only for file inputs.
   *
   * Examples:
   * ["pdf", "docx", "txt"]
   * ["csv", "xlsx"]
   * ["zip"]
   */
  acceptedFileTypes?:
    string[];

  /*
   * Optional upper limit exposed by
   * the agent's input contract.
   */
  maxFileSizeBytes?:
    number;

  requiredBy:
    {
      agentId:
        string;

      agentSlug:
        string;

      agentName:
        string;
    }[];
};