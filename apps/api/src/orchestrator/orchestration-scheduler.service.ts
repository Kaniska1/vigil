import prisma from "../lib/prisma.js";

import {
  runQueue,
} from "../queue/run.queue.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

import type {
  Agent,
  OrchestrationStep,
  Prisma,
  Run,
} from "@vigil/db";

type JsonObject =
  Record<string, unknown>;

type SchedulerAgent =
  Pick<
    Agent,
    "id" | "slug" | "name"
  >;

type SchedulerRun =
  Pick<
    Run,
    "id" | "status" | "result"
  >;

type SchedulerStep =
  OrchestrationStep & {
    agent:
      SchedulerAgent | null;

    run:
      SchedulerRun | null;
  };

type ExecutionContextResult = {
  stepId: string;

  position: number;

  iteration: number;

  agent: {
    id: string;
    slug: string;
    name: string;
  } | null;

  capabilities:
    string[];

  result:
    unknown;

  truncated?:
    boolean;
};

type RankedReusableResult = {
  step:
    SchedulerStep;

  score:
    number;
};

/*
 * --------------------------------------------------
 * Memory selection limits
 * --------------------------------------------------
 */

const MAX_REUSED_RESULTS =
  3;

/*
 * Maximum historical context we allow into one
 * agent execution.
 *
 * This is character-based rather than token-based
 * because it is deterministic, provider-independent
 * and costs nothing to calculate.
 */
const MAX_REUSED_CONTEXT_CHARS =
  8_000;

/*
 * Prevent one enormous historical result from
 * consuming the entire memory budget.
 */
const MAX_SINGLE_REUSED_RESULT_CHARS =
  3_000;

function asObject(
  value: unknown
): JsonObject {
  if (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  ) {
    return value as
      JsonObject;
  }

  return {};
}

function unique(
  values:
    string[]
): string[] {
  return [
    ...new Set(
      values
    ),
  ];
}

function stringifySafely(
  value: unknown
): string {
  try {
    return JSON.stringify(
      value
    );
  } catch {
    return String(
      value
    );
  }
}

function truncateString(
  value: string,

  maxLength: number
): string {
  if (
    value.length <=
    maxLength
  ) {
    return value;
  }

  return `${value.slice(
    0,
    Math.max(
      0,
      maxLength -
        20
    )
  )}...[truncated]`;
}

/*
 * --------------------------------------------------
 * Capability tokenization
 * --------------------------------------------------
 */

function tokenizeCapability(
  capability:
    string
): string[] {
  return capability
    .toLowerCase()
    .split(
      /[^a-z0-9]+/
    )
    .map(
      (
        token
      ) =>
        token.trim()
    )
    .filter(
      Boolean
    );
}

/*
 * --------------------------------------------------
 * Capability relevance
 * --------------------------------------------------
 *
 * Exact match = strong signal.
 *
 * Shared capability token = weaker signal.
 */
function scoreCapabilityRelevance(
  historicalCapabilities:
    string[],

  targetCapabilities:
    string[]
): number {
  if (
    historicalCapabilities.length ===
      0 ||
    targetCapabilities.length ===
      0
  ) {
    return 0;
  }

  let score =
    0;

  const targetSet =
    new Set(
      targetCapabilities
    );

  for (
    const capability of
    historicalCapabilities
  ) {
    if (
      targetSet.has(
        capability
      )
    ) {
      score +=
        10;
    }
  }

  const historicalTokens =
    new Set(
      historicalCapabilities.flatMap(
        tokenizeCapability
      )
    );

  const targetTokens =
    new Set(
      targetCapabilities.flatMap(
        tokenizeCapability
      )
    );

  for (
    const token of
    historicalTokens
  ) {
    if (
      targetTokens.has(
        token
      )
    ) {
      score +=
        2;
    }
  }

  return score;
}

/*
 * --------------------------------------------------
 * Current DAG results
 * --------------------------------------------------
 */

function buildUpstreamResults(
  dependencies:
    SchedulerStep[]
): ExecutionContextResult[] {
  return dependencies.map(
    (
      dependency
    ) => ({
      stepId:
        dependency.id,

      position:
        dependency.position,

      iteration:
        dependency.iteration,

      agent:
        dependency.agent
          ? {
              id:
                dependency.agent.id,

              slug:
                dependency.agent.slug,

              name:
                dependency.agent.name,
            }
          : null,

      capabilities:
        dependency.satisfies,

      result:
        dependency.run
          ?.result ??
        null,
    })
  );
}

/*
 * --------------------------------------------------
 * Historical memory ranking
 * --------------------------------------------------
 */

function rankReusableSteps(
  steps:
    SchedulerStep[],

  currentStep:
    SchedulerStep
): RankedReusableResult[] {
  const historicalSuccessfulSteps =
    steps.filter(
      (
        candidate
      ) =>
        candidate.iteration <
          currentStep.iteration &&
        candidate.status ===
          "SUCCESS" &&
        candidate.run !==
          null
    );

  if (
    historicalSuccessfulSteps.length ===
    0
  ) {
    return [];
  }

  const targetCapabilities =
    unique([
      ...currentStep.satisfies,

      ...currentStep.requiredCapabilities,

      ...currentStep.optionalCapabilities,
    ]);

  const ranked =
    historicalSuccessfulSteps
      .map(
        (
          candidate
        ): RankedReusableResult => ({
          step:
            candidate,

          score:
            scoreCapabilityRelevance(
              candidate.satisfies,
              targetCapabilities
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) => {
          if (
            left.score !==
            right.score
          ) {
            return (
              right.score -
              left.score
            );
          }

          if (
            left.step.iteration !==
            right.step.iteration
          ) {
            return (
              right.step.iteration -
              left.step.iteration
            );
          }

          return (
            right.step.position -
            left.step.position
          );
        }
      );

  const relevant =
    ranked.filter(
      (
        item
      ) =>
        item.score >
        0
    );

  /*
   * Prefer relevant memories.
   *
   * If absolutely nothing matches, retain only the
   * most recent success for minimal continuity.
   */
  return relevant.length >
    0
    ? relevant.slice(
        0,
        MAX_REUSED_RESULTS
      )
    : ranked.slice(
        0,
        1
      );
}

/*
 * --------------------------------------------------
 * Historical memory budgeting
 * --------------------------------------------------
 *
 * Important:
 *
 * We do NOT mutate the persisted Run.result.
 *
 * We only create a compact execution-context
 * representation before handing memory to another
 * agent.
 */
function budgetReusableResults(
  ranked:
    RankedReusableResult[]
): ExecutionContextResult[] {
  const results:
    ExecutionContextResult[] =
    [];

  let remainingBudget =
    MAX_REUSED_CONTEXT_CHARS;

  for (
    const item of
    ranked
  ) {
    if (
      remainingBudget <=
      0
    ) {
      break;
    }

    const step =
      item.step;

    const rawResult =
      step.run?.result ??
      null;

    const serialized =
      stringifySafely(
        rawResult
      );

    /*
     * Each individual result has its own ceiling,
     * but it also cannot exceed whatever remains in
     * the total context budget.
     */
    const allowedChars =
      Math.min(
        MAX_SINGLE_REUSED_RESULT_CHARS,
        remainingBudget
      );

    if (
      allowedChars <=
      0
    ) {
      break;
    }

    const truncated =
      serialized.length >
      allowedChars;

    const budgetedResult =
      truncated
        ? {
            truncated:
              true,

            preview:
              truncateString(
                serialized,
                allowedChars
              ),
          }
        : rawResult;

    /*
     * Use the actual serialized size of what we are
     * injecting, not the original result.
     */
    const consumed =
      stringifySafely(
        budgetedResult
      ).length;

    if (
      consumed >
      remainingBudget
    ) {
      continue;
    }

    results.push({
      stepId:
        step.id,

      position:
        step.position,

      iteration:
        step.iteration,

      agent:
        step.agent
          ? {
              id:
                step.agent.id,

              slug:
                step.agent.slug,

              name:
                step.agent.name,
            }
          : null,

      capabilities:
        step.satisfies,

      result:
        budgetedResult,

      truncated:
        truncated
          ? true
          : undefined,
    });

    remainingBudget -=
      consumed;
  }

  return results;
}

/*
 * --------------------------------------------------
 * Complete memory retrieval pipeline
 * --------------------------------------------------
 */

function buildReusedResults(
  steps:
    SchedulerStep[],

  currentStep:
    SchedulerStep
): ExecutionContextResult[] {
  const ranked =
    rankReusableSteps(
      steps,
      currentStep
    );

  if (
    ranked.length ===
    0
  ) {
    return [];
  }

  return budgetReusableResults(
    ranked
  );
}

export async function scheduleReadyOrchestrationSteps(
  orchestrationId:
    string
): Promise<void> {
  const orchestration =
    await prisma.orchestrationRun.findUnique({
      where: {
        id:
          orchestrationId,
      },

      include: {
        steps: {
          orderBy: {
            position:
              "asc",
          },

          include: {
            agent: {
              select: {
                id:
                  true,

                slug:
                  true,

                name:
                  true,
              },
            },

            run: {
              select: {
                id:
                  true,

                status:
                  true,

                result:
                  true,
              },
            },
          },
        },
      },
    });

  if (!orchestration) {
    throw new Error(
      "ORCHESTRATION_NOT_FOUND"
    );
  }

  if (
    orchestration.status !==
    "RUNNING"
  ) {
    return;
  }

  const steps =
    orchestration.steps as
      SchedulerStep[];

  const originalContext =
    asObject(
      orchestration.context
    );

  for (
    const step of
    steps
  ) {
    /*
     * Already claimed or terminal.
     */
    if (
      step.runId !==
        null ||
      step.status !==
        "PENDING"
    ) {
      continue;
    }

    if (!step.agent) {
      throw new Error(
        `ORCHESTRATION_STEP_AGENT_MISSING:${step.id}`
      );
    }

    /*
     * ------------------------------------------------
     * Resolve explicit current-DAG dependencies
     * ------------------------------------------------
     */
    const dependencies:
      SchedulerStep[] =
      [];

    for (
      const dependencyPosition of
      step.dependsOnPositions
    ) {
      const dependency =
        steps.find(
          (
            candidate
          ) =>
            candidate.position ===
            dependencyPosition
        );

      if (!dependency) {
        throw new Error(
          `ORCHESTRATION_INVALID_DEPENDENCY:${step.id}:${dependencyPosition}`
        );
      }

      dependencies.push(
        dependency
      );
    }

    const dependenciesReady =
      dependencies.every(
        (
          dependency
        ) =>
          dependency.status ===
          "SUCCESS"
      );

    if (
      !dependenciesReady
    ) {
      continue;
    }

    /*
     * Current graph outputs.
     */
    const upstreamResults =
      buildUpstreamResults(
        dependencies
      );

    /*
     * Previous orchestration knowledge.
     *
     * retrieve
     * → rank
     * → select
     * → budget
     */
    const reusedResults =
      buildReusedResults(
        steps,
        step
      );

    const reusedCapabilities =
      unique(
        reusedResults.flatMap(
          (
            result
          ) =>
            result.capabilities
        )
      );

    const truncatedMemoryCount =
      reusedResults.filter(
        (
          result
        ) =>
          result.truncated ===
          true
      ).length;

    const reusedContextChars =
      stringifySafely(
        reusedResults
      ).length;

    /*
     * ------------------------------------------------
     * Execution input
     * ------------------------------------------------
     */
    const input:
      JsonObject = {
      ...originalContext,

      /*
       * Explicit graph dependencies.
       */
      upstreamResults,

      /*
       * Selected historical memory.
       */
      reusedResults,
    };

    /*
     * ------------------------------------------------
     * Atomic claim
     * ------------------------------------------------
     */
    const run =
      await prisma.$transaction(
        async (
          tx:
            Prisma.TransactionClient
        ): Promise<
          Run | null
        > => {
          const currentStep =
            await tx.orchestrationStep.findUnique({
              where: {
                id:
                  step.id,
              },
            });

          if (
            !currentStep ||
            currentStep.runId !==
              null ||
            currentStep.status !==
              "PENDING"
          ) {
            return null;
          }

          const createdRun =
            await tx.run.create({
              data: {
                userId:
                  orchestration.userId,

                agentId:
                  step.agent!.id,

                status:
                  "PENDING",
              },
            });

          await tx.orchestrationStep.update({
            where: {
              id:
                step.id,
            },

            data: {
              runId:
                createdRun.id,

              input:
                JSON.parse(
                  JSON.stringify(
                    input
                  )
                ),
            },
          });

          return createdRun;
        }
      );

    /*
     * Another scheduler invocation won the claim.
     */
    if (!run) {
      continue;
    }

    /*
     * ------------------------------------------------
     * Observability
     * ------------------------------------------------
     */
    await traceOrchestration(
      orchestration.id,
      "AGENT_SELECTED",
      `${step.agent.name} scheduled for execution`,
      {
        stepId:
          step.id,

        runId:
          run.id,

        position:
          step.position,

        iteration:
          step.iteration,

        dependsOnPositions:
          step.dependsOnPositions,

        agentId:
          step.agent.id,

        agentSlug:
          step.agent.slug,

        satisfies:
          step.satisfies,

        requiredCapabilities:
          step.requiredCapabilities,

        optionalCapabilities:
          step.optionalCapabilities,

        upstreamResultCount:
          upstreamResults.length,

        reusedResultCount:
          reusedResults.length,

        reusedCapabilities,

        reusedContextChars,

        truncatedMemoryCount,

        memoryBudgetChars:
          MAX_REUSED_CONTEXT_CHARS,
      }
    );

    /*
     * ------------------------------------------------
     * Queue execution
     * ------------------------------------------------
     */
    await runQueue.add(
      "execute-agent-run",
      {
        runId:
          run.id,

        slug:
          step.agent.slug,

        input,
      },
      {
        jobId:
          run.id,

        attempts:
          3,

        backoff: {
          type:
            "exponential",

          delay:
            1000,
        },

        removeOnComplete: {
          age:
            60 *
            60,
        },

        removeOnFail: {
          age:
            24 *
            60 *
            60,
        },
      }
    );
  }
}