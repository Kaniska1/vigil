import type { RunDetails } from "./types.js";
import { VigilHttpClient } from "./http-client.js";

export class RunsClient {
  constructor(private readonly http: VigilHttpClient) {}

  get(runId: string) {
    return this.http.request<RunDetails>(`/api/v1/runs/${encodeURIComponent(runId)}`);
  }
}
