import prisma from "../lib/prisma.js";

import type {
  Prisma,
} from "@vigil/db";

import {
  createOrchestratorPlan,
} from "./orchestrator.service.js";

import {
  getOrchestrationMemory,
  recordOrchestrationReplan,
  setOrchestrationMemoryPhase,
} from "./orchestration-memory.service.js";

import {
  scheduleReadyOrchestrationSteps,
} from "./orchestration-scheduler.service.js";

import {
  traceOrchestration,
} from "./orchestration-trace.service.js";

import type {
  AgentExecutionStep,
} from "./orchestrator.types.js";

type ReplanGraphNode = {
  step:
    AgentExecutionStep;

  relativePosition:
    number;

  dependsOnRelativePositions:
    number[];
};

function buildReplanGraph(
  executionSteps:
    AgentExecutionStep[]
): ReplanGraphNode[] {
  const keyToPosition =
    new Map<
      string,
      number
    >();

  for (
    const [
      position,
      step,
    ] of executionSteps.entries()
  ) {
    if (
      !step.key.trim()
    ) {
      throw new Error(
        `ORCHESTRATION_STEP_KEY_REQUIRED:${position}`
      );
    }

    if (
      keyToPosition.has(
        step.key
      )
    ) {
      throw new Error(
        `ORCHESTRATION_DUPLICATE_STEP_KEY:${step.key}`
      );
    }

    keyToPosition.set(
      step.key,
      position
    );
  }

  return executionSteps.map(
    (
      step,
      relativePosition
    ) => {
      const dependsOnRelativePositions =
        step.dependsOnKeys.map(
          (
            dependencyKey
          ) => {
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

            if (
              dependencyPosition >=
              relativePosition
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
        relativePosition,
        dependsOnRelativePositions,
      };
    }
  );
}

export async function replanOrchestration(
  orchestrationId:
    string,
  reason:
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
    "REPLANNING"
  ) {
    return;
  }

  const memory =
    await getOrchestrationMemory(
      orchestrationId
    );

  if (!memory) {
    throw new Error(
      "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
    );
  }

  const nextIteration =
    memory.iteration +
    1;

  /*
   * Keep replanning context intentionally compact.
   *
   * We do NOT dump the entire event log or trace
   * history into the LLM.
   */
  const previousExecution =
    Object.values(
      memory.stepResults
    ).map(
      (
        step
      ) => ({
        position:
          step.position,

        agentSlug:
          step.agentSlug,

        status:
          step.status,
      })
    );

  const replanContext = {
    ...memory.workingContext,

    vigilReplan: {
      iteration:
        nextIteration,

      reason,

      previousExecution,
    },
  };

  /*
   * Same generic planner.
   *
   * No special "replanning agent".
   * No hard-coded reviewer knowledge.
   */
  const plan =
    await createOrchestratorPlan({
      goal:
        orchestration.goal,

      context:
        replanContext,
    });

  if (
    !plan.executable
  ) {
    await prisma.orchestrationRun.update({
      where: {
        id:
          orchestrationId,
      },

      data: {
        status:
          "FAILED",

        completedAt:
          new Date(),

        unresolvedCapabilities:
          plan.unresolvedCapabilities,
      },
    });

    await setOrchestrationMemoryPhase(
      orchestrationId,
      "FAILED"
    );

    await traceOrchestration(
      orchestrationId,
      "ORCHESTRATION_FAILED",
      "Vigil could not produce an executable replan",
      {
        iteration:
          nextIteration,

        unresolvedCapabilities:
          plan.unresolvedCapabilities,
      }
    );

    return;
  }

  const graph =
    buildReplanGraph(
      plan.executionSteps
    );

  const basePosition =
    orchestration.steps.length ===
    0
      ? 0
      : Math.max(
          ...orchestration.steps.map(
            (
              step
            ) =>
              step.position
          )
        ) +
        1;

  await prisma.$transaction(
    async (
      tx:
        Prisma.TransactionClient
    ) => {
      for (
        const node of graph
      ) {
        const absolutePosition =
          basePosition +
          node.relativePosition;

        const dependsOnPositions =
          node.dependsOnRelativePositions.map(
            (
              dependencyPosition
            ) =>
              basePosition +
              dependencyPosition
          );

        await tx.orchestrationStep.create({
          data: {
            orchestrationId,

            agentId:
              node.step.agent.id,

            position:
              absolutePosition,

            iteration:
              nextIteration,

            dependsOnPositions,

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

      await tx.orchestrationRun.update({
        where: {
          id:
            orchestrationId,
        },

        data: {
          plan:
            JSON.parse(
              JSON.stringify(
                plan
              )
            ),

          unresolvedCapabilities:
            plan.unresolvedCapabilities,

          status:
            "RUNNING",

          completedAt:
            null,
        },
      });
    }
  );

  await recordOrchestrationReplan({
    orchestrationId,

    fromIteration:
      memory.iteration,

    toIteration:
      nextIteration,

    reason,
  });

  /*
   * recordOrchestrationReplan sets REPLANNING
   * while recording the transition.
   *
   * Execution begins immediately afterwards.
   */
  await setOrchestrationMemoryPhase(
    orchestrationId,
    "EXECUTING"
  );

  await traceOrchestration(
    orchestrationId,
    "PLAN_CREATED",
    `Vigil created replan iteration ${nextIteration}`,
    {
      iteration:
        nextIteration,

      reason,

      summary:
        plan.summary,

      selectedAgents:
        plan.executionSteps.map(
          (
            step
          ) => ({
            slug:
              step.agent.slug,

            satisfies:
              step.satisfies,
          })
        ),
    }
  );

  await scheduleReadyOrchestrationSteps(
    orchestrationId
  );
}