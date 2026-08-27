import {
  VigilHttpClient,
} from "./http-client.js";

import type {
  MetricsResponse,
} from "./types.js";

export class MetricsClient {
  constructor(
    private readonly http:
      VigilHttpClient
  ) {}

  get(
    options: {
      days?: number;
    } = {}
  ) {
    const days =
      options.days;

    const query =
      typeof days ===
      "number"
        ? `?days=${encodeURIComponent(
            days
          )}`
        : "";

    return this.http.request<
      MetricsResponse
    >(
      `/api/v1/metrics${query}`
    );
  }
}