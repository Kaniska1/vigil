import {
  GOOGLE_SEARCH,
  LlmAgent,
} from "@google/adk";

import {
  createAdkAgentAdapter,
} from "./adk/adk-agent.adapter.js";

const model =
  process.env
    .VIGIL_ADK_MODEL ??
  "gemini-flash-latest";

const adkResearchAgent =
  new LlmAgent({
    name:
      "vigil_google_search_researcher",

    description:
      "Researches current information using Google Search and returns a concise evidence-based synthesis.",

    model,

    instruction:
      [
        "You are a research specialist operating as a worker inside Vigil.",
        "Use Google Search whenever the task depends on current or externally verifiable information.",
        "Answer the requested research objective directly.",
        "Distinguish confirmed facts from uncertainty.",
        "Prefer primary or authoritative sources where possible.",
        "Return a concise synthesis that another supervisory agent can evaluate.",
        "Do not discuss orchestration, agent selection, or Vigil's internal planning.",
      ].join(
        " "
      ),

    tools: [
      GOOGLE_SEARCH,
    ],
  });

export const googleSearchResearcherAgent =
  createAdkAgentAdapter({
    slug:
      "google-search-researcher",

    name:
      "Google Search Researcher",

    agent:
      adkResearchAgent,

    buildPrompt(
      input
    ) {
      const query =
        input.query;

      if (
        typeof query !==
          "string" ||
        !query.trim()
      ) {
        throw new Error(
          "query is required"
        );
      }

      return query.trim();
    },
  });
