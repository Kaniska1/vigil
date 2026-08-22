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
      "Reviews GitHub pull requests using PR metadata and changed-file diffs to identify bugs, risks, and code-quality issues.",

    version:
      "1.0.0",

    capabilities: [
      "code-review",
      "bug-detection",
      "pull-request-analysis",
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
    githubReviewerAgent,
};

export default githubReviewerDefinition;