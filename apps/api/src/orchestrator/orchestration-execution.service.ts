import prisma from "../lib/prisma.js";

import {
  runQueue,
} from "../queue/run.queue.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

export async function executeOrchestration(
  userId: string,
  orchestrationId: string
) {
  const orchestration =
    await prisma.orchestrationRun.findFirst({
      where: {
        id: orchestrationId,
        userId,
      },

      include: {
        steps: {
          orderBy: {
            position: "asc",
          },

          include: {
            agent: true,
            run: true,
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
    orchestration.status ===
    "BLOCKED"
  ) {
    throw new Error(
      "ORCHESTRATION_BLOCKED"
    );
  }

  if (
    orchestration.status !==
    "READY"
  ) {
    throw new Error(
      "ORCHESTRATION_NOT_READY"
    );
  }

  if (
    orchestration.steps.length ===
    0
  ) {
    throw new Error(
      "ORCHESTRATION_HAS_NO_STEPS"
    );
  }

  const context =
    orchestration.context &&
    typeof orchestration.context ===
      "object" &&
    !Array.isArray(
      orchestration.context
    )
      ? orchestration.context
      : {};

  await prisma.orchestrationRun.update({
    where: {
      id: orchestration.id,
    },

    data: {
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  await traceOrchestration(
    orchestration.id,
    "ORCHESTRATION_STARTED",
    "Vigil started orchestration execution",
    {
      stepCount:
        orchestration.steps.length,
    }
  );

  const createdRuns: {
    stepId: string;
    runId: string;
  }[] = [];

  try {
    for (
      const step of
      orchestration.steps
    ) {
      if (!step.agent) {
        throw new Error(
          `ORCHESTRATION_STEP_AGENT_MISSING:${step.id}`
        );
      }

      const result =
        await prisma.$transaction(
          async (tx: { run: { create: (arg0: { data: { userId: string; agentId: any; status: string; }; }) => any; }; orchestrationStep: { update: (arg0: { where: { id: any; }; data: { runId: any; status: string; }; }) => any; }; }) => {
            const run =
              await tx.run.create({
                data: {
                  userId,
                  agentId:
                    step.agent!.id,
                  status:
                    "PENDING",
                },
              });

            await tx.orchestrationStep.update({
              where: {
                id: step.id,
              },

              data: {
                runId:
                  run.id,

                status:
                  "PENDING",
              },
            });

            return {
              run,
            };
          }
        );

      createdRuns.push({
        stepId:
          step.id,

        runId:
          result.run.id,
      });

      await traceOrchestration(
        orchestration.id,
        "AGENT_SELECTED",
        `${step.agent.name} scheduled for execution`,
        {
          stepId:
            step.id,

          runId:
            result.run.id,

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
        }
      );

      await runQueue.add(
        "execute-agent-run",
        {
          runId:
            result.run.id,

          slug:
            step.agent.slug,

          input:
            context as Record<
              string,
              unknown
            >,
        },
        {
          jobId:
            result.run.id,

          attempts: 3,

          backoff: {
            type:
              "exponential",

            delay:
              1000,
          },

          removeOnComplete: {
            age:
              60 * 60,
          },

          removeOnFail: {
            age:
              24 * 60 * 60,
          },
        }
      );
    }

    return {
      orchestrationId:
        orchestration.id,

      status:
        "RUNNING" as const,

      runs:
        createdRuns,
    };
  } catch (error) {
    await prisma.orchestrationRun.update({
      where: {
        id:
          orchestration.id,
      },

      data: {
        status:
          "FAILED",

        completedAt:
          new Date(),
      },
    });

    await traceOrchestration(
      orchestration.id,
      "ORCHESTRATION_FAILED",
      "Vigil failed while scheduling orchestration execution",
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown scheduling error",
      }
    );

    throw error;
  }
}