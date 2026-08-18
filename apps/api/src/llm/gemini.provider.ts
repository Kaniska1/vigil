import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "./llm.types.js";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const combinedPrompt = [
      request.systemPrompt
        ? `System instructions:\n${request.systemPrompt}`
        : null,
      `User request:\n${request.prompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: "gemini-3.6-flash",
          contents: combinedPrompt,
        });

        return {
          text: response.text ?? "",
          model: "gemini-3.6-flash",
        };
      } catch (error: any) {
        const status = error?.status;

        const retryable =
          status === 429 ||
          status === 503;

        if (!retryable || attempt === maxRetries) {
          throw error;
        }

        const delay = 1000 * 2 ** attempt;

        console.warn(
          `Gemini unavailable. Retrying in ${delay}ms...`
        );

        await sleep(delay);
      }
    }

    throw new Error("Gemini request failed");
  }
}