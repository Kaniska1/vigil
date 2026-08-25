import type {
  AgentDefinition,
} from "../agent-definition.types.js";

import {
  googleSearchResearcherAgent,
} from "../google-search-researcher.agent.js";

const googleSearchResearcherDefinition:
  AgentDefinition = {
  metadata: {
    slug:
      "google-search-researcher",

    name:
      "Google Search Researcher",

    description:
      "Researches current external information using Google ADK, Gemini, and Google Search, then returns a concise evidence-based synthesis.",

    version:
      "1.0.0",

    capabilities: [
      "web-research",
      "information-retrieval",
    ],

    tools: [
      "google.search",
    ],

    permissions: [
      "web.read",
    ],

    inputSchema: {
      query: {
        type:
          "string",

        description:
          "Research objective or question to investigate.",

        required:
          true,
      },
    },

    outputSchema: {
      research: {
        type:
          "json",

        description:
          "Research synthesis produced by the Google ADK worker.",
      },
    },

    category:
      "research",
  },

  implementation:
    googleSearchResearcherAgent,
};

export default googleSearchResearcherDefinition;