export type CapabilityDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export const CAPABILITY_CATALOG: CapabilityDefinition[] = [
  {
    id: "pull-request-analysis",
    name: "Pull Request Analysis",
    description:
      "Inspect pull request metadata, changed files, branches, author information, and general PR state.",
    category: "source-control",
  },

  {
    id: "code-review",
    name: "Code Review",
    description:
      "Analyze source-code changes for bugs, maintainability problems, architectural issues, and code-quality concerns.",
    category: "code-quality",
  },

  {
    id: "bug-detection",
    name: "Bug Detection",
    description:
      "Identify likely defects, edge cases, incorrect assumptions, and runtime risks in code.",
    category: "code-quality",
  },

  {
    id: "security-analysis",
    name: "Security Analysis",
    description:
      "Analyze code and configuration for security risks, unsafe patterns, exposed secrets, authentication issues, and vulnerabilities.",
    category: "security",
  },

  {
    id: "test-analysis",
    name: "Test Analysis",
    description:
      "Evaluate existing tests, identify missing coverage, and determine whether important changes are sufficiently tested.",
    category: "testing",
  },

  {
    id: "test-generation",
    name: "Test Generation",
    description:
      "Generate appropriate automated tests for source-code behavior and edge cases.",
    category: "testing",
  },

  {
    id: "ci-cd-analysis",
    name: "CI/CD Analysis",
    description:
      "Inspect build, test, deployment, and continuous-integration status to determine pipeline health.",
    category: "delivery",
  },

  {
    id: "dependency-analysis",
    name: "Dependency Analysis",
    description:
      "Inspect project dependencies for risky upgrades, compatibility concerns, and dependency-related issues.",
    category: "dependencies",
  },

  {
    id: "documentation-generation",
    name: "Documentation Generation",
    description:
      "Create or improve technical documentation from source code, APIs, or project structure.",
    category: "documentation",
  },

  {
    id: "api-debugging",
    name: "API Debugging",
    description:
      "Investigate API behavior, requests, responses, errors, and integration problems.",
    category: "backend",
  },

  {
    id: "sql-analysis",
    name: "SQL Analysis",
    description:
      "Inspect SQL queries and database interactions for correctness, performance, and structural issues.",
    category: "database",
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