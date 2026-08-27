import { VigilError } from "./errors.js";

type RequestOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

export class VigilHttpClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch
  ) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl.replace(/\/+$/, "")}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });

    const contentType = response.headers.get("content-type");
    const payload: unknown = contentType?.includes("application/json")
      ? await response.json()
      : ((await response.text()) || null);

    if (!response.ok) {
      const body = payload as { message?: string; code?: string } | null;
      throw new VigilError(body?.message ?? `Vigil API request failed with status ${response.status}`, {
        status: response.status,
        code: body?.code,
        details: payload,
      });
    }

    if (payload && typeof payload === "object" && "success" in payload) {
      const envelope = payload as { success: boolean; data?: T; message?: string };
      if (!envelope.success) {
        throw new VigilError(envelope.message ?? "Vigil API request failed", {
          status: response.status,
          details: payload,
        });
      }
      return envelope.data as T;
    }

    return payload as T;
  }
}
