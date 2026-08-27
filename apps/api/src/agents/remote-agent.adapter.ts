import type {
  AgentExecutionResult,
  AgentInput,
  VigilAgent,
} from "./agent.types.js";

import type {
  ExecutionContext,
} from "../runtime/execution-context.types.js";

const REMOTE_AGENT_TIMEOUT_MS =
  30_000;

const MAX_REMOTE_RESPONSE_BYTES =
  1_000_000;

type RemoteAgentAdapterInput = {
  slug: string;
  name: string;
  version: string;
  endpointUrl: string;
  capabilities: string[];
};

type RemoteAgentResponse = {
  success?: unknown;
  output?: unknown;
  error?: unknown;
};

function assertSafeEndpoint(
  endpointUrl: string
) {
  let url: URL;

  try {
    url =
      new URL(
        endpointUrl
      );
  } catch {
    throw new Error(
      "REMOTE_AGENT_ENDPOINT_INVALID"
    );
  }

  const developmentHost =
    url.hostname ===
      "localhost" ||
    url.hostname ===
      "127.0.0.1";

  if (
    url.protocol !==
      "https:" &&
    !developmentHost
  ) {
    throw new Error(
      "REMOTE_AGENT_ENDPOINT_REQUIRES_HTTPS"
    );
  }

  return url;
}

export function createRemoteAgentAdapter(
  config:
    RemoteAgentAdapterInput
): VigilAgent {
  const endpoint =
    assertSafeEndpoint(
      config.endpointUrl
    );

  return {
    slug:
      config.slug,

    name:
      config.name,

    async execute(
      input: AgentInput,
      context: ExecutionContext
    ): Promise<AgentExecutionResult> {
      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          REMOTE_AGENT_TIMEOUT_MS
        );

      try {
        await context.trace(
          "TOOL_CALLED",
          `Calling remote agent endpoint for ${config.slug}`,
          {
            kind:
              "remote-agent",

            endpoint:
              endpoint.origin,

            agentSlug:
              config.slug,

            version:
              config.version,
          }
        );

        const response =
          await fetch(
            endpoint,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                "user-agent":
                  "Vigil/1.0",
              },

              body:
                JSON.stringify({
                  runId:
                    context.runId,

                  input,

                  context: {
                    requestedCapabilities:
                      config.capabilities,

                    agent: {
                      slug:
                        config.slug,

                      version:
                        config.version,
                    },
                  },
                }),

              signal:
                controller.signal,
            }
          );

        const raw =
          await response.text();

        const size =
          Buffer.byteLength(
            raw,
            "utf8"
          );

        if (
          size >
          MAX_REMOTE_RESPONSE_BYTES
        ) {
          throw new Error(
            "REMOTE_AGENT_RESPONSE_TOO_LARGE"
          );
        }

        let payload:
          RemoteAgentResponse;

        try {
          payload =
            JSON.parse(
              raw
            ) as RemoteAgentResponse;
        } catch {
          throw new Error(
            "REMOTE_AGENT_INVALID_JSON_RESPONSE"
          );
        }

        if (
          !response.ok
        ) {
          const detail =
            typeof payload.error ===
            "string"
              ? payload.error
              : `HTTP ${response.status}`;

          throw new Error(
            `REMOTE_AGENT_HTTP_ERROR:${detail}`
          );
        }

        if (
          payload.success ===
            false
        ) {
          const detail =
            typeof payload.error ===
            "string"
              ? payload.error
              : "Remote agent reported failure";

          throw new Error(
            `REMOTE_AGENT_FAILED:${detail}`
          );
        }

        if (
          !Object.prototype.hasOwnProperty.call(
            payload,
            "output"
          )
        ) {
          throw new Error(
            "REMOTE_AGENT_OUTPUT_REQUIRED"
          );
        }

        await context.trace(
          "TOOL_COMPLETED",
          `Remote agent endpoint completed for ${config.slug}`,
          {
            kind:
              "remote-agent",

            agentSlug:
              config.slug,

            version:
              config.version,

            status:
              response.status,
          }
        );

        return {
          output:
            payload.output,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            "AbortError"
        ) {
          throw new Error(
            "REMOTE_AGENT_TIMEOUT"
          );
        }

        throw error;
      } finally {
        clearTimeout(
          timeout
        );
      }
    },
  };
}
