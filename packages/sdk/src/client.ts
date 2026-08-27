import { AgentsClient } from "./agents.js";
import { VigilHttpClient } from "./http-client.js";
import { OrchestrationsClient } from "./orchestrations.js";
import { RunsClient } from "./runs.js";
import type { VigilClientOptions } from "./types.js";

const DEFAULT_BASE_URL = "http://localhost:4000";

export class Vigil {
  readonly agents: AgentsClient;
  readonly runs: RunsClient;
  readonly orchestrations: OrchestrationsClient;

  constructor(options: VigilClientOptions) {
    if (!options.apiKey?.trim()) throw new Error("Vigil API key is required");

    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error("No fetch implementation is available. Use Node.js 18+ or provide options.fetch.");
    }

    const http = new VigilHttpClient(
      options.apiKey,
      options.baseUrl ?? DEFAULT_BASE_URL,
      fetchImpl
    );

    this.agents = new AgentsClient(http);
    this.runs = new RunsClient(http);
    this.orchestrations = new OrchestrationsClient(http);
  }
}
