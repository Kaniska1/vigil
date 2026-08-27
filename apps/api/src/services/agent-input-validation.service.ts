import type {
  AgentInput,
} from "../agents/agent.types.js";

type InputField = {
  type:
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "file";
  required?: boolean;
};

type InputSchema =
  Record<string, InputField>;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseSchema(
  value: unknown
): InputSchema {
  if (!isRecord(value)) {
    return {};
  }

  const schema: InputSchema = {};

  for (
    const [key, rawField]
    of Object.entries(value)
  ) {
    if (!isRecord(rawField)) {
      continue;
    }

    const type =
      rawField.type;

    if (
      type !== "string" &&
      type !== "number" &&
      type !== "boolean" &&
      type !== "json" &&
      type !== "file"
    ) {
      continue;
    }

    schema[key] = {
      type,
      required:
        rawField.required === true,
    };
  }

  return schema;
}

function isFileReference(
  value: unknown
) {
  return (
    isRecord(value) &&
    value.kind === "file" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.mimeType === "string" &&
    typeof value.size === "number" &&
    typeof value.storageKey === "string"
  );
}

function typeMatches(
  type: InputField["type"],
  value: unknown
) {
  switch (type) {
    case "string":
      return (
        typeof value === "string" &&
        value.trim().length > 0
      );

    case "number":
      return (
        typeof value === "number" &&
        Number.isFinite(value)
      );

    case "boolean":
      return (
        typeof value === "boolean"
      );

    case "json":
      return value !== undefined;

    case "file":
      return isFileReference(value);
  }
}

export function validateAgentInput(
  rawInput: unknown,
  rawSchema: unknown
):
  | {
      valid: true;
      value: AgentInput;
    }
  | {
      valid: false;
      errors: string[];
    } {
  if (!isRecord(rawInput)) {
    return {
      valid: false,
      errors: [
        "Agent input must be a JSON object.",
      ],
    };
  }

  const schema =
    parseSchema(rawSchema);

  const errors: string[] = [];

  for (
    const [key, field]
    of Object.entries(schema)
  ) {
    const value =
      rawInput[key];

    const missing =
      value === undefined ||
      value === null ||
      (
        field.type === "string" &&
        typeof value === "string" &&
        value.trim().length === 0
      );

    if (missing) {
      if (field.required) {
        errors.push(
          `${key} is required`
        );
      }
      continue;
    }

    if (
      !typeMatches(
        field.type,
        value
      )
    ) {
      errors.push(
        `${key} must be of type ${field.type}`
      );
    }
  }

  if (errors.length) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    value: rawInput,
  };
}
