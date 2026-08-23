export type OrchestrationMemoryPhase =
  | "PLANNED"
  | "EXECUTING"
  | "EVALUATING"
  | "REPLANNING"
  | "COMPLETED"
  | "FAILED";

export type OrchestrationMemoryStepStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED";

export type OrchestrationStepMemory = {
  stepId: string;

  position: number;

  runId:
    | string
    | null;

  agentId:
    | string
    | null;

  agentSlug:
    | string
    | null;

  status:
    OrchestrationMemoryStepStatus;

  result:
    unknown;

  startedAt:
    | string
    | null;

  completedAt:
    | string
    | null;
};

export type OrchestrationObservation = {
  type:
    | "STEP_STARTED"
    | "STEP_COMPLETED"
    | "STEP_FAILED";

  stepId: string;

  runId:
    | string
    | null;

  agentSlug:
    | string
    | null;

  timestamp: string;
};

export type OrchestrationEvaluationMemory = {
  iteration: number;

  satisfied: boolean;

  reason: string;

  missingCapabilities:
    string[];

  shouldReplan: boolean;

  createdAt: string;
};

export type OrchestrationReplanMemory = {
  fromIteration: number;

  toIteration: number;

  reason: string;

  createdAt: string;
};

export type OrchestrationDecisionMemory = {
  type: string;

  reason: string;

  metadata?: Record<
    string,
    unknown
  >;

  createdAt: string;
};

export type OrchestrationMemoryState = {
  /*
   * Version of the memory data structure,
   * NOT the optimistic DB lock version.
   */
  schemaVersion: 1;

  goal: string;

  phase:
    OrchestrationMemoryPhase;

  iteration: number;

  workingContext:
    Record<
      string,
      unknown
    >;

  stepResults:
    Record<
      string,
      OrchestrationStepMemory
    >;

  observations:
    OrchestrationObservation[];

  evaluations:
    OrchestrationEvaluationMemory[];

  replans:
    OrchestrationReplanMemory[];

  decisions:
    OrchestrationDecisionMemory[];

  createdAt: string;

  updatedAt: string;
};