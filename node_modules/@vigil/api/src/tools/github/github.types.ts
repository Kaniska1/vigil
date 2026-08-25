export type GetPullRequestInput = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type PullRequestData = {
  title: string;
  body: string | null;
  state: string;
  author: string;
  baseBranch: string;
  headBranch: string;
};

export type GetPullRequestFilesInput = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export type CreatePullRequestReviewInput = {
  owner: string;
  repo: string;
  pullNumber: number;
  body: string;
};

export type PullRequestReviewData = {
  id: number;
  state: string;
  htmlUrl: string | null;
};