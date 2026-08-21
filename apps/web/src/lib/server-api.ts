import "server-only";

import { createApiToken } from "@/lib/api-auth";

import type {
  Agent,
  RunDetails,
  RunSummary,
} from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

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

export async function getAgentsServer(): Promise<
  Agent[]
> {
  const response = await fetch(
    `${API_URL}/api/v1/agents`,
    {
      cache: "no-store",
    }
  );

  return readResponse<Agent[]>(
    response,
    "Failed to fetch agents"
  );
}

export async function getRunsServer(
  limit = 50
): Promise<RunSummary[]> {
  const token =
    await createApiToken();

  const response = await fetch(
    `${API_URL}/api/v1/runs?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  return readResponse<RunSummary[]>(
    response,
    "Failed to fetch runs"
  );
}

export async function getRunServer(
  runId: string
): Promise<RunDetails> {
  const token =
    await createApiToken();

  const response = await fetch(
    `${API_URL}/api/v1/runs/${runId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  return readResponse<RunDetails>(
    response,
    "Failed to fetch run"
  );
}