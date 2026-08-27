export type OrchestrationSettings = {
  semanticEvaluation: boolean;
  maxReplans: number;
};

export const DEFAULT_ORCHESTRATION_SETTINGS:
  OrchestrationSettings = {
  semanticEvaluation: true,
  maxReplans: 2,
};

export function normalizeOrchestrationSettings(
  value: unknown
): OrchestrationSettings {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return DEFAULT_ORCHESTRATION_SETTINGS;
  }

  const candidate =
    value as Record<string, unknown>;

  const rawMaxReplans =
    Number(
      candidate.maxReplans
    );

  return {
    semanticEvaluation:
      candidate.semanticEvaluation !==
      false,

    maxReplans:
      Number.isInteger(
        rawMaxReplans
      )
        ? Math.min(
            3,
            Math.max(
              0,
              rawMaxReplans
            )
          )
        : DEFAULT_ORCHESTRATION_SETTINGS.maxReplans,
  };
}
