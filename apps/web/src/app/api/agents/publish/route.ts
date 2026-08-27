import {
  NextResponse,
} from "next/server";

import {
  createApiToken,
} from "@/lib/api-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function POST(
  request: Request
) {
  try {
    const token =
      await createApiToken();

    const body =
      await request.json();

    const response =
      await fetch(
        `${API_URL}/api/v1/agents/publish`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              body
            ),

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
      "Failed to proxy agent publish:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to publish agent",
      },
      {
        status: 500,
      }
    );
  }
}
