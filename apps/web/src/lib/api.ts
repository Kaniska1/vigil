export type AgentInputField = {
  type:
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "file";

  description?: string;
  required?: boolean;

  acceptedFileTypes?: string[];
  maxFileSizeBytes?: number;
};

export type AgentInputSchema =
  Record<
    string,
    AgentInputField
  >;

export type Agent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;

  capabilities?: string[];
  tools?: string[];
  permissions?: string[];

  inputSchema?: AgentInputSchema;

  outputSchema?: Record<
    string,
    unknown
  >;

  category?: string | null;
  isActive?: boolean;

  createdAt: string;
  updatedAt: string;
};

export type TraceEventType =
  | "RUN_STARTED"
  | "AGENT_STARTED"
  | "TOOL_CALLED"
  | "TOOL_COMPLETED"
  | "LLM_STARTED"
  | "LLM_COMPLETED"
  | "RUN_COMPLETED"
  | "ERROR";

export type TraceEvent = {
  id: string;
  type: TraceEventType;
  message: string;

  metadata: Record<string, unknown> | null;

  runId: string;
  createdAt: string;
};

export type RunStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED";

export type CreateRunResponse = {
  runId: string;
  status: RunStatus;
};

export type RunResult = {
  output?: Record<string, unknown> & {
    review?: string;
    text?: string;
    model?: string;
    runtime?: string;
    usage?: unknown;
  };
};

export type RunAgent = {
  id: string;
  slug: string;
  name: string;
};

export type RunDetails = {
  id: string;

  status: RunStatus;

  agentId: string;

  result: RunResult | null;

  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;

  events: TraceEvent[];

  agent: RunAgent;
};

export type RunSummary = {
  id: string;

  status: RunStatus;

  agentId: string;

  result: RunResult | null;

  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;

  agent: RunAgent;

  _count: {
    events: number;
  };
};

/*
 * ==================================================
 * ORCHESTRATOR PLANNING TYPES
 * ==================================================
 */

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

  type:
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "file";

  description: string;

  acceptedFileTypes?: string[];

  maxFileSizeBytes?: number;

  requiredBy: {
    agentId: string;
    agentSlug: string;
    agentName: string;
  }[];
};

export type OrchestratorPlan = {
  goal: string;

  summary: string;

  /*
   * Capability-level plan generated
   * by the Vigil planner.
   */
  steps: OrchestratorPlanStep[];

  /*
   * Concrete registered agents selected
   * after capability consolidation.
   */
  executionSteps: OrchestratorExecutionStep[];

  executable: boolean;

  /*
   * Missing required capabilities.
   */
  unresolvedCapabilities: string[];

  /*
   * Missing optional capabilities.
   */
  unresolvedOptionalCapabilities: string[];

  /*
   * Required runtime inputs that are missing
   * for the selected concrete agents.
   */
  missingInputs: MissingOrchestrationInput[];
};

export type OrchestrationSettings = {
  semanticEvaluation: boolean;
  maxReplans: number;
};

export type OrchestratorAttachment = {
  name: string;

  type: string;

  size: number;

  kind:
    | "pdf"
    | "docx"
    | "csv";

  text: string;

  truncated: boolean;
};

export type CreateOrchestratorPlanInput = {
  goal: string;

  context?: Record<string, unknown>;

  settings?: OrchestrationSettings;
};

/*
 * ==================================================
 * ORCHESTRATION RUNTIME TYPES
 * ==================================================
 */

export type OrchestrationStatus =
  | "PLANNING"
  | "BLOCKED"
  | "READY"
  | "RUNNING"
  | "EVALUATING"
  | "REPLANNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export type OrchestrationStepStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED";

export type CreateOrchestrationResponse = {
  orchestrationId: string;

  status: OrchestrationStatus;

  plan: OrchestratorPlan;
};

export type ExecuteOrchestrationResponse = {
  orchestrationId: string;

  status: "RUNNING";

  runs: {
    stepId: string;
    runId: string;
  }[];
};

export type OrchestrationStepAgent = {
  id: string;
  slug: string;
  name: string;
  version: string;
};

export type OrchestrationStepRun = {
  id: string;

  status: RunStatus;

  createdAt: string;

  startedAt: string | null;

  completedAt: string | null;
};

export type OrchestrationStepDetails = {
  id: string;

  orchestrationId: string;

  position: number;

  dependsOnPositions: number[];

  input?: Record<string, unknown> | null;

  status: OrchestrationStepStatus;

  satisfies: string[];

  requiredCapabilities: string[];

  optionalCapabilities: string[];

  startedAt: string | null;

  completedAt: string | null;

  agent: OrchestrationStepAgent | null;

  run: OrchestrationStepRun | null;
};

export type OrchestrationDetails = {
  id: string;

  goal: string;

  summary:
    | string
    | null;

  status:
    OrchestrationStatus;

  unresolvedCapabilities:
    string[];

  createdAt:
    string;

  startedAt:
    | string
    | null;

  completedAt:
    | string
    | null;

  steps:
    OrchestrationStepDetails[];

  events:
    OrchestrationEvent[];
};

/*
 * ==================================================
 * RESPONSE PARSING
 * ==================================================
 */

async function readResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const contentType =
    response.headers.get(
      "content-type"
    );

  /*
   * Gives us useful errors when Next or
   * Express accidentally returns HTML
   * instead of JSON.
   */
  if (
    !contentType?.includes(
      "application/json"
    )
  ) {
    const text =
      await response.text();

    console.error(
      "Expected JSON response but received:",
      text
    );

    throw new Error(
      `${fallbackMessage} (${response.status} ${response.statusText})`
    );
  }

  const body =
    await response.json();

  if (!response.ok) {
    throw new Error(
      body.message ??
        fallbackMessage
    );
  }

  return body.data as T;
}

/*
 * ==================================================
 * AGENT EXECUTION
 * ==================================================
 */

export async function runAgent(
  slug: string,
  input: Record<
    string,
    unknown
  >
): Promise<CreateRunResponse> {
  const response =
    await fetch(
      `/api/agents/${encodeURIComponent(
        slug
      )}/runs`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            input
          ),
      }
    );

  return readResponse<CreateRunResponse>(
    response,
    "Failed to create agent run"
  );
}

/*
 * ==================================================
 * INDIVIDUAL RUN
 * ==================================================
 */

export async function getRun(
  runId: string
): Promise<RunDetails> {
  const response =
    await fetch(
      `/api/runs/${encodeURIComponent(
        runId
      )}`,
      {
        cache:
          "no-store",
      }
    );

  return readResponse<RunDetails>(
    response,
    "Failed to fetch run"
  );
}

export function getRunStreamUrl(
  runId: string
): string {
  return `/api/runs/${encodeURIComponent(
    runId
  )}/stream`;
}

/*
 * ==================================================
 * ORCHESTRATOR PLANNING
 * ==================================================
 */

export async function createOrchestratorPlan(
  input: CreateOrchestratorPlanInput
): Promise<CreateOrchestrationResponse> {
  const response =
    await fetch(
      "/api/orchestrator/plan",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            input
          ),
      }
    );

  return readResponse<CreateOrchestrationResponse>(
    response,
    "Failed to create execution plan"
  );
}

/*
 * ==================================================
 * ORCHESTRATION EXECUTION
 * ==================================================
 */

export async function executeOrchestration(
  orchestrationId: string
): Promise<ExecuteOrchestrationResponse> {
  const response =
    await fetch(
      `/api/orchestrator/${encodeURIComponent(
        orchestrationId
      )}/execute`,
      {
        method:
          "POST",
      }
    );

  return readResponse<ExecuteOrchestrationResponse>(
    response,
    "Failed to execute orchestration"
  );
}

/*
 * ==================================================
 * ORCHESTRATION STATE
 * ==================================================
 */

export async function getOrchestrations(
  limit = 50
): Promise<OrchestrationDetails[]> {
  const response =
    await fetch(
      `/api/orchestrator?limit=${encodeURIComponent(
        String(limit)
      )}`,
      {
        cache:
          "no-store",
      }
    );

  return readResponse<OrchestrationDetails[]>(
    response,
    "Failed to fetch orchestrations"
  );
}

export async function getOrchestration(
  orchestrationId: string
): Promise<OrchestrationDetails> {
  const response =
    await fetch(
      `/api/orchestrator/${encodeURIComponent(
        orchestrationId
      )}`,
      {
        cache:
          "no-store",
      }
    );

  return readResponse<OrchestrationDetails>(
    response,
    "Failed to fetch orchestration"
  );
}

export type OrchestrationEventType =
  | "PLAN_CREATED"
  | "AGENT_SELECTED"
  | "ORCHESTRATION_STARTED"
  | "STEP_STARTED"
  | "STEP_COMPLETED"
  | "STEP_FAILED"
  | "ORCHESTRATION_COMPLETED"
  | "ORCHESTRATION_FAILED";

export type OrchestrationEvent = {
  id: string;

  type:
    OrchestrationEventType;

  message: string;

  metadata:
    | Record<string, unknown>
    | null;

  orchestrationId:
    string;

  createdAt:
    string;
};

export function getOrchestrationStreamUrl(
  orchestrationId: string
): string {
  return `/api/orchestrator/${encodeURIComponent(
    orchestrationId
  )}/stream`;
}

export async function extractOrchestratorFile(
  file: File,
): Promise<OrchestratorAttachment> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file,
  );

  const response =
    await fetch(
      "/api/orchestrator/extract-file",
      {
        method: "POST",
        body: formData,
      },
    );

  return readResponse<OrchestratorAttachment>(
    response,
    "Failed to process attachment",
  );
}