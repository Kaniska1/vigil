import prisma from "../lib/prisma.js";

import type {
  OrchestrationMemoryPhase,
  OrchestrationMemoryState,
  OrchestrationMemoryStepStatus,
} from "./orchestration-memory.types.js";

type JsonObject =
  Record<string, unknown>;

const MAX_MEMORY_UPDATE_ATTEMPTS =
  8;

function isObject(
  value: unknown
): value is JsonObject {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function cloneJson<T>(
  value: T
): T {
  return JSON.parse(
    JSON.stringify(
      value
    )
  ) as T;
}

export function createInitialOrchestrationMemory(
  goal: string,
  context?: Record<
    string,
    unknown
  >
): OrchestrationMemoryState {
  const now =
    new Date().toISOString();

  return {
    schemaVersion:
      1,

    goal,

    phase:
      "PLANNED",

    iteration:
      0,

    workingContext:
      cloneJson(
        context ??
          {}
      ),

    stepResults:
      {},

    observations:
      [],

    evaluations:
      [],

    replans:
      [],

    decisions:
      [],

    createdAt:
      now,

    updatedAt:
      now,
  };
}

function parseMemoryState(
  value: unknown
): OrchestrationMemoryState {
  if (
    !isObject(
      value
    )
  ) {
    throw new Error(
      "ORCHESTRATION_MEMORY_INVALID"
    );
  }

  if (
    value.schemaVersion !==
    1
  ) {
    throw new Error(
      "ORCHESTRATION_MEMORY_UNSUPPORTED_VERSION"
    );
  }

  return cloneJson(
    value
  ) as OrchestrationMemoryState;
}

/*
 * Optimistic concurrency protects parallel
 * worker updates from overwriting each other.
 */
export async function updateOrchestrationMemory(
  orchestrationId: string,
  mutator: (
    state:
      OrchestrationMemoryState
  ) =>
    OrchestrationMemoryState
): Promise<OrchestrationMemoryState> {
  for (
    let attempt =
      0;
    attempt <
    MAX_MEMORY_UPDATE_ATTEMPTS;
    attempt++
  ) {
    const orchestration =
      await prisma.orchestrationRun.findUnique({
        where: {
          id:
            orchestrationId,
        },

        select: {
          state:
            true,

          stateVersion:
            true,
        },
      });

    if (
      !orchestration
    ) {
      throw new Error(
        "ORCHESTRATION_NOT_FOUND"
      );
    }

    if (
      !orchestration.state
    ) {
      throw new Error(
        "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
      );
    }

    const current =
      parseMemoryState(
        orchestration.state
      );

    const next =
      mutator(
        cloneJson(
          current
        )
      );

    next.updatedAt =
      new Date().toISOString();

    const result =
      await prisma.orchestrationRun.updateMany({
        where: {
          id:
            orchestrationId,

          stateVersion:
            orchestration.stateVersion,
        },

        data: {
          state:
            JSON.parse(
              JSON.stringify(
                next
              )
            ),

          stateVersion: {
            increment:
              1,
          },
        },
      });

    if (
      result.count ===
      1
    ) {
      return next;
    }
  }

  throw new Error(
    "ORCHESTRATION_MEMORY_WRITE_CONFLICT"
  );
}

export async function setOrchestrationMemoryPhase(
  orchestrationId: string,
  phase:
    OrchestrationMemoryPhase
): Promise<void> {
  await updateOrchestrationMemory(
    orchestrationId,
    (
      memory
    ) => {
      memory.phase =
        phase;

      return memory;
    }
  );
}

type RecordStepMemoryInput = {
  orchestrationId:
    string;

  stepId:
    string;

  position:
    number;

  runId:
    string;

  agentId:
    string | null;

  agentSlug:
    string | null;

  status:
    OrchestrationMemoryStepStatus;

  result?:
    unknown;

  startedAt?:
    Date | null;

  completedAt?:
    Date | null;
};

export async function recordOrchestrationStepMemory(
  input:
    RecordStepMemoryInput
): Promise<void> {
  await updateOrchestrationMemory(
    input.orchestrationId,
    (
      memory
    ) => {
      const previous =
        memory.stepResults[
          input.stepId
        ];

      memory.stepResults[
        input.stepId
      ] = {
        stepId:
          input.stepId,

        position:
          input.position,

        runId:
          input.runId,

        agentId:
          input.agentId,

        agentSlug:
          input.agentSlug,

        status:
          input.status,

        result:
          input.result !==
          undefined
            ? cloneJson(
                input.result
              )
            : previous
                ?.result ??
              null,

        startedAt:
          input.startedAt
            ? input.startedAt.toISOString()
            : previous
                ?.startedAt ??
              null,

        completedAt:
          input.completedAt
            ? input.completedAt.toISOString()
            : previous
                ?.completedAt ??
              null,
      };

      const observationType =
        input.status ===
        "RUNNING"
          ? "STEP_STARTED"
          : input.status ===
              "SUCCESS"
            ? "STEP_COMPLETED"
            : input.status ===
                "FAILED"
              ? "STEP_FAILED"
              : null;

      if (
        observationType
      ) {
        memory.observations.push({
          type:
            observationType,

          stepId:
            input.stepId,

          runId:
            input.runId,

          agentSlug:
            input.agentSlug,

          timestamp:
            new Date().toISOString(),
        });
      }

      return memory;
    }
  );
}

type RecordEvaluationInput = {
  orchestrationId:
    string;

  iteration:
    number;

  satisfied:
    boolean;

  reason:
    string;

  missingCapabilities:
    string[];

  shouldReplan:
    boolean;
};

/*
 * One evaluation record per orchestration iteration.
 *
 * Making this idempotent also protects us from
 * two workers reaching the evaluation boundary
 * almost simultaneously.
 */
export async function recordOrchestrationEvaluation(
  input:
    RecordEvaluationInput
): Promise<void> {
  await updateOrchestrationMemory(
    input.orchestrationId,
    (
      memory
    ) => {
      const existingIndex =
        memory.evaluations.findIndex(
          (
            evaluation
          ) =>
            evaluation.iteration ===
            input.iteration
        );

      const existing =
        existingIndex >=
        0
          ? memory.evaluations[
              existingIndex
            ]
          : null;

      const evaluation = {
        iteration:
          input.iteration,

        satisfied:
          input.satisfied,

        reason:
          input.reason,

        missingCapabilities:
          [
            ...input.missingCapabilities,
          ],

        shouldReplan:
          input.shouldReplan,

        createdAt:
          existing
            ?.createdAt ??
          new Date().toISOString(),
      };

      if (
        existingIndex >=
        0
      ) {
        memory.evaluations[
          existingIndex
        ] =
          evaluation;
      } else {
        memory.evaluations.push(
          evaluation
        );
      }

      return memory;
    }
  );
}

export async function getOrchestrationMemory(
  orchestrationId:
    string
): Promise<OrchestrationMemoryState | null> {
  const orchestration =
    await prisma.orchestrationRun.findUnique({
      where: {
        id:
          orchestrationId,
      },

      select: {
        state:
          true,
      },
    });

  if (
    !orchestration?.state
  ) {
    return null;
  }

  return parseMemoryState(
    orchestration.state
  );
}

type RecordReplanInput = {
  orchestrationId: string;

  fromIteration: number;

  toIteration: number;

  reason: string;
};

export async function recordOrchestrationReplan(
  input: RecordReplanInput
): Promise<void> {
  await updateOrchestrationMemory(
    input.orchestrationId,
    (memory) => {
      const exists =
        memory.replans.some(
          (replan) =>
            replan.toIteration ===
            input.toIteration
        );

      if (!exists) {
        memory.replans.push({
          fromIteration:
            input.fromIteration,

          toIteration:
            input.toIteration,

          reason:
            input.reason,

          createdAt:
            new Date().toISOString(),
        });
      }

      memory.iteration =
        input.toIteration;

      memory.phase =
        "REPLANNING";

      return memory;
    }
  );
}

type RecordDecisionInput = {
  orchestrationId: string;

  type: string;

  reason: string;

  metadata?: Record<
    string,
    unknown
  >;
};

export async function recordOrchestrationDecision(
  input:
    RecordDecisionInput
): Promise<void> {
  await updateOrchestrationMemory(
    input.orchestrationId,
    (
      memory
    ) => {
      memory.decisions.push({
        type:
          input.type,

        reason:
          input.reason,

        metadata:
          input.metadata
            ? JSON.parse(
                JSON.stringify(
                  input.metadata
                )
              )
            : undefined,

        createdAt:
          new Date().toISOString(),
      });

      return memory;
    }
  );
}