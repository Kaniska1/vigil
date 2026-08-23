import type {
  AgentDefinition,
} from "../agent-definition.types.js";

import {
  securityReviewerAgent,
} from "../security-reviewer.agent.js";

const securityReviewerDefinition:
  AgentDefinition =
{
  metadata: {
    slug:
      "security-reviewer",

    name:
      "Security Reviewer",

    description:
      "Reviews pull request changes for security vulnerabilities, unsafe data handling, access-control problems, injection risks, and other application security issues.",

    version:
      "1.0.0",

    capabilities: [
      "security-analysis",
    ],

    tools: [
      "github.getPullRequest",
      "github.getPullRequestFiles",
    ],

    permissions: [
      "github.read",
    ],

    category:
      "developer-tools",
  },

  implementation:
    securityReviewerAgent,
};

export default securityReviewerDefinition;