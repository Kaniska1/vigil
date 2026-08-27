export type VigilPermission =
  | "repository:read"
  | "pull_requests:read"
  | "pull_requests:write";

const TOOL_PERMISSION_MAP:
  Record<
    string,
    VigilPermission
  > = {
  "github.getPullRequest":
    "pull_requests:read",

  "github.getPullRequestFiles":
    "pull_requests:read",

  "github.createPullRequestReview":
    "pull_requests:write",
};

export function getRequiredPermissionForTool(
  toolName: string
): VigilPermission | null {
  return (
    TOOL_PERMISSION_MAP[
      toolName
    ] ?? null
  );
}

export function isKnownPermission(
  value: string
): value is VigilPermission {
  return (
    value ===
      "repository:read" ||
    value ===
      "pull_requests:read" ||
    value ===
      "pull_requests:write"
  );
}