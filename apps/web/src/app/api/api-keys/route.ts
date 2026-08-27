import { NextResponse } from "next/server";

import { createApiToken } from "@/lib/api-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

async function proxy(
  method: "GET" | "POST",
  body?: unknown
) {
  try {
    const token =
      await createApiToken();

    const response =
      await fetch(
        `${API_URL}/api/v1/api-keys`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body
              ? {
                  "Content-Type":
                    "application/json",
                }
              : {}),
          },
          ...(body
            ? {
                body:
                  JSON.stringify(body),
              }
            : {}),
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
      "API key proxy failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to communicate with Vigil API",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return proxy("GET");
}

export async function POST(
  request: Request
) {
  const body =
    await request.json();

  return proxy(
    "POST",
    body
  );
}
