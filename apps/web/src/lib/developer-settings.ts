export type VigilDeveloperSettings = {
  semanticEvaluation: boolean;
  maxReplans: number;
  autoExecute: boolean;
};

export const DEFAULT_VIGIL_DEVELOPER_SETTINGS:
  VigilDeveloperSettings = {
  semanticEvaluation: true,
  maxReplans: 2,
  autoExecute: false,
};

const STORAGE_KEY =
  "vigil:developer-settings:v1";

export function normalizeDeveloperSettings(
  value: Partial<VigilDeveloperSettings> | null | undefined
): VigilDeveloperSettings {
  const rawMaxReplans =
    Number(value?.maxReplans);

  return {
    semanticEvaluation:
      value?.semanticEvaluation !== false,

    maxReplans:
      Number.isInteger(rawMaxReplans)
        ? Math.min(
            3,
            Math.max(
              0,
              rawMaxReplans
            )
          )
        : DEFAULT_VIGIL_DEVELOPER_SETTINGS.maxReplans,

    autoExecute:
      value?.autoExecute === true,
  };
}

export function loadDeveloperSettings():
  VigilDeveloperSettings {
  if (typeof window === "undefined") {
    return DEFAULT_VIGIL_DEVELOPER_SETTINGS;
  }

  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return DEFAULT_VIGIL_DEVELOPER_SETTINGS;
    }

    return normalizeDeveloperSettings(
      JSON.parse(raw)
    );
  } catch {
    return DEFAULT_VIGIL_DEVELOPER_SETTINGS;
  }
}

export function saveDeveloperSettings(
  settings: VigilDeveloperSettings
) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      normalizeDeveloperSettings(
        settings
      )
    )
  );
}
