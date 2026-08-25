import type {
  AgentDefinition,
} from "../agent-definition.types.js";

import {
  githubReviewerAgent,
} from "../github-reviewer.agent.js";

const githubReviewerDefinition:
  AgentDefinition = {
  metadata: {
  slug:
    "github-reviewer",

  name:
    "GitHub Reviewer",

  description:
    "Reviews GitHub pull requests and returns structured feedback.",

  version:
    "1.0.0",

  capabilities: [
    "pull-request-review",
  ],

  tools: [
    "github",
  ],

  permissions: [
    "repository:read",
    "pull_requests:read",
  ],

  // ...

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
    review: {
      type: "json",
      description:
        "Structured pull request review result.",
    },
  },

  category:
    "developer-tools",
},

  implementation:
    githubReviewerAgent,
};

export default githubReviewerDefinition;