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

function asObject(
  value: unknown
): JsonObject {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as JsonObject;
  }

  return {};
}

export async function scheduleReadyOrchestrationSteps(
  orchestrationId: string
): Promise<void> {
  const orchestration =
    await prisma.orchestrationRun.findUnique({
      where: {
        id: orchestrationId,
      },

      include: {
        steps: {
          orderBy: {
            position: "asc",
          },

          include: {
            agent: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },

            run: {
              select: {
                id: true,
                status: true,
                result: true,
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

  /*
   * Explicit local type prevents TS from
   * losing callback inference further down.
   */
  const steps =
    orchestration.steps as
      SchedulerStep[];

  const originalContext =
    asObject(
      orchestration.context
    );

  for (
    const step of steps
  ) {
    /*
     * This step has already been
     * claimed/scheduled.
     */
    if (
      step.runId !== null ||
      step.status !== "PENDING"
    ) {
      continue;
    }

    if (!step.agent) {
      throw new Error(
        `ORCHESTRATION_STEP_AGENT_MISSING:${step.id}`
      );
    }

    /*
     * Resolve dependency positions into
     * actual orchestration steps.
     */
    const dependencies:
      SchedulerStep[] = [];

    for (
      const dependencyPosition of
      step.dependsOnPositions
    ) {
      const dependency =
        steps.find(
          (
            candidate:
              SchedulerStep
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

    /*
     * Root steps have zero dependencies,
     * therefore every([]) correctly
     * evaluates to true.
     */
    const dependenciesReady =
      dependencies.every(
        (
          dependency:
            SchedulerStep
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
     * Gather results from completed
     * upstream steps.
     */
    const upstreamResults =
      dependencies.map(
        (
          dependency:
            SchedulerStep
        ) => ({
          stepId:
            dependency.id,

          position:
            dependency.position,

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

          result:
            dependency.run
              ?.result ??
            null,
        })
      );

    const input:
      JsonObject = {
      ...originalContext,

      upstreamResults,
    };

    /*
     * Atomically claim this step.
     *
     * The explicit Prisma.TransactionClient
     * fixes the recurring implicit-any error
     * on `tx`.
     */
    const run =
      await prisma.$transaction(
        async (
          tx:
            Prisma.TransactionClient
        ): Promise<Run | null> => {
          const currentStep =
            await tx.orchestrationStep.findUnique({
              where: {
                id: step.id,
              },
            });

          /*
           * Another scheduler invocation may
           * already have claimed this step.
           */
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
              id: step.id,
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
     * The step was already claimed by
     * another scheduler invocation.
     */
    if (!run) {
      continue;
    }

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
      }
    );

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
            60 * 60,
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