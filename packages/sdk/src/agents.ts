import type {
  AgentSummary,
  CreateAgentRunResponse,
  PublishedAgent,
  PublishAgentInput,
  RunAgentInput,
  UpdatePublishedAgentInput,
} from "./types.js";

import {
  VigilHttpClient,
} from "./http-client.js";

export class AgentsClient {
  constructor(
    private readonly http:
      VigilHttpClient
  ) {}

  /**
   * List publicly discoverable agents.
   */
  list() {
    return this.http.request<
      AgentSummary[]
    >(
      "/api/v1/agents"
    );
  }

  /**
   * Execute an agent directly.
   */
  run(
    slug: string,
    input: RunAgentInput
  ) {
    return this.http.request<
      CreateAgentRunResponse
    >(
      `/api/v1/agents/${encodeURIComponent(
        slug
      )}/runs`,
      {
        method: "POST",
        body: input,
      }
    );
  }

  /**
   * Publish an externally hosted
   * agent to Vigil.
   */
  publish(
    input: PublishAgentInput
  ) {
    return this.http.request<
      PublishedAgent
    >(
      "/api/v1/agents/publish",
      {
        method: "POST",
        body: input,
      }
    );
  }

  /**
   * List remote agents owned by
   * the authenticated developer.
   */
  mine() {
    return this.http.request<
      PublishedAgent[]
    >(
      "/api/v1/agents/mine"
    );
  }

  /**
   * Fetch one published agent that
   * belongs to the authenticated
   * developer.
   */
  getPublished(
    agentId: string
  ) {
    return this.http.request<
      PublishedAgent
    >(
      `/api/v1/agents/published/${encodeURIComponent(
        agentId
      )}`
    );
  }

  /**
   * Update metadata/configuration for
   * a developer-owned remote agent.
   */
  updatePublished(
    agentId: string,
    input:
      UpdatePublishedAgentInput
  ) {
    return this.http.request<
      PublishedAgent
    >(
      `/api/v1/agents/published/${encodeURIComponent(
        agentId
      )}`,
      {
        method: "PATCH",
        body: input,
      }
    );
  }

  /**
   * Disable a published agent without
   * deleting its history.
   */
  deactivate(
    agentId: string
  ) {
    return this.updatePublished(
      agentId,
      {
        isActive: false,
      }
    );
  }

  /**
   * Re-enable a previously disabled
   * published agent.
   */
  activate(
    agentId: string
  ) {
    return this.updatePublished(
      agentId,
      {
        isActive: true,
      }
    );
  }
}