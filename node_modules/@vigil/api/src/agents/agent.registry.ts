import type { VigilAgent } from "./agent.types.js";
import { githubReviewerAgent } from "./github-reviewer.agent.js";

const agents = new Map<string, VigilAgent>();

agents.set(githubReviewerAgent.slug, githubReviewerAgent);

export const getAgentImplementation = (
  slug: string
): VigilAgent | undefined => {
  return agents.get(slug);
};