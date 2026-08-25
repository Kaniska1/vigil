import type {
  LLMRequest,
  LLMResponse,
} from "../llm/llm.types.js";

import type {
  GetPullRequestInput,
  GetPullRequestFilesInput,
  CreatePullRequestReviewInput,
  PullRequestData,
  PullRequestFile,
  PullRequestReviewData,
} from "../tools/github/github.types.js";

export interface ExecutionContext {
  runId: string;

  llm: {
    generate(request: LLMRequest): Promise<LLMResponse>;
  };

  tools: {
  github: {
    getPullRequest(
      input: GetPullRequestInput
    ): Promise<PullRequestData>;

    getPullRequestFiles(
      input: GetPullRequestFilesInput
    ): Promise<PullRequestFile[]>;

    createPullRequestReview(
      input: CreatePullRequestReviewInput
    ): Promise<PullRequestReviewData>;
  };
};

  trace(
    type:
      | "RUN_STARTED"
      | "AGENT_STARTED"
      | "TOOL_CALLED"
      | "TOOL_COMPLETED"
      | "LLM_STARTED"
      | "LLM_COMPLETED"
      | "RUN_COMPLETED"
      | "ERROR",
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
}