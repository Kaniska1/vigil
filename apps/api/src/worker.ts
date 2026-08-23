import "dotenv/config";

import "./queue/run.worker.js";

import {
  recoverInFlightOrchestrations,
} from "./orchestrator/orchestration-recovery.service.js";

async function startWorker(): Promise<void> {
  console.log(
    "Vigil run worker started"
  );

  try {
    await recoverInFlightOrchestrations();

    console.log(
      "[Orchestration Recovery] Startup recovery complete"
    );
  } catch (
    error
  ) {
    /*
     * Recovery failure must not prevent BullMQ
     * itself from running.
     */
    console.error(
      "[Orchestration Recovery] Startup recovery failed",
      error
    );
  }
}

void startWorker();