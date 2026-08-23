import "dotenv/config";

import {
  Redis,
} from "ioredis";

import type {
  OrchestrationEvent,
} from "@vigil/db";

const redisUrl =
  process.env.REDIS_URL ??
  "redis://127.0.0.1:6379";

/*
 * PostgreSQL is our durable event store.
 *
 * Redis only provides real-time delivery,
 * so publishing must not hold the entire
 * orchestration hostage when Redis is down.
 */
const publisher =
  new Redis(
    redisUrl,
    {
      enableOfflineQueue:
        false,

      maxRetriesPerRequest:
        1,

      retryStrategy(
        times
      ) {
        return Math.min(
          times * 500,
          3000
        );
      },
    }
  );

publisher.on(
  "connect",
  () => {
    console.log(
      "[Orchestration PubSub] Redis connected"
    );
  }
);

publisher.on(
  "error",
  (error) => {
    console.error(
      "[Orchestration PubSub] Redis error:",
      error.message
    );
  }
);

function getChannel(
  orchestrationId: string
) {
  return `orchestration:${orchestrationId}`;
}

export async function publishOrchestrationEvent(
  event: OrchestrationEvent
) {
  await publisher.publish(
    getChannel(
      event.orchestrationId
    ),
    JSON.stringify(
      event
    )
  );
}

export async function subscribeToOrchestration(
  orchestrationId: string,
  callback: (
    event: OrchestrationEvent
  ) => void
) {
  /*
   * Pub/Sub subscribers must use their
   * own Redis connection.
   */
  const subscriber =
    new Redis(
      redisUrl,
      {
        maxRetriesPerRequest:
          null,

        retryStrategy(
          times
        ) {
          return Math.min(
            times * 500,
            3000
          );
        },
      }
    );

  const channel =
    getChannel(
      orchestrationId
    );

  subscriber.on(
    "error",
    (error) => {
      console.error(
        "[Orchestration PubSub] Subscriber error:",
        error.message
      );
    }
  );

  const handleMessage = (
    receivedChannel: string,
    message: string
  ) => {
    if (
      receivedChannel !==
      channel
    ) {
      return;
    }

    try {
      const event =
        JSON.parse(
          message
        ) as OrchestrationEvent;

      callback(
        event
      );
    } catch (error) {
      console.error(
        "[Orchestration PubSub] Invalid event:",
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
    } catch (error) {
      console.error(
        "[Orchestration PubSub] Failed to unsubscribe:",
        error
      );
    } finally {
      subscriber.disconnect();
    }
  };
}