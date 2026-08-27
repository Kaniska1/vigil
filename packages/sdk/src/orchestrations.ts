import type {
  CreateOrchestrationInput,
  CreateOrchestrationResponse,
  ExecuteOrchestrationResponse,
  OrchestrationDetails,
} from "./types.js";
import { VigilHttpClient } from "./http-client.js";

export class OrchestrationsClient {
  constructor(private readonly http: VigilHttpClient) {}

  create(input: CreateOrchestrationInput) {
    return this.http.request<CreateOrchestrationResponse>("/api/v1/orchestrator/plan", {
      method: "POST",
      body: input,
    });
  }

  execute(orchestrationId: string) {
    return this.http.request<ExecuteOrchestrationResponse>(
      `/api/v1/orchestrator/${encodeURIComponent(orchestrationId)}/execute`,
      { method: "POST" }
    );
  }

  get(orchestrationId: string) {
    return this.http.request<OrchestrationDetails>(
      `/api/v1/orchestrator/${encodeURIComponent(orchestrationId)}`
    );
  }

  async run(input: CreateOrchestrationInput) {
    const created = await this.create(input);
    if (!created.plan.executable) return { created, execution: null };
    const execution = await this.execute(created.orchestrationId);
    return { created, execution };
  }
}
