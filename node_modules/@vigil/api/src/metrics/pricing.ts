import type {
  LLMUsage,
} from "../llm/llm.types.js";

type ModelPricing = {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
};

const MODEL_PRICING: Record<
  string,
  ModelPricing
> = {
  "gemini-3.6-flash": {
    inputPerMillionTokens: 1.5,
    outputPerMillionTokens: 7.5,
  },
};

export function estimateLLMCost(
  model: string,
  usage?: LLMUsage
): number | null {
  if (!usage) {
    return null;
  }

  const pricing =
    MODEL_PRICING[model];

  if (!pricing) {
    return null;
  }

  const inputTokens =
    usage.inputTokens ?? 0;

  /*
   * Gemini bills thinking tokens as output.
   *
   * candidatesTokenCount represents generated candidates,
   * while thoughtsTokenCount represents thinking tokens.
   */
  const outputTokens =
    (usage.outputTokens ?? 0) +
    (usage.thinkingTokens ?? 0);

  const inputCost =
    (inputTokens /
      1_000_000) *
    pricing.inputPerMillionTokens;

  const outputCost =
    (outputTokens /
      1_000_000) *
    pricing.outputPerMillionTokens;

  return inputCost + outputCost;
}