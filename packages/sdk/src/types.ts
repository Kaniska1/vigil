export type RunStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type OrchestrationStatus = "PLANNING" | "BLOCKED" | "READY" | "RUNNING" | "EVALUATING" | "REPLANNING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type AgentSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  version: string;
  capabilities?: string[];
  permissions?: string[];
  category?: string | null;
  isActive?: boolean;
};

export type RunDetails = {
  id: string;
  status: RunStatus;
  agentId: string;
  result: unknown;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  agent?: { id: string; slug: string; name: string };
};

export type OrchestratorCandidateAgent = {
  id: string;
  slug: string;
  name: string;
  version: string;
  capabilities: string[];
};

export type OrchestratorPlanStep = {
  capability: string;
  reason: string;
  required: boolean;
  candidates: OrchestratorCandidateAgent[];
};

export type OrchestratorExecutionStep = {
  agent: OrchestratorCandidateAgent;
  satisfies: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
};

export type MissingOrchestrationInput = {
  key: string;
  type: "string" | "number" | "boolean" | "json" | "file";
  description: string;
  acceptedFileTypes?: string[];
  maxFileSizeBytes?: number;
  requiredBy: { agentId: string; agentSlug: string; agentName: string }[];
};

export type OrchestratorPlan = {
  goal: string;
  summary: string;
  steps: OrchestratorPlanStep[];
  executionSteps: OrchestratorExecutionStep[];
  executable: boolean;
  unresolvedCapabilities: string[];
  unresolvedOptionalCapabilities: string[];
  missingInputs: MissingOrchestrationInput[];
};

export type CreateOrchestrationInput = {
  goal: string;
  context?: Record<string, unknown>;
  settings?: {
    semanticEvaluation?: boolean;
    maxReplans?: number;
    autoExecute?: boolean;
  };
};

export type CreateOrchestrationResponse = {
  orchestrationId: string;
  status: OrchestrationStatus;
  plan: OrchestratorPlan;
};

export type ExecuteOrchestrationResponse = {
  orchestrationId: string;
  status: OrchestrationStatus;
  runs?: { stepId: string; runId: string }[];
};

export type OrchestrationDetails = {
  id: string;
  goal: string;
  summary: string | null;
  status: OrchestrationStatus;
  unresolvedCapabilities?: string[];
  result?: unknown;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  steps?: unknown[];
  events?: unknown[];
};

export type RunAgentInput = Record<string, unknown>;
export type CreateAgentRunResponse = { runId: string; status: RunStatus };

export type VigilClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};


export type WaitForCompletionOptions = {
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};
