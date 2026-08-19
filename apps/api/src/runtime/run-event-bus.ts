import {
  EventEmitter,
} from "node:events";

import type {
  TraceEvent,
} from "@vigil/db";

const emitter =
  new EventEmitter();

emitter.setMaxListeners(100);

const channel = (
  runId: string
) => `run:${runId}`;

export function publishRunEvent(
  runId: string,
  event: TraceEvent
) {
  emitter.emit(
    channel(runId),
    event
  );
}

export function subscribeToRun(
  runId: string,
  listener: (
    event: TraceEvent
  ) => void
) {
  emitter.on(
    channel(runId),
    listener
  );

  return () => {
    emitter.off(
      channel(runId),
      listener
    );
  };
}