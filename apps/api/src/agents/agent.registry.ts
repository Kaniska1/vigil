import {
  readdir,
} from "node:fs/promises";

import path from "node:path";

import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

import type {
  VigilAgent,
} from "./agent.types.js";

import type {
  AgentDefinition,
  AgentRegistryMetadata,
} from "./agent-definition.types.js";

const currentFile =
  fileURLToPath(
    import.meta.url
  );

const currentDirectory =
  path.dirname(
    currentFile
  );

const definitionsDirectory =
  path.join(
    currentDirectory,
    "definitions"
  );

let definitions =
  new Map<
    string,
    AgentDefinition
  >();

let loaded = false;

let loadingPromise:
  | Promise<void>
  | null = null;

function isDefinitionFile(
  filename: string
) {
  return (
    filename.endsWith(
      ".definition.ts"
    ) ||
    filename.endsWith(
      ".definition.js"
    )
  );
}

function validateDefinition(
  definition: AgentDefinition,
  filename: string
) {
  if (
    !definition ||
    typeof definition !==
      "object"
  ) {
    throw new Error(
      `Agent definition ${filename} is invalid`
    );
  }

  if (
    !definition.metadata
  ) {
    throw new Error(
      `Agent definition ${filename} has no metadata`
    );
  }

  if (
    !definition.implementation
  ) {
    throw new Error(
      `Agent definition ${filename} has no implementation`
    );
  }

  if (
    !definition.metadata.slug
  ) {
    throw new Error(
      `Agent definition ${filename} has no slug`
    );
  }

  if (
    !definition.metadata.name
  ) {
    throw new Error(
      `Agent definition ${filename} has no name`
    );
  }

  if (
    !definition.metadata.version
  ) {
    throw new Error(
      `Agent definition ${filename} has no version`
    );
  }

  if (
    definition.metadata.slug !==
    definition.implementation.slug
  ) {
    throw new Error(
      [
        `Agent definition slug mismatch in ${filename}.`,
        `Metadata slug: ${definition.metadata.slug}.`,
        `Implementation slug: ${definition.implementation.slug}.`,
      ].join(" ")
    );
  }
}

async function loadDefinitions() {
  if (loaded) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise =
    (async () => {
      /*
       * Build into a temporary map first.
       *
       * If any definition fails validation,
       * the live registry remains untouched.
       */
      const nextDefinitions =
        new Map<
          string,
          AgentDefinition
        >();

      const files =
        await readdir(
          definitionsDirectory
        );

      const definitionFiles =
        files.filter(
          isDefinitionFile
        );

      for (
        const filename of
        definitionFiles
      ) {
        const fullPath =
          path.join(
            definitionsDirectory,
            filename
          );

        const moduleUrl =
          pathToFileURL(
            fullPath
          ).href;

        const importedModule =
          await import(
            moduleUrl
          );

        const definition =
          importedModule.default as
            | AgentDefinition
            | undefined;

        if (!definition) {
          throw new Error(
            `Agent definition ${filename} does not export a default AgentDefinition`
          );
        }

        validateDefinition(
          definition,
          filename
        );

        const slug =
          definition.metadata.slug;

        if (
          nextDefinitions.has(
            slug
          )
        ) {
          throw new Error(
            `Duplicate agent slug registered: ${slug}`
          );
        }

        nextDefinitions.set(
          slug,
          definition
        );

        console.log(
          `[Vigil Registry] Discovered ${slug}@${definition.metadata.version}`
        );
      }

      /*
       * Only publish the new registry after
       * every definition has loaded and
       * validated successfully.
       */
      definitions =
        nextDefinitions;

      loaded = true;

      console.log(
        `[Vigil Registry] Loaded ${definitions.size} agent definition(s)`
      );
    })();

  try {
    await loadingPromise;
  } catch (error) {
    /*
     * A failed load must remain retryable.
     */
    loaded = false;

    throw error;
  } finally {
    loadingPromise =
      null;
  }
}

export async function getAgentImplementation(
  slug: string
): Promise<
  VigilAgent | undefined
> {
  await loadDefinitions();

  return definitions.get(
    slug
  )?.implementation;
}

export async function getAgentDefinition(
  slug: string
): Promise<
  AgentDefinition | undefined
> {
  await loadDefinitions();

  return definitions.get(
    slug
  );
}

export async function getAgentDefinitions():
  Promise<
    AgentDefinition[]
  > {
  await loadDefinitions();

  return Array.from(
    definitions.values()
  );
}

export async function getAgentMetadata():
  Promise<
    AgentRegistryMetadata[]
  > {
  await loadDefinitions();

  return Array.from(
    definitions.values()
  ).map(
    (definition) =>
      definition.metadata
  );
}