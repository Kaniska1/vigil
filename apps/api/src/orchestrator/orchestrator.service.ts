import {
  GeminiProvider,
  isGeminiAvailabilityError,
} from "../llm/gemini.provider.js";

import {
  discoverAgents,
} from "../services/agent-registry.service.js";

import {
  getCapabilityById,
  getCapabilityIds,
  isKnownCapability,
} from "./capability-catalog.js";

import {
  resolveMissingOrchestrationInputs,
} from "./orchestration-input-resolver.js";

import {
  buildOrchestratorPrompt,
} from "./orchestrator-prompts.js";

import type {
  ActionExecutionStep,
  OrchestrationExecutionStep,
  OrchestratorGeneratedPlan,
  OrchestratorGoalInput,
  OrchestratorPlan,
  ResolvedAgent,
  ResolvedPlanStep,
} from "./orchestrator.types.js";

const PLANNER_TIMEOUT_MS =
  20_000;

const llm =
  new GeminiProvider();

/*
 * --------------------------------------------------
 * Deterministic fallback capability rules
 * --------------------------------------------------
 *
 * The fallback NEVER chooses agents.
 *
 * Its only responsibility is translating a goal
 * into Vigil's canonical capability vocabulary.
 *
 * Agent resolution remains entirely inside the
 * registry/resolver below.
 */

type FallbackCapabilityRule = {
  capability: string;

  patterns:
    RegExp[];

  reason: string;

  required:
    boolean;
};

const FALLBACK_CAPABILITY_RULES:
  FallbackCapabilityRule[] = [
    {
      capability:
        "pull-request-analysis",

      patterns: [
        /\bpull request\b/i,
        /\bpull-request\b/i,
        /\bpr\b/i,
        /\bmerge request\b/i,
      ],

      reason:
        "The goal involves inspecting or reasoning about a pull request.",

      required:
        true,
    },

    {
      capability:
        "code-review",

      patterns: [
        /\bcode review\b/i,
        /\breview (?:the |this )?code\b/i,
        /\breview (?:the |this )?(?:pull request|pr)\b/i,
        /\bquality\b/i,
        /\bcode quality\b/i,
        /\breview changes\b/i,
      ],

      reason:
        "The goal requests evaluation of source-code quality or changes.",

      required:
        true,
    },

    {
      capability:
        "bug-detection",

      patterns: [
        /\bbug\b/i,
        /\bbugs\b/i,
        /\bdefect\b/i,
        /\bregression\b/i,
        /\berror prone\b/i,
        /\bincorrect behavior\b/i,
      ],

      reason:
        "The goal asks Vigil to identify defects or likely regressions.",

      required:
        true,
    },

    {
      capability:
        "security-analysis",

      patterns: [
        /\bsecurity\b/i,
        /\bvulnerabilit(?:y|ies)\b/i,
        /\bauthentication\b/i,
        /\bauthorization\b/i,
        /\bauth\b/i,
        /\binjection\b/i,
        /\bxss\b/i,
        /\bssrf\b/i,
        /\bsecret(?:s)?\b/i,
        /\baccess control\b/i,
        /\bprivilege escalation\b/i,
        /\bsensitive data\b/i,
      ],

      reason:
        "The goal asks for security, vulnerability, or access-control analysis.",

      required:
        true,
    },

    {
      capability:
        "test-analysis",

      patterns: [
        /\btest coverage\b/i,
        /\bexisting tests\b/i,
        /\btest quality\b/i,
        /\banaly[sz]e tests\b/i,
        /\btesting gaps\b/i,
      ],

      reason:
        "The goal requires analysis of the current test suite or test coverage.",

      required:
        true,
    },

    {
      capability:
        "test-generation",

      patterns: [
        /\bgenerate tests\b/i,
        /\bcreate tests\b/i,
        /\bwrite tests\b/i,
        /\badd tests\b/i,
        /\bunit tests?\b/i,
        /\bintegration tests?\b/i,
      ],

      reason:
        "The goal explicitly asks Vigil to create or propose tests.",

      required:
        true,
    },

    {
      capability:
        "ci-cd-analysis",

      patterns: [
        /\bci\/cd\b/i,
        /\bci cd\b/i,
        /\bcontinuous integration\b/i,
        /\bcontinuous deployment\b/i,
        /\bgithub actions\b/i,
        /\bpipeline\b/i,
        /\bworkflow failure\b/i,
      ],

      reason:
        "The goal involves CI/CD configuration or pipeline behavior.",

      required:
        true,
    },

    {
      capability:
        "dependency-analysis",

      patterns: [
        /\bdependenc(?:y|ies)\b/i,
        /\bpackage(?:s)?\b/i,
        /\bnpm\b/i,
        /\bpackage\.json\b/i,
        /\boutdated librar(?:y|ies)\b/i,
      ],

      reason:
        "The goal requires reasoning about project dependencies or packages.",

      required:
        true,
    },

    {
      capability:
        "documentation-generation",

      patterns: [
        /\bdocumentation\b/i,
        /\bdocs\b/i,
        /\breadme\b/i,
        /\bdocument this\b/i,
        /\bgenerate documentation\b/i,
      ],

      reason:
        "The goal asks Vigil to create or improve project documentation.",

      required:
        true,
    },

    {
      capability:
        "publish-pr-review",

      patterns: [
        /\bpublish (?:the |this )?(?:review|findings|result)\b/i,
        /\bpost (?:the |this )?(?:review|findings|result)\b/i,
        /\bcomment (?:on|to) (?:the |this )?(?:pull request|pr)\b/i,
        /\bwrite (?:the |this )?(?:review|result) (?:back )?to github\b/i,
      ],

      reason:
        "The goal explicitly asks Vigil to publish the completed review back to GitHub.",

      required:
        true,
    },

    {
  capability:
    "api-debugging",

  patterns: [
    /\bdebug(?:ging)?\s+(?:an?\s+)?api\b/i,
    /\bapi\s+(?:bug|error|failure|issue|problem)\b/i,
    /\bapi\s+endpoint\b/i,
    /\bendpoint\s+(?:bug|error|failure|issue|problem)\b/i,
    /\bhttp\s+(?:error|failure|issue|status)\b/i,
    /\brest\s+api\b/i,
    /\bapi\s+(?:request|response)\b/i,
    /\b(?:request|response)\s+(?:body|headers?|status code)\b/i,
    /\b(?:4\d\d|5\d\d)\s+(?:http\s+)?(?:error|response|status)\b/i,
  ],

  reason:
    "The goal explicitly involves debugging or reasoning about API behavior.",

  required:
    true,
},
  ];

/*
 * --------------------------------------------------
 * Timeout helper
 * --------------------------------------------------
 */

async function withTimeout<T>(
  promise:
    Promise<T>,
  timeoutMs:
    number,
  message:
    string
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
      summary?:
        unknown;

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
          item ===
            null ||
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
 * Deterministic fallback planner
 * --------------------------------------------------
 *
 * This is deliberately NOT an attempt to recreate
 * Gemini with regexes.
 *
 * It exists so known developer tasks can still be
 * planned when the external planning provider is
 * temporarily unavailable.
 */

function buildFallbackSearchText(
  input: OrchestratorGoalInput
): string {
  let contextText =
    "";

  if (
    input.context
  ) {
    try {
      contextText =
        JSON.stringify(
          input.context
        );
    } catch {
      contextText =
        "";
    }
  }

  return `${
    input.goal
  }\n${contextText}`;
}

function createDeterministicFallbackPlan(
  input: OrchestratorGoalInput
):
  OrchestratorGeneratedPlan |
  null {
  const searchText =
    buildFallbackSearchText(
      input
    );

  const capabilityIds =
    new Set(
      getCapabilityIds()
    );

  const selected =
    new Map<
      string,
      {
        capability:
          string;

        reason:
          string;

        required:
          boolean;
      }
    >();

  for (
    const rule of
    FALLBACK_CAPABILITY_RULES
  ) {
    /*
     * The capability catalog remains the
     * authoritative vocabulary.
     *
     * If a rule survives in this file after its
     * capability is removed from the catalog,
     * silently ignore that stale rule.
     */
    if (
      !capabilityIds.has(
        rule.capability
      )
    ) {
      continue;
    }

    const matched =
      rule.patterns.some(
        (pattern) =>
          pattern.test(
            searchText
          )
      );

    if (!matched) {
      continue;
    }

    selected.set(
      rule.capability,
      {
        capability:
          rule.capability,

        reason:
          rule.reason,

        required:
          rule.required,
      }
    );
  }

  /*
   * Repository + pullRequest context is a strong
   * structural signal even if the user simply says:
   *
   * "Review this."
   */
  if (
    input.context &&
    typeof input.context ===
      "object"
  ) {
    const context =
      input.context as
        Record<
          string,
          unknown
        >;

    const repository =
      context.repository;

    const pullRequest =
      context.pullRequest;

    if (
      typeof repository ===
        "string" &&
      (
        typeof pullRequest ===
          "number" ||
        typeof pullRequest ===
          "string"
      )
    ) {
      if (
        capabilityIds.has(
          "pull-request-analysis"
        )
      ) {
        selected.set(
          "pull-request-analysis",
          {
            capability:
              "pull-request-analysis",

            reason:
              "The supplied context identifies a repository and pull request.",

            required:
              true,
          }
        );
      }

      /*
       * In Vigil today, a PR review request generally
       * implies code review unless the user explicitly
       * asks for another narrower operation.
       */
      if (
        capabilityIds.has(
          "code-review"
        ) &&
        /\breview\b/i.test(
          input.goal
        )
      ) {
        selected.set(
          "code-review",
          {
            capability:
              "code-review",

            reason:
              "The goal asks to review changes in the supplied pull request.",

            required:
              true,
          }
        );
      }
    }
  }

  const capabilities =
    [
      ...selected.values(),
    ];

  if (
    capabilities.length ===
    0
  ) {
    return null;
  }

  return {
    summary:
      `Fallback planner identified ${capabilities.length} required capability${
        capabilities.length ===
        1
          ? ""
          : "ies"
      } for this goal.`,

    capabilities,
  };
}

/*
 * --------------------------------------------------
 * Deterministic agent selection
 * --------------------------------------------------
 *
 * Gemini/fallback determines WHAT is needed.
 *
 * Vigil determines WHICH registered agents satisfy
 * those capabilities.
 */

function buildExecutionSteps(
  steps:
    ResolvedPlanStep[]
):
  OrchestrationExecutionStep[] {
  const agentSteps =
    steps.filter(
      (step) =>
        step.providerType ===
        "AGENT"
    );

  const actionSteps =
    steps.filter(
      (step) =>
        step.providerType ===
        "ACTION"
    );

  const uncovered =
    new Set(
      agentSteps
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
    agentSteps
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
    OrchestrationExecutionStep[] =
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

    if (!best) {
      break;
    }

    const requiredCapabilities =
      best.coverage.filter(
        (capability) =>
          agentSteps.some(
            (step) =>
              step.capability ===
                capability &&
              step.required
          )
      );

    const optionalCapabilities =
      best.coverage.filter(
        (capability) =>
          agentSteps.some(
            (step) =>
              step.capability ===
                capability &&
              !step.required
          )
      );

    selected.push({
      kind:
        "AGENT",

      key:
        `agent:${best.agent.slug}`,

      dependsOnKeys:
        [],

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

    agentCoverage.delete(
      best.agent.id
    );
  }

  /*
   * Action capabilities are deterministic providers.
   * They depend on capabilities, never fixed agent IDs.
   */
  const plannedCapabilities =
    new Set(
      steps.map(
        (step) =>
          step.capability
      )
    );

  for (
    const actionStep of
    actionSteps
  ) {
    if (!actionStep.action) {
      throw new Error(
        `ORCHESTRATOR_ACTION_MISSING:${actionStep.capability}`
      );
    }

    const dependencyCapabilities =
      new Set(
        (
          actionStep.dependsOnCapabilities ??
          []
        ).filter(
          (capability) =>
            plannedCapabilities.has(
              capability
            )
        )
      );

    const dependsOnKeys =
      selected
        .filter(
          (executionStep) =>
            executionStep.kind ===
              "AGENT" &&
            executionStep.satisfies.some(
              (capability) =>
                dependencyCapabilities.has(
                  capability
                )
            )
        )
        .map(
          (executionStep) =>
            executionStep.key
        );

    const requiredCapabilities =
      actionStep.required
        ? [
            actionStep.capability,
          ]
        : [];

    const optionalCapabilities =
      actionStep.required
        ? []
        : [
            actionStep.capability,
          ];

    const executionStep:
      ActionExecutionStep = {
        kind:
          "ACTION",

        key:
          `action:${actionStep.action}:${actionStep.capability}`,

        dependsOnKeys,

        action:
          actionStep.action,

        satisfies: [
          actionStep.capability,
        ],

        requiredCapabilities,

        optionalCapabilities,
      };

    selected.push(
      executionStep
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
  input:
    OrchestratorGoalInput
): Promise<OrchestratorPlan> {
  const goal =
    input.goal.trim();

  if (!goal) {
    throw new Error(
      "ORCHESTRATOR_GOAL_REQUIRED"
    );
  }

  const capabilityIds =
    getCapabilityIds();

  const prompt =
    buildOrchestratorPrompt(
      goal,
      capabilityIds,
      input.context
    );

  const plannerStartedAt =
    Date.now();

  console.log(
    "[Orchestrator] Sending planning request to Gemini..."
  );

  let generatedPlan:
    OrchestratorGeneratedPlan;

  try {
    /*
     * Only provider execution sits in this try/catch.
     *
     * `parseGeneratedPlan()` happens afterward so
     * malformed Gemini output is NOT silently hidden
     * behind the deterministic fallback.
     */
    const response =
      await withTimeout(
        llm.generate(
          {
            prompt,
          },
          {
            lowLatency:
              true,
          }
        ),

        PLANNER_TIMEOUT_MS,

        "ORCHESTRATOR_PLANNER_TIMEOUT"
      );

    const plannerLatencyMs =
      Date.now() -
      plannerStartedAt;

    console.log(
      `[Orchestrator] Gemini planning completed in ${plannerLatencyMs}ms`
    );

    generatedPlan =
      parseGeneratedPlan(
        response.text
      );

    console.log(
      "[Orchestrator] Planner source: gemini"
    );
  } catch (error) {
    const elapsed =
      Date.now() -
      plannerStartedAt;

    const providerUnavailable =
      isGeminiAvailabilityError(
        error
      );

    console.warn(
      `[Orchestrator] Gemini planning failed after ${elapsed}ms`,
      {
        providerUnavailable,

        error:
          error instanceof
            Error
            ? error.message
            : String(
                error
              ),
      }
    );

    if (
      !providerUnavailable
    ) {
      throw error;
    }

    const fallbackPlan =
      createDeterministicFallbackPlan(
        input
      );

    /*
     * We refuse to fabricate a generic plan when
     * the deterministic planner cannot confidently
     * map the goal onto the catalog.
     *
     * In that case the original provider error is
     * still the most truthful failure.
     */
    if (
      !fallbackPlan
    ) {
      console.warn(
        "[Orchestrator] Deterministic fallback could not confidently infer capabilities"
      );

      throw error;
    }

    generatedPlan =
  fallbackPlan;

console.log(
  "[Orchestrator] Fallback capabilities:",
  fallbackPlan.capabilities.map(
    (item) =>
      item.capability
  )
);

console.warn(
  `[Orchestrator] Planner source: deterministic-fallback (${fallbackPlan.capabilities.length} capability/capabilities)`
);
  }

  /*
   * ------------------------------------------------
   * Resolve capabilities against Agent Registry
   * ------------------------------------------------
   */
  const alreadySatisfiedCapabilities =
  new Set(
    input.constraints
      ?.alreadySatisfiedCapabilities ??
      []
  );

const capabilitiesToResolve =
  generatedPlan.capabilities.filter(
    (
      planned
    ) =>
      !alreadySatisfiedCapabilities.has(
        planned.capability
      )
  );

if (
  alreadySatisfiedCapabilities.size >
  0
) {
  console.log(
    "[Orchestrator] Reusing already-satisfied capabilities:",
    [
      ...alreadySatisfiedCapabilities,
    ]
  );
}

  const resolvedSteps:
    ResolvedPlanStep[] =
    [];

  for (
    const planned of
    capabilitiesToResolve
  ) {
    const definition =
      getCapabilityById(
        planned.capability
      );

    if (!definition) {
      throw new Error(
        `ORCHESTRATOR_UNKNOWN_CAPABILITY:${planned.capability}`
      );
    }

    if (
      definition.provider.type ===
      "ACTION"
    ) {
      resolvedSteps.push({
        capability:
          planned.capability,

        reason:
          planned.reason,

        required:
          planned.required,

        providerType:
          "ACTION",

        action:
          definition.provider.action,

        dependsOnCapabilities:
          definition.provider.dependsOnCapabilities ??
          [],

        candidates:
          [],
      });

      continue;
    }

    const matches =
      await discoverAgents({
        capability:
          planned.capability,
      });

    const candidates:
      ResolvedAgent[] =
      matches.map(
        (agent) => ({
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

          inputSchema:
            (
              agent.inputSchema ??
              {}
            ) as ResolvedAgent["inputSchema"],
        })
      );

    resolvedSteps.push({
      capability:
        planned.capability,

      reason:
        planned.reason,

      required:
        planned.required,

      providerType:
        "AGENT",

      candidates,
    });
  }

  const unresolvedCapabilities =
    resolvedSteps
      .filter(
        (step) =>
          step.required &&
          step.providerType ===
            "AGENT" &&
          step.candidates.length ===
            0
      )
      .map(
        (step) =>
          step.capability
      );

  const unresolvedOptionalCapabilities =
    resolvedSteps
      .filter(
        (step) =>
          !step.required &&
          step.providerType ===
            "AGENT" &&
          step.candidates.length ===
            0
      )
      .map(
        (step) =>
          step.capability
      );

  const executionSteps =
    buildExecutionSteps(
      resolvedSteps
    );

    const missingInputs =
  resolveMissingOrchestrationInputs(
    executionSteps,
    input.context ??
      {}
  );

  const satisfiedByReuse =
  unresolvedCapabilities.length ===
    0 &&
  missingInputs.length ===
    0 &&
  generatedPlan.capabilities.length >
    0 &&
  executionSteps.length ===
    0 &&
  alreadySatisfiedCapabilities.size >
    0;

const executable =
  unresolvedCapabilities.length ===
    0 &&
  missingInputs.length ===
    0 &&
  executionSteps.length >
    0;

  const agentExecutionCount =
    executionSteps.filter(
      (step) =>
        step.kind ===
        "AGENT"
    ).length;

  const actionExecutionCount =
    executionSteps.filter(
      (step) =>
        step.kind ===
        "ACTION"
    ).length;

  console.log(
    `[Orchestrator] Plan resolved: ${agentExecutionCount} agent step(s), ${actionExecutionCount} action step(s), ${unresolvedCapabilities.length} missing required capability/capabilities`
  );

  return {
    goal,

    summary:
      generatedPlan.summary,

    steps:
      resolvedSteps,

    executionSteps,

    executable,

    satisfiedByReuse,

    unresolvedCapabilities,

    unresolvedOptionalCapabilities,

    missingInputs,
  };
}