import Redis from "ioredis";

import type { TraceEvent } from "@vigil/db";

const redisUrl =
  process.env.REDIS_URL ??
  "redis://127.0.0.1:6379";

const publisher =
  new Redis(redisUrl);

function getRunChannel(
  runId: string
) {
  return `run:${runId}`;
}

export async function publishRunEvent(
  event: TraceEvent
) {
  const channel =
    getRunChannel(event.runId);

  await publisher.publish(
    channel,
    JSON.stringify(event)
  );
}

export async function subscribeToRun(
  runId: string,
  callback: (
    event: TraceEvent
  ) => void
) {
  /*
   * Redis connections that enter subscriber mode
   * cannot be reused for ordinary commands.
   *
   * For the MVP, each active SSE connection gets
   * its own Redis subscriber connection.
   */
  const subscriber =
    new Redis(redisUrl);

  const channel =
    getRunChannel(runId);

  const handleMessage = (
    receivedChannel: string,
    message: string
  ) => {
    if (
      receivedChannel !== channel
    ) {
      return;
    }

    try {
      const event =
        JSON.parse(
          message
        ) as TraceEvent;

      callback(event);
    } catch (error) {
      console.error(
        "Failed to parse Redis run event:",
        error
      );
    }
  };

  subscriber.on(
    "message",
    handleMessage
  );

  await subscriber.subscribe(
    channel
  );

  return async () => {
    subscriber.off(
      "message",
      handleMessage
    );

    try {
      await subscriber.unsubscribe(
        channel
      );
    } finally {
      subscriber.disconnect();
    }
  };
}