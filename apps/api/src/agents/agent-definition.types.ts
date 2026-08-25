import type {
  VigilAgent,
} from "./agent.types.js";

export type AgentFileType =
  | "pdf"
  | "docx"
  | "txt"
  | "csv"
  | "xlsx"
  | "zip";

export type VigilFileReference = {
  kind:
    "file";

  id:
    string;

  name:
    string;

  mimeType:
    string;

  size:
    number;

  storageKey:
    string;
};

export type AgentInputField =
  | {
      type:
        | "string"
        | "number"
        | "boolean"
        | "json";

      description:
        string;

      required:
        boolean;
    }
  | {
      type:
        "file";

      description:
        string;

      required:
        boolean;

      acceptedFileTypes?:
        AgentFileType[];

      maxFileSizeBytes?:
        number;
    };

export type AgentInputSchema =
  Record<
    string,
    AgentInputField
  >;

export type AgentOutputSchema =
  Record<
    string,
    {
      type:
        | "string"
        | "number"
        | "boolean"
        | "json"
        | "array";

      description:
        string;
    }
  >;

export type AgentRegistryMetadata = {
  slug:
    string;

  name:
    string;

  description:
    string;

  version:
    string;

  capabilities:
    string[];

  tools:
    string[];

  permissions:
    string[];

  inputSchema:
    AgentInputSchema;

  outputSchema?:
    AgentOutputSchema;

  category:
    | string
    | null;
};

export type AgentDefinition = {
  metadata:
    AgentRegistryMetadata;

  implementation:
    VigilAgent;
};
