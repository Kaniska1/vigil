import http from "node:http";

const PORT =
  Number(
    process.env.PORT ??
      5001
  );

function sendJson(
  res,
  status,
  body
) {
  const payload =
    JSON.stringify(
      body
    );

  res.writeHead(
    status,
    {
      "content-type":
        "application/json",

      "content-length":
        Buffer.byteLength(
          payload
        ),
    }
  );

  res.end(
    payload
  );
}

const server =
  http.createServer(
    async (
      req,
      res
    ) => {
      if (
        req.method ===
          "GET" &&
        req.url ===
          "/health"
      ) {
        return sendJson(
          res,
          200,
          {
            success: true,
            service:
              "vigil-mock-remote-agent",
          }
        );
      }

      if (
        req.method !==
          "POST" ||
        req.url !==
          "/v1/execute"
      ) {
        return sendJson(
          res,
          404,
          {
            success: false,
            error:
              "Not found",
          }
        );
      }

      const chunks =
        [];

      for await (
        const chunk of req
      ) {
        chunks.push(
          chunk
        );
      }

      let body;

      try {
        body =
          JSON.parse(
            Buffer.concat(
              chunks
            ).toString(
              "utf8"
            )
          );
      } catch {
        return sendJson(
          res,
          400,
          {
            success: false,
            error:
              "Invalid JSON",
          }
        );
      }

      const query =
        typeof body?.input
          ?.query ===
        "string"
          ? body.input.query
          : "";

      if (!query.trim()) {
        return sendJson(
          res,
          400,
          {
            success: false,
            error:
              "input.query is required",
          }
        );
      }

      console.log(
        "[Mock Remote Agent] Received run",
        {
          runId:
            body.runId,

          query,

          requestedCapabilities:
            body?.context
              ?.requestedCapabilities ??
            [],
        }
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            350
          )
      );

      return sendJson(
        res,
        200,
        {
          success: true,

          output: {
            summary:
              `Mock research completed for: ${query}`,

            findings: [
              {
                title:
                  "Remote agent execution works",
                detail:
                  "Vigil successfully invoked an externally hosted agent through the standardized execution contract.",
              },

              {
                title:
                  "Input forwarding works",
                detail:
                  `The remote worker received the query "${query}".`,
              },

              {
                title:
                  "Capability context works",
                detail:
                  `Requested capabilities: ${
                    (
                      body?.context
                        ?.requestedCapabilities ??
                      []
                    ).join(
                      ", "
                    ) ||
                    "none"
                  }.`,
              },
            ],

            runtime:
              "mock-node-http",
          },
        }
      );
    }
  );

server.listen(
  PORT,
  "127.0.0.1",
  () => {
    console.log(
      `[Mock Remote Agent] listening on http://127.0.0.1:${PORT}`
    );

    console.log(
      `[Mock Remote Agent] execute endpoint: http://127.0.0.1:${PORT}/v1/execute`
    );
  }
);
