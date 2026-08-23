import prisma from "../lib/prisma.js";

import type {
  Prisma,
} from "@vigil/db";

import type {
  AgentExecutionStep,
  OrchestratorGoalInput,
} from "./orchestrator.types.js";

import {
  createOrchestratorPlan,
} from "./orchestrator.service.js";

import {
  createInitialOrchestrationMemory,
} from "./orchestration-memory.service.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

type ExecutionGraphNode = {
  step:
    AgentExecutionStep;

  position:
    number;

  dependsOnPositions:
    number[];
};

/*
 * --------------------------------------------------
 * Execution graph validation
 * --------------------------------------------------
 *
 * The planner/runtime expresses dependencies using
 * stable graph-local keys.
 *
 * PostgreSQL currently stores dependencies using
 * integer positions.
 *
 * This function is the boundary between those two
 * representations.
 */
function buildExecutionGraph(
  executionSteps:
    AgentExecutionStep[]
): ExecutionGraphNode[] {
  const keyToPosition =
    new Map<
      string,
      number
    >();

  /*
   * First pass:
   * establish every graph node and reject
   * duplicate identities.
   */
  for (
    const [
      position,
      step,
    ] of executionSteps.entries()
  ) {
    const key =
      step.key.trim();

    if (!key) {
      throw new Error(
        `ORCHESTRATION_STEP_KEY_REQUIRED:${position}`
      );
    }

    if (
      keyToPosition.has(
        key
      )
    ) {
      throw new Error(
        `ORCHESTRATION_DUPLICATE_STEP_KEY:${key}`
      );
    }

    keyToPosition.set(
      key,
      position
    );
  }

  /*
   * Second pass:
   * resolve stable keys into the current
   * database representation.
   */
  return executionSteps.map(
    (
      step,
      position
    ) => {
      const seenDependencies =
        new Set<string>();

      const dependsOnPositions =
        step.dependsOnKeys.map(
          (
            dependencyKey
          ) => {
            if (
              dependencyKey ===
              step.key
            ) {
              throw new Error(
                `ORCHESTRATION_SELF_DEPENDENCY:${step.key}`
              );
            }

            if (
              seenDependencies.has(
                dependencyKey
              )
            ) {
              throw new Error(
                `ORCHESTRATION_DUPLICATE_DEPENDENCY:${step.key}:${dependencyKey}`
              );
            }

            seenDependencies.add(
              dependencyKey
            );

            const dependencyPosition =
              keyToPosition.get(
                dependencyKey
              );

            if (
              dependencyPosition ===
              undefined
            ) {
              throw new Error(
                `ORCHESTRATION_UNKNOWN_DEPENDENCY:${step.key}:${dependencyKey}`
              );
            }

            /*
             * For v1, dependencies must point
             * backwards in the ordered plan.
             *
             * That gives us a simple DAG guarantee.
             */
            if (
              dependencyPosition >=
              position
            ) {
              throw new Error(
                `ORCHESTRATION_INVALID_DEPENDENCY_ORDER:${step.key}:${dependencyKey}`
              );
            }

            return dependencyPosition;
          }
        );

      return {
        step,
        position,
        dependsOnPositions,
      };
    }
  );
}

export async function createPersistentOrchestration(
  userId: string,
  input: OrchestratorGoalInput
) {
  /*
   * Generate the semantic capability plan
   * and resolve it against the live registry.
   */
  const plan =
    await createOrchestratorPlan(
      input
    );

  const status:
    | "READY"
    | "BLOCKED" =
    plan.executable
      ? "READY"
      : "BLOCKED";

  /*
   * Validate and materialize the generic
   * execution graph before touching the DB.
   */
  const graph =
    buildExecutionGraph(
      plan.executionSteps
    );

  /*
   * Create the initial durable working memory.
   *
   * This exists immediately when the
   * orchestration is created, before execution.
   */
  const initialMemory =
    createInitialOrchestrationMemory(
      plan.goal,
      input.context
    );

  /*
   * Persist the parent orchestration and
   * concrete execution graph atomically.
   */
  const orchestration =
    await prisma.$transaction(
      async (
        tx:
          Prisma.TransactionClient
      ) => {
        const created =
          await tx.orchestrationRun.create({
            data: {
              userId,

              goal:
                plan.goal,

              summary:
                plan.summary,

              status,

              context:
                input.context
                  ? JSON.parse(
                      JSON.stringify(
                        input.context
                      )
                    )
                  : undefined,

              plan:
                JSON.parse(
                  JSON.stringify(
                    plan
                  )
                ),

              /*
               * Persistent orchestration
               * working memory.
               */
              state:
                JSON.parse(
                  JSON.stringify(
                    initialMemory
                  )
                ),

              /*
               * Optimistic-lock counter used
               * for safe concurrent memory writes.
               */
              stateVersion:
                0,

              unresolvedCapabilities:
                plan.unresolvedCapabilities,
            },
          });

        /*
         * Persist the execution graph.
         */
        for (
          const node of graph
        ) {
          await tx.orchestrationStep.create({
  data: {
    orchestrationId:
      created.id,

    agentId:
      node.step.agent.id,

    position:
      node.position,

    iteration:
      0,

    dependsOnPositions:
      node.dependsOnPositions,

    status:
      "PENDING",

    satisfies:
      node.step.satisfies,

    requiredCapabilities:
      node.step.requiredCapabilities,

    optionalCapabilities:
      node.step.optionalCapabilities,
  },
});
        }

        return created;
      }
    );

  /*
   * PostgreSQL stores durable history.
   * Redis is only responsible for live delivery.
   */
  await traceOrchestration(
    orchestration.id,
    "PLAN_CREATED",
    "Vigil created an orchestration plan",
    {
      status:
        orchestration.status,

      summary:
        plan.summary,

      executable:
        plan.executable,

      executionGraph:
        graph.map(
          (
            node
          ) => ({
            key:
              node.step.key,

            position:
              node.position,

            dependsOnKeys:
              node.step.dependsOnKeys,

            dependsOnPositions:
              node.dependsOnPositions,

            agentSlug:
              node.step.agent.slug,

            satisfies:
              node.step.satisfies,
          })
        ),

      unresolvedCapabilities:
        plan.unresolvedCapabilities,

      unresolvedOptionalCapabilities:
        plan.unresolvedOptionalCapabilities,
    }
  );

  return {
    orchestration,
    plan,
  };
}

export async function getUserOrchestrations(
  userId: string,
  limit = 50
) {
  return prisma.orchestrationRun.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt:
        "desc",
    },

    take:
      limit,

    include: {
      events: {
        orderBy: {
          createdAt:
            "asc",
        },
      },

      steps: {
        orderBy: {
          position:
            "asc",
        },

        include: {
          agent:
            true,

          run: {
            select: {
              id:
                true,

              status:
                true,

              createdAt:
                true,

              startedAt:
                true,

              completedAt:
                true,
            },
          },
        },
      },
    },
  });
}

export async function getUserOrchestration(
  userId: string,
  orchestrationId: string
) {
  return prisma.orchestrationRun.findFirst({
    where: {
      id:
        orchestrationId,

      userId,
    },

    include: {
      events: {
        orderBy: {
          createdAt:
            "asc",
        },
      },

      steps: {
        orderBy: {
          position:
            "asc",
        },

        include: {
          agent:
            true,

          run: {
            include: {
              events: {
                orderBy: {
                  createdAt:
                    "asc",
                },
              },
            },
          },
        },
      },
    },
  });
}