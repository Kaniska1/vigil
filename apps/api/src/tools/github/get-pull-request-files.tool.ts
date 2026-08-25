import type {
  VigilTool,
} from "../tool.types.js";

import {
  githubFetch,
} from "./github-client.js";

import type {
  GetPullRequestFilesInput,
  PullRequestFile,
} from "./github.types.js";

export class GetPullRequestFilesTool
  implements VigilTool<
    GetPullRequestFilesInput,
    PullRequestFile[]
  >
{
  name =
    "github.getPullRequestFiles";

  async execute(
    input: GetPullRequestFilesInput
  ) {
    const {
      owner,
      repo,
      pullNumber,
    } = input;

    const response =
      await githubFetch(
        `/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`
      );

    if (!response.ok) {
      throw new Error(
        `GitHub files request failed with status ${response.status}`
      );
    }

    const data =
      await response.json();

    const files:
      PullRequestFile[] =
      data.map(
        (file: any) => ({
          filename:
            file.filename,

          status:
            file.status,

          additions:
            file.additions,

          deletions:
            file.deletions,

          changes:
            file.changes,

          patch:
            file.patch,
        })
      );

    return {
      data: files,
    };
  }
}