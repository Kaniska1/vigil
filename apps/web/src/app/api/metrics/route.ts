import {
  NextResponse,
} from "next/server";

import {
  createApiToken,
} from "@/lib/api-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function GET(
  request: Request
) {
  try {
    const token =
      await createApiToken();

    const url =
      new URL(request.url);

    const days =
      url.searchParams.get(
        "days"
      ) ?? "30";

    const response =
      await fetch(
        `${API_URL}/api/v1/metrics?days=${encodeURIComponent(
          days
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache:
            "no-store",
        }
      );

    const payload =
      await response.json();

    return NextResponse.json(
      payload,
      {
        status:
          response.status,
      }
    );
  } catch (error) {
    console.error(
      "Metrics proxy failed:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Failed to communicate with Vigil API",
      },
      {
        status: 500,
      }
    );
  }
}