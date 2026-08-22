export type OrchestratorGoalInput = {
  goal: string;

  context?: Record<
    string,
    unknown
  >;
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
};

export type ResolvedPlanStep = {
  capability: string;
  reason: string;
  required: boolean;

  candidates:
    ResolvedAgent[];
};

export type AgentExecutionStep = {
  agent: ResolvedAgent;

  satisfies:
    string[];

  requiredCapabilities:
    string[];

  optionalCapabilities:
    string[];
};

export type OrchestratorPlan = {
  goal: string;

  summary: string;

  steps:
    ResolvedPlanStep[];

  executionSteps:
    AgentExecutionStep[];

  executable: boolean;

  unresolvedCapabilities:
    string[];

  unresolvedOptionalCapabilities:
    string[];
};