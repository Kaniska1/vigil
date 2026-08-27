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
      "repository:read",
      "pull_requests:read",
    ],

    category:
      "developer-tools",

    inputSchema: {
      repository: {
        type: "string",
        description:
          "GitHub repository in owner/repository format.",
        required: true,
      },

      pullRequest: {
        type: "number",
        description:
          "Pull request number to review.",
        required: true,
      },
    },

    outputSchema: {
      securityReview: {
        type: "json",
        description:
          "Structured security review result.",
      },
    },
  },

  implementation:
    securityReviewerAgent,
};

export default securityReviewerDefinition;
