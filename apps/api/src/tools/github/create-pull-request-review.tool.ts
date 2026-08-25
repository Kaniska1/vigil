import type {
  VigilTool,
} from "../tool.types.js";

import {
  githubFetch,
  requireGitHubWriteToken,
} from "./github-client.js";

import type {
  CreatePullRequestReviewInput,
  PullRequestReviewData,
} from "./github.types.js";

export class CreatePullRequestReviewTool
  implements VigilTool<
    CreatePullRequestReviewInput,
    PullRequestReviewData
  >
{
  name =
    "github.createPullRequestReview";

  async execute(
    input: CreatePullRequestReviewInput
  ) {
    requireGitHubWriteToken();

    const {
      owner,
      repo,
      pullNumber,
      body,
    } = input;

    if (!body.trim()) {
      throw new Error(
        "Pull request review body is required"
      );
    }

    const response =
      await githubFetch(
        `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              body:
                body.trim(),

              event:
                "COMMENT",
            }),
        }
      );

    if (!response.ok) {
      const responseBody =
        await response.text();

      throw new Error(
        `GitHub review request failed with status ${response.status}: ${responseBody.slice(
          0,
          500
        )}`
      );
    }

    const data =
      await response.json();

    return {
      data: {
        id:
          data.id,

        state:
          data.state ??
          "COMMENTED",

        htmlUrl:
          data.html_url ??
          null,
      },
    };
  }
}