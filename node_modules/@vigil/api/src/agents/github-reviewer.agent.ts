import type {
  AgentInput,
  AgentExecutionResult,
  VigilAgent,
} from "./agent.types.js";

import type {
  ExecutionContext,
} from "../runtime/execution-context.types.js";

export const githubReviewerAgent: VigilAgent =
{
  slug: "github-reviewer",
  name: "GitHub Reviewer",

  async execute(
    input: AgentInput,
    context: ExecutionContext
  ): Promise<AgentExecutionResult> {
    const repository =
      String(
        input.repository ?? ""
      );

    const pullRequest =
      Number(
        input.pullRequest
      );

    if (!repository) {
      throw new Error(
        "repository is required"
      );
    }

    if (
      !pullRequest ||
      Number.isNaN(
        pullRequest
      )
    ) {
      throw new Error(
        "pullRequest is required"
      );
    }

    const [owner, repo] =
      repository.split("/");

    if (
      !owner ||
      !repo
    ) {
      throw new Error(
        "repository must use the format owner/repository"
      );
    }

    const pullRequestData =
      await context.tools.github.getPullRequest(
        {
          owner,
          repo,
          pullNumber:
            pullRequest,
        }
      );

    const changedFiles =
      await context.tools.github.getPullRequestFiles(
        {
          owner,
          repo,
          pullNumber:
            pullRequest,
        }
      );

    const filesForReview =
      changedFiles
        .slice(0, 20)
        .map((file) => {
          return `FILE: ${file.filename}
STATUS: ${file.status}
ADDITIONS: ${file.additions}
DELETIONS: ${file.deletions}
PATCH:
${file.patch ?? "Patch unavailable"}`;
        })
        .join(
          "\n\n---\n\n"
        );

    const response =
      await context.llm.generate(
        {
          systemPrompt: `You are a senior software engineer performing rigorous pull request reviews.

Base every finding only on the supplied pull request metadata and diff.
Do not invent files, bugs, vulnerabilities, or code that is not present.
Distinguish definite problems from possible concerns.

FORMAT REQUIREMENTS:
- Return clean GitHub-flavoured Markdown.
- Do not wrap the entire response in bold markers.
- Do not emit HTML entities such as &#x20;.
- Use Markdown headings beginning with ##.
- Use normal bullet lists where appropriate.
- Put filenames, identifiers, and code in backticks.
- Keep each section concise and readable.
- Do not surround the full response with a code fence.`,
          prompt: `Repository: ${repository}
Pull Request: #${pullRequest}
Title: ${pullRequestData.title}
Description: ${pullRequestData.body ?? "No description"}
Author: ${pullRequestData.author}
Base: ${pullRequestData.baseBranch}
Head: ${pullRequestData.headBranch}

Changed files:

${filesForReview}

Review the actual diff above.

Use exactly this document structure:

## Summary

Briefly explain what the pull request changes.

## Correctness

List bugs or correctness issues with filenames and reasoning.
If there are none, write: "No correctness issues identified."

## Security

List security concerns with filenames and reasoning.
If there are none, write: "No security concerns identified."

## Maintainability

List maintainability or code-quality concerns.
If there are none, write: "No maintainability concerns identified."

## File-level findings

Group concrete findings by filename using subheadings such as:

### \`path/to/file.ts\`

- Finding
- Finding

## Recommendation

Finish with exactly one of:

**Approve**
**Comment**
**Request changes**

Then add a short explanation underneath.

For every issue, mention the relevant filename.
If you find no meaningful issue, say so explicitly.`,
        }
      );

    return {
      output: {
        review:
          response.text,

        model:
          response.model,

        usage:
          response.usage,
      },
    };
  },
};
