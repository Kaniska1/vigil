import { AgentsClient } from "./agents.js";
import { VigilHttpClient } from "./http-client.js";
import { OrchestrationsClient } from "./orchestrations.js";
import { RunsClient } from "./runs.js";
import type { VigilClientOptions } from "./types.js";
import {
  MetricsClient,
} from "./metrics.js";

const DEFAULT_BASE_URL =
  "http://localhost:4000";

export class Vigil {
  readonly agents;
  readonly runs;
  readonly orchestrations;
  readonly metrics:
  MetricsClient;

  constructor(
    options: VigilClientOptions
  ) {
    const fetchImpl =
      options.fetch ??
      globalThis.fetch;

    if (!fetchImpl) {
      throw new Error(
        "A fetch implementation is required"
      );
    }

    const http =
      new VigilHttpClient({
        apiKey:
          options.apiKey,

        baseUrl:
          options.baseUrl ??
          DEFAULT_BASE_URL,

        fetchImpl,
      });

    this.agents =
      new AgentsClient(http);

    this.runs =
      new RunsClient(http);

    this.orchestrations =
      new OrchestrationsClient(
        http
      );

      this.metrics =
  new MetricsClient(
    http
  );
  }
}
