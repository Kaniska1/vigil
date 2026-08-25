export type VigilPermission =
  | "github.read"
  | "github.write";

const TOOL_PERMISSION_MAP:
  Record<
    string,
    VigilPermission
  > = {
  "github.getPullRequest":
    "github.read",

  "github.getPullRequestFiles":
    "github.read",

  "github.createPullRequestReview":
    "github.write",
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
      "github.read" ||
    value ===
      "github.write"
  );
}