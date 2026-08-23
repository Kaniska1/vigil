import type {
  AgentExecutionResult,
  AgentInput,
  VigilAgent,
} from "./agent.types.js";

import type {
  ExecutionContext,
} from "../runtime/execution-context.types.js";

function requireString(
  input: AgentInput,
  key: string
): string {
  const value = input[key];

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${key} is required`
    );
  }

  return value.trim();
}

function requirePositiveInteger(
  input: AgentInput,
  key: string
): number {
  const value = input[key];

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${key} must be a positive integer`
    );
  }

  return value;
}

function parseRepository(
  repository: string
) {
  const parts =
    repository
      .trim()
      .split("/")
      .filter(Boolean);

  if (
    parts.length !== 2
  ) {
    throw new Error(
      "repository must use the format owner/repo"
    );
  }

  const [
    owner,
    repo,
  ] = parts;

  if (
    !owner ||
    !repo
  ) {
    throw new Error(
      "repository must use the format owner/repo"
    );
  }

  return {
    owner,
    repo,
  };
}

function buildSecurityPrompt(
  repository: string,
  pullRequest: number,
  pullRequestData: unknown,
  files: unknown
) {
  return `
You are a senior application security engineer performing a security-focused pull request review.

Repository:
${repository}

Pull Request:
#${pullRequest}

Pull request metadata:
${JSON.stringify(
  pullRequestData,
  null,
  2
)}

Changed files:
${JSON.stringify(
  files,
  null,
  2
)}

Review ONLY the changes represented in the pull request data above.

Focus specifically on security risks such as:

- authentication flaws
- authorization flaws
- exposed secrets or credentials
- unsafe handling of user-controlled input
- SQL injection
- command injection
- cross-site scripting (XSS)
- server-side request forgery (SSRF)
- path traversal
- insecure deserialization
- unsafe redirects
- broken access control
- sensitive information exposure
- insecure API usage
- dangerous dependency or configuration changes
- insecure cryptography
- missing or insufficient validation
- privilege escalation
- security-relevant logic errors

Do not invent vulnerabilities that are not supported by the provided pull request data or diff.

For each concrete issue you identify, provide:

1. Severity: CRITICAL, HIGH, MEDIUM, LOW, or INFO
2. File
3. Security issue
4. Why it matters
5. Recommended fix

If you do not find a concrete security vulnerability, say so clearly.

Finish with a concise overall security assessment.

Be technically specific and evidence-based.
`.trim();
}

export const securityReviewerAgent:
  VigilAgent =
{
  slug:
    "security-reviewer",

  name:
    "Security Reviewer",

  async execute(
    input: AgentInput,
    context: ExecutionContext
  ): Promise<AgentExecutionResult> {
    /*
     * The public agent input uses:
     *
     * repository: "owner/repo"
     * pullRequest: 42
     *
     * But our GitHub tool abstraction uses:
     *
     * owner
     * repo
     * pullNumber
     */
    const repository =
      requireString(
        input,
        "repository"
      );

    const pullRequest =
      requirePositiveInteger(
        input,
        "pullRequest"
      );

    const {
      owner,
      repo,
    } =
      parseRepository(
        repository
      );

    const pullRequestData =
      await context.tools.github.getPullRequest(
        {
          owner,
          repo,
          pullNumber:
            pullRequest,
        }
      );

    const files =
      await context.tools.github.getPullRequestFiles(
        {
          owner,
          repo,
          pullNumber:
            pullRequest,
        }
      );

    const prompt =
      buildSecurityPrompt(
        repository,
        pullRequest,
        pullRequestData,
        files
      );

    const response =
      await context.llm.generate({
        systemPrompt:
          "You are a security-focused pull request reviewer. Be precise, evidence-based, and avoid speculative vulnerabilities.",

        prompt,
      });

    return {
      output: {
        review:
          response.text,

        model:
          response.model,

        usage:
          response.usage,

        repository,

        pullRequest,

        filesReviewed:
          files.length,
      },
    };
  },
};

export default securityReviewerAgent;