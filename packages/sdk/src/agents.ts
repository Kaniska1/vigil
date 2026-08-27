import type { AgentSummary, CreateAgentRunResponse, RunAgentInput } from "./types.js";
import { VigilHttpClient } from "./http-client.js";

export class AgentsClient {
  constructor(private readonly http: VigilHttpClient) {}

  list() {
    return this.http.request<AgentSummary[]>("/api/v1/agents");
  }

  run(slug: string, input: RunAgentInput) {
    return this.http.request<CreateAgentRunResponse>(
      `/api/v1/agents/${encodeURIComponent(slug)}/runs`,
      { method: "POST", body: input }
    );
  }
}
