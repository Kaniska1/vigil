import type {
  Response,
} from "express";

import prisma from "../lib/prisma.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  subscribeToRun,
} from "../runtime/run-event-bus.js";

export async function streamRun(
  req: AuthenticatedRequest,
  res: Response
) {
  const runId = String(
    req.params.runId
  );

  const userId =
    req.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  /*
   * Ownership is checked directly in the database query.
   * If the run belongs to somebody else, treat it as not found.
   */
  const run =
    await prisma.run.findFirst({
      where: {
        id: runId,
        userId,
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
   * Replay existing persisted events first.
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
    send(
      "trace",
      event
    );
  }

  /*
   * If the run completed before this SSE connection opened,
   * immediately send a done event.
   */
  const latestRun =
    await prisma.run.findFirst({
      where: {
        id: runId,
        userId,
      },

      select: {
        status: true,
      },
    });

  if (
    latestRun?.status ===
      "SUCCESS" ||
    latestRun?.status ===
      "FAILED"
  ) {
    send(
      "done",
      {
        runId,
        status:
          latestRun.status,
      }
    );

    return res.end();
  }

  const unsubscribe =
    subscribeToRun(
      runId,
      (event) => {
        send(
          "trace",
          event
        );

        if (
          event.type ===
            "RUN_COMPLETED" ||
          event.type ===
            "ERROR"
        ) {
          send(
            "done",
            {
              runId,
            }
          );

          unsubscribe();

          res.end();
        }
      }
    );

  req.on(
    "close",
    () => {
      unsubscribe();
    }
  );
}