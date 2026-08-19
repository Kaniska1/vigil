import type {
  Request,
  Response,
} from "express";

import prisma from "../lib/prisma.js";

import {
  subscribeToRun,
} from "../runtime/run-event-bus.js";

export async function streamRun(
  req: Request,
  res: Response
) {
  const runId = String(
    req.params.runId
  );

  const run =
    await prisma.run.findUnique({
      where: {
        id: runId,
      },
    });

  if (!run) {
    return res.status(404).json({
      success: false,
      message: "Run not found",
    });
  }

  res.setHeader(
    "Content-Type",
    "text/event-stream"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  res.flushHeaders();

  const send = (
    eventName: string,
    data: unknown
  ) => {
    res.write(
      `event: ${eventName}\n`
    );

    res.write(
      `data: ${JSON.stringify(
        data
      )}\n\n`
    );
  };

  /*
   * First replay everything that already happened.
   *
   * This prevents the browser from missing events that happened
   * between POST /runs and opening the EventSource connection.
   */
  const existingEvents =
    await prisma.traceEvent.findMany({
      where: {
        runId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  for (
    const event of existingEvents
  ) {
    send("trace", event);
  }

  /*
   * If the run already finished before the SSE connection opened,
   * immediately tell the frontend that it is done.
   */
  const latestRun =
    await prisma.run.findUnique({
      where: {
        id: runId,
      },

      select: {
        status: true,
      },
    });

  if (
    latestRun?.status ===
      "SUCCESS" ||
    latestRun?.status === "FAILED"
  ) {
    send("done", {
      runId,
      status: latestRun.status,
    });

    return res.end();
  }

  const unsubscribe =
    subscribeToRun(
      runId,
      (event) => {
        send("trace", event);

        if (
          event.type ===
            "RUN_COMPLETED" ||
          event.type === "ERROR"
        ) {
          send("done", {
            runId,
          });

          unsubscribe();

          res.end();
        }
      }
    );

  req.on("close", () => {
    unsubscribe();
  });
}