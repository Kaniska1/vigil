import { Worker } from "bullmq";

import {
  executeAgentRun,
} from "../services/run.service.js";

import {
  redisConnection,
} from "./redis.js";

import type {
  AgentRunJobData,
} from "./run.queue.js";

export const runWorker =
  new Worker<AgentRunJobData>(
    "agent-runs",

    async (job) => {
      const {
        runId,
        slug,
        input,
      } = job.data;

      await executeAgentRun(
        runId,
        slug,
        input
      );
    },

    {
      connection:
        redisConnection,

      concurrency: 2,
    }
  );

runWorker.on(
  "completed",
  (job) => {
    console.log(
      `Run job ${job.id} completed`
    );
  }
);

runWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `Run job ${job?.id} failed:`,
      error
    );
  }
);