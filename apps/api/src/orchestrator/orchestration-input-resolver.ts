import type {
  AgentFileType,
  AgentInputSchema,
  VigilFileReference,
} from "../agents/agent-definition.types.js";

import type {
  MissingOrchestrationInput,
  OrchestrationExecutionStep,
} from "./orchestrator.types.js";

type JsonContext =
  Record<
    string,
    unknown
  >;

function isRecord(
  value:
    unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function getFileExtension(
  fileName:
    string
): string | null {
  const normalized =
    fileName
      .trim()
      .toLowerCase();

  const index =
    normalized.lastIndexOf(
      "."
    );

  if (
    index <=
      0 ||
    index ===
      normalized.length -
        1
  ) {
    return null;
  }

  return normalized.slice(
    index +
      1
  );
}

function isVigilFileReference(
  value:
    unknown
): value is VigilFileReference {
  if (
    !isRecord(
      value
    )
  ) {
    return false;
  }

  return (
    value.kind ===
      "file" &&
    typeof value.id ===
      "string" &&
    value.id.trim().length >
      0 &&
    typeof value.name ===
      "string" &&
    value.name.trim().length >
      0 &&
    typeof value.mimeType ===
      "string" &&
    value.mimeType.trim().length >
      0 &&
    typeof value.size ===
      "number" &&
    Number.isFinite(
      value.size
    ) &&
    value.size >=
      0 &&
    typeof value.storageKey ===
      "string" &&
    value.storageKey.trim().length >
      0
  );
}

function hasUsablePrimitiveValue(
  value:
    unknown
): boolean {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return false;
  }

  if (
    typeof value ===
      "string" &&
    !value.trim()
  ) {
    return false;
  }

  return true;
}

function hasUsableFileValue(
  value:
    unknown,
  acceptedFileTypes?:
    AgentFileType[],
  maxFileSizeBytes?:
    number
): boolean {
  if (
    !isVigilFileReference(
      value
    )
  ) {
    return false;
  }

  if (
    acceptedFileTypes &&
    acceptedFileTypes.length >
      0
  ) {
    const extension =
      getFileExtension(
        value.name
      );

    if (
      !extension ||
      !acceptedFileTypes.includes(
        extension as AgentFileType
      )
    ) {
      return false;
    }
  }

  if (
    typeof maxFileSizeBytes ===
      "number" &&
    Number.isFinite(
      maxFileSizeBytes
    ) &&
    maxFileSizeBytes >=
      0 &&
    value.size >
      maxFileSizeBytes
  ) {
    return false;
  }

  return true;
}

function hasUsableValue(
  context:
    JsonContext,
  key:
    string,
  definition:
    AgentInputSchema[string]
): boolean {
  if (
    !Object.prototype.hasOwnProperty.call(
      context,
      key
    )
  ) {
    return false;
  }

  const value =
    context[key];

  if (
    definition.type ===
      "file"
  ) {
    return hasUsableFileValue(
      value,
      definition.acceptedFileTypes,
      definition.maxFileSizeBytes
    );
  }

  return hasUsablePrimitiveValue(
    value
  );
}

export function resolveMissingOrchestrationInputs(
  executionSteps:
    OrchestrationExecutionStep[],
  context:
    JsonContext = {}
):
  MissingOrchestrationInput[] {
  const missing =
    new Map<
      string,
      MissingOrchestrationInput
    >();

  for (
    const step of
    executionSteps
  ) {
    if (
      step.kind !==
      "AGENT"
    ) {
      continue;
    }

    const schema:
      AgentInputSchema =
      step.agent.inputSchema;

    for (
      const [
        key,
        definition,
      ] of
      Object.entries(
        schema
      )
    ) {
      if (
        !definition.required
      ) {
        continue;
      }

      if (
        hasUsableValue(
          context,
          key,
          definition
        )
      ) {
        continue;
      }

      const existing =
        missing.get(
          key
        );

      const requiredByAgent = {
        agentId:
          step.agent.id,

        agentSlug:
          step.agent.slug,

        agentName:
          step.agent.name,
      };

      if (existing) {
        if (
          !existing.requiredBy.some(
            (
              agent
            ) =>
              agent.agentId ===
              step.agent.id
          )
        ) {
          existing.requiredBy.push(
            requiredByAgent
          );
        }

        /*
         * If multiple selected agents require the
         * same file input, preserve the stricter
         * constraints in the merged missing-input
         * description.
         */
        if (
          definition.type ===
            "file" &&
          existing.type ===
            "file"
        ) {
          if (
            definition.acceptedFileTypes
              ?.length
          ) {
            const current =
              existing.acceptedFileTypes ??
              [];

            existing.acceptedFileTypes =
              [
                ...new Set([
                  ...current,
                  ...definition.acceptedFileTypes,
                ]),
              ];
          }

          if (
            typeof definition.maxFileSizeBytes ===
              "number"
          ) {
            existing.maxFileSizeBytes =
              typeof existing.maxFileSizeBytes ===
                "number"
                ? Math.min(
                    existing.maxFileSizeBytes,
                    definition.maxFileSizeBytes
                  )
                : definition.maxFileSizeBytes;
          }
        }

        continue;
      }

      missing.set(
        key,
        {
          key,

          type:
            definition.type,

          description:
            definition.description,

          acceptedFileTypes:
            definition.type ===
              "file"
              ? definition.acceptedFileTypes
              : undefined,

          maxFileSizeBytes:
            definition.type ===
              "file"
              ? definition.maxFileSizeBytes
              : undefined,

          requiredBy: [
            requiredByAgent,
          ],
        }
      );
    }
  }

  return [
    ...missing.values(),
  ];
}
