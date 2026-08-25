import {
  getRequiredPermissionForTool,
  type VigilPermission,
} from "./tool-permissions.js";

export type ExecutionPolicyDecision = {
  allowed:
    boolean;

  requiredPermission:
    VigilPermission | null;

  reason:
    string;
};

type EvaluateToolPermissionInput = {
  toolName:
    string;

  agentPermissions:
    string[];
};

export function evaluateToolPermission(
  input:
    EvaluateToolPermissionInput
): ExecutionPolicyDecision {
  const requiredPermission =
    getRequiredPermissionForTool(
      input.toolName
    );

  /*
   * ------------------------------------------------
   * Unknown/unclassified tools
   * ------------------------------------------------
   *
   * Default deny is important.
   *
   * If a new tool is added but nobody adds a policy
   * rule for it, it should NOT silently gain access.
   */
  if (!requiredPermission) {
    return {
      allowed:
        false,

      requiredPermission:
        null,

      reason:
        `Tool "${input.toolName}" has no registered execution permission policy.`,
    };
  }

  const allowed =
    input.agentPermissions.includes(
      requiredPermission
    );

  if (!allowed) {
    return {
      allowed:
        false,

      requiredPermission,

      reason:
        `Agent does not have required permission "${requiredPermission}" for tool "${input.toolName}".`,
    };
  }

  return {
    allowed:
      true,

    requiredPermission,

    reason:
      `Agent has permission "${requiredPermission}".`,
  };
}