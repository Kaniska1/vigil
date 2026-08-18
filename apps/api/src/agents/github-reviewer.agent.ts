import { llm } from "../llm/index.js";

import type {
  AgentInput,
  AgentExecutionResult,
  VigilAgent,
} from "./agent.types.js";

export const githubReviewerAgent: VigilAgent = {
  slug: "github-reviewer",
  name: "GitHub Reviewer",

  async execute(input: AgentInput): Promise<AgentExecutionResult> {
    const repository = String(input.repository ?? "");
    const pullRequest = String(input.pullRequest ?? "");

    if (!repository) {
      throw new Error("repository is required");
    }

    const response = await llm.generate({
      systemPrompt:
        "You are a senior software engineer performing careful GitHub code reviews.",

      prompt: `
Repository: ${repository}
Pull Request: ${pullRequest || "Not provided"}

You do not yet have access to the repository contents.

For now:
1. Explain what you would inspect in this repository or pull request.
2. List likely categories of bugs, security issues, and code-quality problems you would check for.
3. Return a concise review plan.
`,
    });

    return {
      output: {
        review: response.text,
        model: response.model,
        usage: response.usage,
      },
    };
  },
};