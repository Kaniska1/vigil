import prisma from "../lib/prisma.js";

import {
  publishOrchestrationEvent,
} from "./orchestration-event-bus.js";

import type {
  OrchestrationEventType,
} from "@vigil/db";

export async function traceOrchestration(
  orchestrationId: string,
  type: OrchestrationEventType,
  message: string,
  metadata?: Record<
    string,
    unknown
  >
) {
  /*
   * PostgreSQL is the durable trace.
   *
   * This MUST succeed before the event
   * is considered recorded.
   */
  const event =
    await prisma.orchestrationEvent.create({
      data: {
        orchestrationId,

        type,

        message,

        metadata:
          metadata === undefined
            ? undefined
            : JSON.parse(
                JSON.stringify(
                  metadata
                )
              ),
      },
    });

  /*
   * Redis is only the real-time transport.
   *
   * A temporary Redis failure should NOT
   * break plan creation or agent execution,
   * because the event is already safely
   * stored in PostgreSQL.
   */
  try {
    await publishOrchestrationEvent(
      event
    );
  } catch (error) {
    console.warn(
      `[Orchestration Trace] Event ${event.id} persisted, but live publish failed:`,
      error instanceof Error
        ? error.message
        : error
    );
  }

  return event;
}