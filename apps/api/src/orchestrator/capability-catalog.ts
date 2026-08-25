export type CapabilityProvider =
  | {
      type: "AGENT";
    }
  | {
      type: "ACTION";
      action: string;
      dependsOnCapabilities?: string[];
    };

export type CapabilityDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: CapabilityProvider;
};

export const CAPABILITY_CATALOG: CapabilityDefinition[] = [
  {
    id: "pull-request-analysis",
    name: "Pull Request Analysis",
    description:
      "Inspect a pull request, understand its changes, and provide structured analysis of the modified code.",
    category: "source-control",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "code-review",
    name: "Code Review",
    description:
      "Analyze source-code changes for bugs, maintainability problems, architectural issues, and code-quality concerns.",
    category: "code-quality",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "bug-detection",
    name: "Bug Detection",
    description:
      "Inspect code changes for potential logical errors, runtime failures, edge cases, and unintended behavior.",
    category: "code-quality",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "security-analysis",
    name: "Security Analysis",
    description:
      "Analyze code or configuration for security weaknesses, unsafe patterns, exposed secrets, authorization issues, and other vulnerabilities.",
    category: "security",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "test-analysis",
    name: "Test Analysis",
    description:
      "Inspect existing tests and code changes to identify missing coverage, weak assertions, risky paths, and likely regression areas.",
    category: "testing",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "test-generation",
    name: "Test Generation",
    description:
      "Generate useful tests for code changes, edge cases, regressions, and expected application behavior.",
    category: "testing",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "ci-cd-analysis",
    name: "CI/CD Analysis",
    description:
      "Analyze continuous integration and deployment configuration, pipeline failures, build steps, and automation workflows.",
    category: "devops",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "dependency-analysis",
    name: "Dependency Analysis",
    description:
      "Inspect project dependencies for outdated packages, incompatibilities, vulnerabilities, and dependency-related risks.",
    category: "dependencies",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "documentation-generation",
    name: "Documentation Generation",
    description:
      "Generate or improve technical documentation based on source code, application behavior, APIs, and project structure.",
    category: "documentation",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "api-debugging",
    name: "API Debugging",
    description:
      "Analyze API requests, responses, errors, handlers, and integration behavior to diagnose failures and suggest fixes.",
    category: "debugging",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "sql-analysis",
    name: "SQL Analysis",
    description:
      "Analyze SQL queries, schemas, and database access patterns for correctness, performance, and potential issues.",
    category: "database",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "web-research",
    name: "Web Research",
    description:
      "Research current or externally verifiable information from web sources and synthesize relevant findings.",
    category: "research",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "information-retrieval",
    name: "Information Retrieval",
    description:
      "Find and retrieve relevant external information needed to satisfy an orchestration objective.",
    category: "research",
    provider: {
      type: "AGENT",
    },
  },

  {
    id: "publish-pr-review",
    name: "Publish Pull Request Review",
    description:
      "Publish completed pull-request review findings back to GitHub as a pull-request review comment.",
    category: "source-control",
    provider: {
      type: "ACTION",
      action: "github.createPullRequestReview",
      dependsOnCapabilities: [
        "code-review",
        "security-analysis",
        "bug-detection",
      ],
    },
  },
];

export function getCapabilityIds(): string[] {
  return CAPABILITY_CATALOG.map(
    (capability) => capability.id
  );
}

export function getCapabilityById(
  id: string
): CapabilityDefinition | undefined {
  return CAPABILITY_CATALOG.find(
    (capability) => capability.id === id
  );
}

export function isKnownCapability(
  id: string
): boolean {
  return CAPABILITY_CATALOG.some(
    (capability) => capability.id === id
  );
}