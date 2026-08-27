import {
  VigilError,
} from "./errors.js";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export class VigilHttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(input: {
    apiKey: string;
    baseUrl: string;
    fetchImpl: typeof fetch;
  }) {
    this.apiKey = input.apiKey;
    this.baseUrl = input.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = input.fetchImpl;
  }

  async raw(
    path: string,
    init: RequestInit = {}
  ) {
    const headers = new Headers(init.headers);

    headers.set(
      "Authorization",
      `Bearer ${this.apiKey}`
    );

    if (!headers.has("Accept")) {
      headers.set(
        "Accept",
        "application/json"
      );
    }

    const response =
      await this.fetchImpl(
        `${this.baseUrl}${path}`,
        {
          ...init,
          headers,
        }
      );

    if (response.ok) {
      return response;
    }

    const contentType =
      response.headers.get("content-type");

    const payload =
      contentType?.includes("application/json")
        ? await response.json().catch(() => null)
        : await response.text().catch(() => "");

    const body =
      payload as
        | {
            message?: string;
            code?: string;
          }
        | null;

    throw new VigilError(
      body?.message ??
        `Vigil API request failed with status ${response.status}`,
      {
        status: response.status,
        code: body?.code,
        details: payload,
      }
    );
  }

  async request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const response =
      await this.raw(
        path,
        {
          method:
            options.method ??
            "GET",
          headers: {
            Accept:
              "application/json",
            ...(options.body !== undefined
              ? {
                  "Content-Type":
                    "application/json",
                }
              : {}),
          },
          ...(options.body !== undefined
            ? {
                body:
                  JSON.stringify(options.body),
              }
            : {}),
        }
      );

    const contentType =
      response.headers.get("content-type");

    let payload: unknown = null;

    if (
      contentType?.includes("application/json")
    ) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text || null;
    }

    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload
    ) {
      const envelope =
        payload as {
          success: boolean;
          data?: T;
          message?: string;
        };

      if (envelope.success === false) {
        throw new VigilError(
          envelope.message ??
            "Vigil API request failed",
          {
            status: response.status,
            details: payload,
          }
        );
      }

      return envelope.data as T;
    }

    return payload as T;
  }
}
