import { Queue } from "bullmq";

import {
  redisConnection,
} from "./redis.js";

export type AgentRunJobData = {
  runId: string;
  slug: string;

  input: Record<
    string,
    unknown
  >;
};

export const runQueue =
  new Queue<AgentRunJobData>(
    "agent-runs",
    {
      connection:
        redisConnection,
    }
  );