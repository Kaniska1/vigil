import {
  GeminiProvider,
} from "../llm/gemini.provider.js";

import {
  discoverAgents,
} from "../services/agent-registry.service.js";

import {
  getCapabilityIds,
  isKnownCapability,
} from "./capability-catalog.js";

import {
  buildOrchestratorPrompt,
} from "./orchestrator-prompts.js";

import type {
  AgentExecutionStep,
  OrchestratorGeneratedPlan,
  OrchestratorGoalInput,
  OrchestratorPlan,
  ResolvedAgent,
  ResolvedPlanStep,
} from "./orchestrator.types.js";

/*
 * The planner should never be allowed to sit
 * indefinitely waiting for an LLM response.
 *
 * 20 seconds is intentionally generous for
 * this relatively small planning request.
 */
const PLANNER_TIMEOUT_MS =
  20_000;

const llm =
  new GeminiProvider();

/*
 * --------------------------------------------------
 * Timeout helper
 * --------------------------------------------------
 */

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer:
    | ReturnType<
        typeof setTimeout
      >
    | undefined;

  const timeout =
    new Promise<never>(
      (_, reject) => {
        timer =
          setTimeout(
            () => {
              reject(
                new Error(
                  message
                )
              );
            },
            timeoutMs
          );
      }
    );

  try {
    return await Promise.race([
      promise,
      timeout,
    ]);
  } finally {
    if (timer) {
      clearTimeout(
        timer
      );
    }
  }
}

/*
 * --------------------------------------------------
 * Gemini JSON cleanup
 * --------------------------------------------------
 */

function stripMarkdownCodeFence(
  value: string
) {
  const trimmed =
    value.trim();

  if (
    !trimmed.startsWith(
      "```"
    )
  ) {
    return trimmed;
  }

  return trimmed
    .replace(
      /^```(?:json)?\s*/i,
      ""
    )
    .replace(
      /\s*```$/,
      ""
    )
    .trim();
}

/*
 * --------------------------------------------------
 * Validate planner output
 * --------------------------------------------------
 *
 * Gemini is allowed to reason about which
 * CAPABILITIES are necessary.
 *
 * It is NOT allowed to invent agents.
 */

function parseGeneratedPlan(
  raw: string
): OrchestratorGeneratedPlan {
  const cleaned =
    stripMarkdownCodeFence(
      raw
    );

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        cleaned
      );
  } catch {
    console.error(
      "[Orchestrator] Gemini returned invalid JSON:",
      raw
    );

    throw new Error(
      "ORCHESTRATOR_INVALID_PLAN_JSON"
    );
  }

  if (
    typeof parsed !==
      "object" ||
    parsed ===
      null ||
    Array.isArray(
      parsed
    )
  ) {
    throw new Error(
      "ORCHESTRATOR_INVALID_PLAN"
    );
  }

  const candidate =
    parsed as {
      summary?: unknown;

      capabilities?:
        unknown;
    };

  if (
    typeof candidate.summary !==
    "string" ||
    !candidate.summary.trim()
  ) {
    throw new Error(
      "ORCHESTRATOR_INVALID_PLAN_SUMMARY"
    );
  }

  if (
    !Array.isArray(
      candidate.capabilities
    )
  ) {
    throw new Error(
      "ORCHESTRATOR_INVALID_CAPABILITIES"
    );
  }

  const capabilities =
    candidate.capabilities.map(
      (
        item,
        index
      ) => {
        if (
          typeof item !==
            "object" ||
          item === null ||
          Array.isArray(
            item
          )
        ) {
          throw new Error(
            `ORCHESTRATOR_INVALID_CAPABILITY_${index}`
          );
        }

        const capability =
          item as {
            capability?:
              unknown;

            reason?:
              unknown;

            required?:
              unknown;
          };

        if (
          typeof capability.capability !==
            "string" ||
          !capability.capability.trim()
        ) {
          throw new Error(
            `ORCHESTRATOR_INVALID_CAPABILITY_ID_${index}`
          );
        }

        /*
         * Runtime defense.
         *
         * Even though Gemini is explicitly told
         * to use the capability catalog, never
         * trust model output blindly.
         */
        if (
          !isKnownCapability(
            capability.capability
          )
        ) {
          throw new Error(
            `ORCHESTRATOR_UNKNOWN_CAPABILITY:${capability.capability}`
          );
        }

        if (
          typeof capability.reason !==
            "string" ||
          !capability.reason.trim()
        ) {
          throw new Error(
            `ORCHESTRATOR_INVALID_CAPABILITY_REASON_${index}`
          );
        }

        if (
          typeof capability.required !==
          "boolean"
        ) {
          throw new Error(
            `ORCHESTRATOR_INVALID_CAPABILITY_REQUIRED_${index}`
          );
        }

        return {
          capability:
            capability.capability,

          reason:
            capability.reason,

          required:
            capability.required,
        };
      }
    );

  return {
    summary:
      candidate.summary.trim(),

    capabilities,
  };
}

/*
 * --------------------------------------------------
 * Deterministic agent selection
 * --------------------------------------------------
 *
 * Gemini determines WHAT capabilities are needed.
 *
 * Vigil determines WHICH registered agents should
 * satisfy those capabilities.
 *
 * This deliberately keeps agent selection out of
 * the LLM.
 *
 * Example:
 *
 * pull-request-analysis -> GitHub Reviewer
 * code-review           -> GitHub Reviewer
 * bug-detection         -> GitHub Reviewer
 *
 * We should execute GitHub Reviewer once rather
 * than three times.
 */

function buildExecutionSteps(
  steps: ResolvedPlanStep[]
): AgentExecutionStep[] {
  const uncovered =
    new Set(
      steps
        .filter(
          (step) =>
            step.candidates.length >
            0
        )
        .map(
          (step) =>
            step.capability
        )
    );

  /*
   * Candidate agent ID ->
   * {
   *   agent,
   *   capabilities it could satisfy
   * }
   */
  const agentCoverage =
    new Map<
      string,
      {
        agent:
          ResolvedAgent;

        capabilities:
          Set<string>;
      }
    >();

  for (
    const step of
    steps
  ) {
    for (
      const agent of
      step.candidates
    ) {
      const existing =
        agentCoverage.get(
          agent.id
        );

      if (existing) {
        existing.capabilities.add(
          step.capability
        );

        continue;
      }

      agentCoverage.set(
        agent.id,
        {
          agent,

          capabilities:
            new Set([
              step.capability,
            ]),
        }
      );
    }
  }

  const selected:
    AgentExecutionStep[] =
    [];

  while (
    uncovered.size >
    0
  ) {
    let best:
      | {
          agent:
            ResolvedAgent;

          coverage:
            string[];
        }
      | undefined;

    for (
      const {
        agent,
        capabilities,
      } of
      agentCoverage.values()
    ) {
      const coverage =
        [
          ...capabilities,
        ].filter(
          (capability) =>
            uncovered.has(
              capability
            )
        );

      if (
        coverage.length ===
        0
      ) {
        continue;
      }

      if (!best) {
        best = {
          agent,
          coverage,
        };

        continue;
      }

      /*
       * Prefer the agent satisfying the
       * greatest number of still-uncovered
       * capabilities.
       */
      if (
        coverage.length >
        best.coverage.length
      ) {
        best = {
          agent,
          coverage,
        };

        continue;
      }

      /*
       * Stable deterministic tie-break.
       *
       * This means identical registry state
       * produces identical execution plans.
       */
      if (
        coverage.length ===
          best.coverage.length &&
        agent.slug.localeCompare(
          best.agent.slug
        ) < 0
      ) {
        best = {
          agent,
          coverage,
        };
      }
    }

    /*
     * Normally impossible because `uncovered`
     * only contains capabilities with candidates,
     * but prevents an accidental infinite loop.
     */
    if (!best) {
      break;
    }

    const requiredCapabilities =
      best.coverage.filter(
        (capability) =>
          steps.some(
            (step) =>
              step.capability ===
                capability &&
              step.required
          )
      );

    const optionalCapabilities =
      best.coverage.filter(
        (capability) =>
          steps.some(
            (step) =>
              step.capability ===
                capability &&
              !step.required
          )
      );

    selected.push({
      agent:
        best.agent,

      satisfies:
        best.coverage,

      requiredCapabilities,

      optionalCapabilities,
    });

    for (
      const capability of
      best.coverage
    ) {
      uncovered.delete(
        capability
      );
    }

    /*
     * Prevent the same agent from being selected
     * again during this planning pass.
     */
    agentCoverage.delete(
      best.agent.id
    );
  }

  return selected;
}

/*
 * --------------------------------------------------
 * Main planner
 * --------------------------------------------------
 */

export async function createOrchestratorPlan(
  input: OrchestratorGoalInput
): Promise<OrchestratorPlan> {
  const goal =
    input.goal.trim();

  if (!goal) {
    throw new Error(
      "ORCHESTRATOR_GOAL_REQUIRED"
    );
  }

  /*
   * Give Gemini the canonical vocabulary.
   *
   * This prevents free-form capability strings
   * such as:
   *
   * "pull-request-inspection"
   *
   * when Vigil actually understands:
   *
   * "pull-request-analysis"
   */
  const capabilityIds =
    getCapabilityIds();

  const prompt =
    buildOrchestratorPrompt(
      goal,
      capabilityIds,
      input.context
    );

  /*
   * ------------------------------------------------
   * LLM planning
   * ------------------------------------------------
   */

  const plannerStartedAt =
    Date.now();

  console.log(
    "[Orchestrator] Sending planning request to Gemini..."
  );

  let response;

  try {
    response =
  await withTimeout(
    llm.generate(
      {
        prompt,
      },
      {
        lowLatency: true,
      }
    ),

    PLANNER_TIMEOUT_MS,

    "ORCHESTRATOR_PLANNER_TIMEOUT"
  );
  } catch (error) {
    const elapsed =
      Date.now() -
      plannerStartedAt;

    console.error(
      `[Orchestrator] Planning failed after ${elapsed}ms:`,
      error
    );

    throw error;
  }

  const plannerLatencyMs =
    Date.now() -
    plannerStartedAt;

  console.log(
    `[Orchestrator] Gemini planning completed in ${plannerLatencyMs}ms`
  );

  /*
   * Gemini only returns the capability-level
   * reasoning plan here.
   */
  const generatedPlan =
    parseGeneratedPlan(
      response.text
    );

  /*
   * ------------------------------------------------
   * Resolve capabilities against Agent Registry
   * ------------------------------------------------
   */

  const resolvedSteps:
    ResolvedPlanStep[] =
    [];

  for (
    const planned of
    generatedPlan.capabilities
  ) {
    const matches =
      await discoverAgents({
        capability:
          planned.capability,
      });

    const candidates:
      ResolvedAgent[] =
      matches.map(
        (agent: { id: any; slug: any; name: any; version: any; capabilities: any; }) => ({
          id:
            agent.id,

          slug:
            agent.slug,

          name:
            agent.name,

          version:
            agent.version,

          capabilities:
            agent.capabilities,
        })
      );

    resolvedSteps.push({
      capability:
        planned.capability,

      reason:
        planned.reason,

      required:
        planned.required,

      candidates,
    });
  }

  /*
   * Required capabilities that have no
   * registered implementation block execution.
   */
  const unresolvedCapabilities =
    resolvedSteps
      .filter(
        (step) =>
          step.required &&
          step.candidates.length ===
            0
      )
      .map(
        (step) =>
          step.capability
      );

  /*
   * Optional missing capabilities are visible
   * to the user/debugger but do not prevent
   * execution.
   */
  const unresolvedOptionalCapabilities =
    resolvedSteps
      .filter(
        (step) =>
          !step.required &&
          step.candidates.length ===
            0
      )
      .map(
        (step) =>
          step.capability
      );

  /*
   * Consolidate capability matches into the
   * smallest sensible set of concrete agent
   * executions.
   */
  const executionSteps =
    buildExecutionSteps(
      resolvedSteps
    );

  const executable =
    unresolvedCapabilities.length ===
    0 &&
    executionSteps.length >
    0;

  console.log(
    `[Orchestrator] Plan resolved: ${executionSteps.length} agent(s), ${unresolvedCapabilities.length} missing required capability/capabilities`
  );

  return {
    goal,

    summary:
      generatedPlan.summary,

    steps:
      resolvedSteps,

    executionSteps,

    executable,

    unresolvedCapabilities,

    unresolvedOptionalCapabilities,
  };
}