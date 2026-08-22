import type {
  Response,
} from "express";

import prisma from "../lib/prisma.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  subscribeToOrchestration,
} from "../orchestrator/orchestration-event-bus.js";

export async function streamOrchestration(
  req: AuthenticatedRequest,
  res: Response
) {
  const orchestrationId =
    String(
      req.params.orchestrationId
    );

  const userId =
    req.userId;

  if (!userId) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Unauthorized",
      });
  }

  const orchestration =
    await prisma.orchestrationRun.findFirst({
      where: {
        id: orchestrationId,
        userId,
      },
    });

  if (!orchestration) {
    return res
      .status(404)
      .json({
        success: false,
        message:
          "Orchestration not found",
      });
  }

  /*
   * ------------------------------------------------
   * SSE headers
   * ------------------------------------------------
   */

  res.status(200);

  res.setHeader(
    "Content-Type",
    "text/event-stream; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache, no-transform"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  /*
   * Helpful when running behind some
   * reverse proxies such as nginx.
   */
  res.setHeader(
    "X-Accel-Buffering",
    "no"
  );

  res.flushHeaders();

  /*
   * VERY IMPORTANT:
   *
   * Send an actual body chunk immediately.
   *
   * flushHeaders() alone can sometimes leave
   * a proxy waiting before it exposes the
   * upstream response to EventSource.
   */
  res.write(
    ": connected\n\n"
  );

  const send = (
    eventName: string,
    data: unknown
  ) => {
    if (
      res.writableEnded
    ) {
      return;
    }

    res.write(
      `event: ${eventName}\n`
    );

    res.write(
      `data: ${JSON.stringify(
        data
      )}\n\n`
    );
  };

  let closed =
    false;

  let unsubscribe:
    | (() => Promise<void>)
    | null =
    null;

  /*
   * ------------------------------------------------
   * Keepalive
   * ------------------------------------------------
   *
   * Prevent proxies/connections from deciding
   * the stream is idle.
   */

  const heartbeat =
    setInterval(
      () => {
        if (
          !closed &&
          !res.writableEnded
        ) {
          res.write(
            `: heartbeat ${Date.now()}\n\n`
          );
        }
      },
      15_000
    );

  async function cleanup() {
    if (closed) {
      return;
    }

    closed =
      true;

    clearInterval(
      heartbeat
    );

    if (unsubscribe) {
      const unsubscribeNow =
        unsubscribe;

      unsubscribe =
        null;

      try {
        await unsubscribeNow();
      } catch (error) {
        console.error(
          "[Orchestration SSE] Failed to unsubscribe:",
          error
        );
      }
    }
  }

  async function finish(
    status:
      | "SUCCESS"
      | "FAILED"
      | "CANCELLED"
  ) {
    if (
      closed ||
      res.writableEnded
    ) {
      return;
    }

    send(
      "done",
      {
        orchestrationId,
        status,
      }
    );

    /*
     * Give the final SSE frame a tiny amount
     * of time to flush before ending.
     */
    setTimeout(
      () => {
        void cleanup().finally(
          () => {
            if (
              !res.writableEnded
            ) {
              res.end();
            }
          }
        );
      },
      100
    );
  }

  try {
    /*
     * Subscribe BEFORE replaying stored events
     * so events occurring during replay aren't
     * completely missed.
     */
    unsubscribe =
      await subscribeToOrchestration(
        orchestrationId,
        (event) => {
          if (closed) {
            return;
          }

          send(
            "orchestration",
            event
          );

          if (
            event.type ===
            "ORCHESTRATION_COMPLETED"
          ) {
            void finish(
              "SUCCESS"
            );
          }

          if (
            event.type ===
            "ORCHESTRATION_FAILED"
          ) {
            void finish(
              "FAILED"
            );
          }
        }
      );

    /*
     * ------------------------------------------------
     * Replay durable history
     * ------------------------------------------------
     */

    const existingEvents =
      await prisma.orchestrationEvent.findMany({
        where: {
          orchestrationId,
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    for (
      const event of
      existingEvents
    ) {
      if (closed) {
        break;
      }

      send(
        "orchestration",
        event
      );
    }

    /*
     * Re-check persisted status AFTER subscription
     * and replay to protect against a race where the
     * orchestration completed while connecting.
     */
    const latest =
      await prisma.orchestrationRun.findFirst({
        where: {
          id:
            orchestrationId,

          userId,
        },

        select: {
          status: true,
        },
      });

    if (
      latest?.status ===
      "SUCCESS"
    ) {
      await finish(
        "SUCCESS"
      );

      return;
    }

    if (
      latest?.status ===
      "FAILED"
    ) {
      await finish(
        "FAILED"
      );

      return;
    }

    if (
      latest?.status ===
      "CANCELLED"
    ) {
      await finish(
        "CANCELLED"
      );

      return;
    }

    /*
     * Browser disconnected.
     */
    req.on(
      "close",
      () => {
        void cleanup();
      }
    );
  } catch (error) {
    console.error(
      "[Orchestration SSE] Stream setup failed:",
      error
    );

    await cleanup();

    if (
      !res.writableEnded
    ) {
      res.end();
    }
  }
}