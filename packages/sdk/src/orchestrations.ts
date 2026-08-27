import type {
  CreateOrchestrationInput,
  CreateOrchestrationResponse,
  ExecuteOrchestrationResponse,
  OrchestrationDetails,
  OrchestrationStreamEvent,
  StreamOptions,
  WaitForCompletionOptions,
} from "./types.js";

import {
  VigilHttpClient,
} from "./http-client.js";

export class OrchestrationsClient {
  constructor(
    private readonly http:
      VigilHttpClient
  ) {}

  create(
    input: CreateOrchestrationInput
  ) {
    return this.http.request<
      CreateOrchestrationResponse
    >(
      "/api/v1/orchestrator/plan",
      {
        method: "POST",
        body: input,
      }
    );
  }

  execute(
    orchestrationId: string
  ) {
    return this.http.request<
      ExecuteOrchestrationResponse
    >(
      `/api/v1/orchestrator/${encodeURIComponent(
        orchestrationId
      )}/execute`,
      {
        method: "POST",
      }
    );
  }

  get(
    orchestrationId: string
  ) {
    return this.http.request<
      OrchestrationDetails
    >(
      `/api/v1/orchestrator/${encodeURIComponent(
        orchestrationId
      )}`
    );
  }

  async waitForCompletion(
    orchestrationId: string,
    options: WaitForCompletionOptions = {}
  ) {
    const pollIntervalMs =
      options.pollIntervalMs ??
      1000;

    const timeoutMs =
      options.timeoutMs ??
      120000;

    const terminalStatuses =
      new Set([
        "SUCCESS",
        "FAILED",
        "CANCELLED",
      ]);

    const startedAt =
      Date.now();

    while (true) {
      if (options.signal?.aborted) {
        throw new Error(
          "Waiting for orchestration was aborted"
        );
      }

      const current =
        await this.get(
          orchestrationId
        );

      if (
        terminalStatuses.has(
          current.status
        )
      ) {
        return current;
      }

      if (
        Date.now() -
          startedAt >=
        timeoutMs
      ) {
        throw new Error(
          `Timed out waiting for orchestration ${orchestrationId}`
        );
      }

      await new Promise<void>(
        (resolve, reject) => {
          const timer =
            setTimeout(
              resolve,
              pollIntervalMs
            );

          if (options.signal) {
            const onAbort =
              () => {
                clearTimeout(timer);
                reject(
                  new Error(
                    "Waiting for orchestration was aborted"
                  )
                );
              };

            options.signal.addEventListener(
              "abort",
              onAbort,
              { once: true }
            );
          }
        }
      );
    }
  }

  async *stream(
    orchestrationId: string,
    options: StreamOptions = {}
  ): AsyncGenerator<
    OrchestrationStreamEvent,
    void,
    void
  > {
    const response =
      await this.http.raw(
        `/api/v1/orchestrator/${encodeURIComponent(
          orchestrationId
        )}/stream`,
        {
          headers: {
            Accept:
              "text/event-stream",
          },
          signal:
            options.signal,
        }
      );

    if (!response.body) {
      throw new Error(
        "Vigil orchestration stream returned no response body"
      );
    }

    const reader =
      response.body
        .pipeThrough(
          new TextDecoderStream()
        )
        .getReader();

    let buffer = "";

    try {
      while (true) {
        const {
          value,
          done,
        } =
          await reader.read();

        if (done) {
          break;
        }

        buffer += value;

        while (true) {
          const boundary =
            buffer.indexOf(
              "\n\n"
            );

          if (boundary === -1) {
            break;
          }

          const frame =
            buffer
              .slice(
                0,
                boundary
              )
              .replace(
                /\r/g,
                ""
              );

          buffer =
            buffer.slice(
              boundary + 2
            );

          if (
            !frame ||
            frame.startsWith(":")
          ) {
            continue;
          }

          let eventName =
            "message";

          const dataLines:
            string[] = [];

          for (
            const line of
            frame.split("\n")
          ) {
            if (
              line.startsWith(
                "event:"
              )
            ) {
              eventName =
                line
                  .slice(6)
                  .trim();

              continue;
            }

            if (
              line.startsWith(
                "data:"
              )
            ) {
              dataLines.push(
                line
                  .slice(5)
                  .trimStart()
              );
            }
          }

          if (
            dataLines.length === 0
          ) {
            continue;
          }

          const data =
            JSON.parse(
              dataLines.join("\n")
            );

          if (
            eventName ===
            "orchestration"
          ) {
            yield {
              type:
                "orchestration",
              data,
            };

            continue;
          }

          if (
            eventName === "done"
          ) {
            yield {
              type: "done",
              data,
            };

            return;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async run(
    input: CreateOrchestrationInput
  ) {
    const created =
      await this.create(input);

    if (
      !created.plan.executable
    ) {
      return {
        created,
        execution: null,
      };
    }

    const execution =
      await this.execute(
        created.orchestrationId
      );

    return {
      created,
      execution,
    };
  }
}
