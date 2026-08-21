export type Agent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
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
  output?: {
    review?: string;
    model?: string;
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

async function readResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      body.message ?? fallbackMessage
    );
  }

  return body.data;
}

export async function runAgent(
  slug: string,
  input: Record<string, unknown>
): Promise<CreateRunResponse> {
  const response = await fetch(
    `/api/agents/${slug}/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  return readResponse<CreateRunResponse>(
    response,
    "Agent execution failed"
  );
}

export async function getRun(
  runId: string
): Promise<RunDetails> {
  const response = await fetch(
    `/api/runs/${runId}`,
    {
      cache: "no-store",
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
  return `/api/runs/${runId}/stream`;
}