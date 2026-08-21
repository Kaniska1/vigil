import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { createApiToken } from "@/lib/api-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function GET(
  request: NextRequest
) {
  const session =
    await auth();

  if (!session?.user?.id) {
    return Response.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const token =
    await createApiToken();

  const limit =
    request.nextUrl.searchParams.get(
      "limit"
    );

  const query =
    limit
      ? `?limit=${encodeURIComponent(
          limit
        )}`
      : "";

  const upstream =
    await fetch(
      `${API_URL}/api/v1/runs${query}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        cache: "no-store",
      }
    );

  const body =
    await upstream.text();

  return new Response(body, {
    status: upstream.status,

    headers: {
      "Content-Type":
        upstream.headers.get(
          "Content-Type"
        ) ??
        "application/json",
    },
  });
}