import prisma from "../lib/prisma.js";

import type {
  OrchestratorGoalInput,
  OrchestratorPlan,
} from "./orchestrator.types.js";

import {
  createOrchestratorPlan,
} from "./orchestrator.service.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

export async function createPersistentOrchestration(
  userId: string,
  input: OrchestratorGoalInput
) {
  /*
   * First let the planner produce a validated,
   * capability-resolved execution plan.
   */
  const plan =
    await createOrchestratorPlan(
      input
    );

  const status =
    plan.executable
      ? "READY"
      : "BLOCKED";

  const orchestration =
    await prisma.$transaction(
      async (tx: { orchestrationRun: { create: (arg0: { data: { userId: string; goal: string; summary: string; status: string; context: any; plan: any; unresolvedCapabilities: string[]; }; }) => any; }; orchestrationStep: { create: (arg0: { data: { orchestrationId: any; agentId: string; position: number; status: string; satisfies: string[]; requiredCapabilities: string[]; optionalCapabilities: string[]; }; }) => any; }; }) => {
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

              unresolvedCapabilities:
                plan.unresolvedCapabilities,
            },
          });

        for (
          const [
            index,
            executionStep,
          ] of
          plan.executionSteps.entries()
        ) {
          await tx.orchestrationStep.create({
            data: {
              orchestrationId:
                created.id,

              agentId:
                executionStep
                  .agent.id,

              position:
                index,

              status:
                "PENDING",

              satisfies:
                executionStep
                  .satisfies,

              requiredCapabilities:
                executionStep
                  .requiredCapabilities,

              optionalCapabilities:
                executionStep
                  .optionalCapabilities,
            },
          });
        }

        return created;
      }
    );

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

      selectedAgents:
        plan.executionSteps.map(
          (step) => ({
            slug:
              step.agent.slug,

            satisfies:
              step.satisfies,
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
      steps: {
        orderBy: {
          position:
            "asc",
        },

        include: {
            events: {
  orderBy: {
    createdAt:
      "asc",
  },
},
          agent:
            true,

          run: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              completedAt: true,
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
      id: orchestrationId,
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