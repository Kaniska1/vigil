export type LLMRequest = {
  systemPrompt?: string;
  prompt: string;
};

export type LLMUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type LLMResponse = {
  text: string;
  model: string;
  usage?: LLMUsage;
};

export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
}