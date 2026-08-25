import prisma from "../lib/prisma.js";

import {
  getOrchestrationMemory,
} from "./orchestration-memory.service.js";

type FinalResultEntry = {
  stepId: string;

  position: number;

  iteration: number;

  agent: {
    id: string;
    slug: string;
    name: string;
  };

  capabilities:
    string[];

  result:
    unknown;

  reused:
    boolean;
};

export type FinalOrchestrationResult = {
  orchestrationId:
    string;

  goal:
    string;

  status:
    "SUCCESS";

  summary:
    string;

  iteration:
    number;

  capabilitiesSatisfied:
    string[];

  results:
    FinalResultEntry[];

  completedAt:
    string;
};

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

export async function buildFinalOrchestrationResult(
  orchestrationId:
    string
): Promise<FinalOrchestrationResult> {
  const orchestration =
    await prisma.orchestrationRun.findUnique({
      where: {
        id:
          orchestrationId,
      },

      include: {
        steps: {
          orderBy: [
            {
              iteration:
                "asc",
            },

            {
              position:
                "asc",
            },
          ],

          include: {
            agent:
              true,

            run: {
              select: {
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

  const memory =
    await getOrchestrationMemory(
      orchestrationId
    );

  if (!memory) {
    throw new Error(
      "ORCHESTRATION_MEMORY_NOT_INITIALIZED"
    );
  }

  /*
   * ------------------------------------------------
   * Collect every successful execution
   * ------------------------------------------------
   *
   * Previously, the final result was tied to the
   * current iteration.
   *
   * That breaks result reuse:
   *
   * iteration 0:
   *   code-review SUCCESS
   *
   * iteration 1:
   *   security-analysis SUCCESS
   *
   * Final output must contain BOTH.
   */
  const successfulSteps =
    orchestration.steps.filter(
      (
        step
      ) =>
        step.status ===
        "SUCCESS" &&
        step.agent !==
        null &&
        step.run !==
        null
    );

  /*
   * ------------------------------------------------
   * Capability ownership
   * ------------------------------------------------
   *
   * A later successful iteration should win if the
   * same capability was executed again.
   *
   * Normally capability reuse prevents duplicate
   * work, but keeping this rule makes the result
   * builder robust if a capability is intentionally
   * rerun later.
   */
  const capabilityOwner =
    new Map<
      string,
      typeof successfulSteps[number]
    >();

  for (
    const step of
    successfulSteps
  ) {
    for (
      const capability of
      step.satisfies
    ) {
      const existing =
        capabilityOwner.get(
          capability
        );

      if (
        !existing ||
        step.iteration >
          existing.iteration ||
        (
          step.iteration ===
            existing.iteration &&
          step.position >
            existing.position
        )
      ) {
        capabilityOwner.set(
          capability,
          step
        );
      }
    }
  }

  /*
   * ------------------------------------------------
   * Determine which successful steps actually
   * contribute to the final answer.
   * ------------------------------------------------
   */
  const contributingStepIds =
    new Set(
      [
        ...capabilityOwner.values(),
      ].map(
        (
          step
        ) =>
          step.id
      )
    );

  const results:
    FinalResultEntry[] =
    successfulSteps
      .filter(
        (
          step
        ) =>
          contributingStepIds.has(
            step.id
          )
      )
      .map(
        (
          step
        ) => ({
          stepId:
            step.id,

          position:
            step.position,

          iteration:
            step.iteration,

          agent: {
            id:
              step.agent!.id,

            slug:
              step.agent!.slug,

            name:
              step.agent!.name,
          },

          capabilities:
            step.satisfies.filter(
              (
                capability
              ) =>
                capabilityOwner.get(
                  capability
                )?.id ===
                step.id
            ),

          result:
            step.run!.result,

          /*
           * Anything from an earlier iteration is
           * being reused in the final outcome.
           */
          reused:
  step.iteration <
  memory.iteration,
  })
)
.filter(
  (
    entry
  ) =>
    entry.capabilities.length >
    0
)
      .sort(
        (
          left: { iteration: number; position: number; },
          right: { iteration: number; position: number; }
        ) => {
          if (
            left.iteration !==
            right.iteration
          ) {
            return (
              left.iteration -
              right.iteration
            );
          }

          return (
            left.position -
            right.position
          );
        }
      );

  const capabilitiesSatisfied =
    unique(
      results.flatMap(
        (
          result
        ) =>
          result.capabilities
      )
    );

  /*
   * Keep this deterministic.
   *
   * We do not need another LLM call just to write
   * the parent summary.
   */
  const reusedCount =
    results.filter(
      (
        result
      ) =>
        result.reused
    ).length;

  const summary =
    reusedCount >
      0
      ? `Vigil completed the goal using ${results.length} successful execution result(s), including ${reusedCount} result(s) reused from earlier orchestration iterations.`
      : `Vigil completed the goal using ${results.length} successful execution result(s).`;

  return {
    orchestrationId:
      orchestration.id,

    goal:
      orchestration.goal,

    status:
      "SUCCESS",

    summary,

    iteration:
      memory.iteration,

    capabilitiesSatisfied,

    results,

    completedAt:
      new Date().toISOString(),
  };
}

export async function persistFinalOrchestrationResult(
  orchestrationId:
    string
): Promise<FinalOrchestrationResult> {
  const result =
    await buildFinalOrchestrationResult(
      orchestrationId
    );

  await prisma.orchestrationRun.update({
    where: {
      id:
        orchestrationId,
    },

    data: {
      result:
        JSON.parse(
          JSON.stringify(
            result
          )
        ),
    },
  });

  return result;
}