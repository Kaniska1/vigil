import "dotenv/config";

import {
  Redis,
} from "ioredis";

import type {
  TraceEvent,
} from "@vigil/db";

const redisUrl =
  process.env.REDIS_URL ??
  "redis://127.0.0.1:6379";

const publisher =
  new Redis(redisUrl);

publisher.on(
  "error",
  (error) => {
    console.error(
      "[Run PubSub] Publisher error:",
      error
    );
  }
);

function getRunChannel(
  runId: string
) {
  return `run:${runId}`;
}

export async function publishRunEvent(
  event: TraceEvent
) {
  await publisher.publish(
    getRunChannel(
      event.runId
    ),
    JSON.stringify(
      event
    )
  );
}

export async function subscribeToRun(
  runId: string,
  callback: (
    event: TraceEvent
  ) => void
) {
  /*
   * Redis Pub/Sub requires a dedicated
   * subscriber connection.
   */
  const subscriber =
    new Redis(redisUrl);

  const channel =
    getRunChannel(
      runId
    );

  subscriber.on(
    "error",
    (error) => {
      console.error(
        "[Run PubSub] Subscriber error:",
        error
      );
    }
  );

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

      callback(
        event
      );
    } catch (error) {
      console.error(
        "[Run PubSub] Failed to parse event:",
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