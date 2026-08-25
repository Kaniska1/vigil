import type { VigilTool } from "../tool.types.js";

import {
  githubFetch,
} from "./github-client.js";

import type {
  GetPullRequestInput,
  PullRequestData,
} from "./github.types.js";

export class GetPullRequestTool
  implements VigilTool<
    GetPullRequestInput,
    PullRequestData
  >
{
  name = "github.getPullRequest";

  async execute(
    input: GetPullRequestInput
  ) {
    const {
      owner,
      repo,
      pullNumber,
    } = input;

    const response =
      await githubFetch(
        `/repos/${owner}/${repo}/pulls/${pullNumber}`
      );

    if (!response.ok) {
      throw new Error(
        `GitHub API request failed with status ${response.status}`
      );
    }

    const data =
      await response.json();

    return {
      data: {
        title:
          data.title,

        body:
          data.body,

        state:
          data.state,

        author:
          data.user?.login ??
          "unknown",

        baseBranch:
          data.base?.ref ?? "",

        headBranch:
          data.head?.ref ?? "",
      },
    };
  }
}