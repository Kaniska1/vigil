import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { createApiToken } from "@/lib/api-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      runId: string;
    }>;
  }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Unauthorized",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const { runId } = await context.params;

  const token = await createApiToken();

  const upstream = await fetch(
    `${API_URL}/api/v1/runs/${runId}/stream`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },

      cache: "no-store",

      signal: request.signal,
    }
  );

  if (!upstream.ok || !upstream.body) {
    const message =
      await upstream.text();

    return new Response(message, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get(
            "Content-Type"
          ) ?? "application/json",
      },
    });
  }

  return new Response(
    upstream.body,
    {
      status: 200,

      headers: {
        "Content-Type":
          "text/event-stream",

        "Cache-Control":
          "no-cache, no-transform",

        Connection:
          "keep-alive",
      },
    }
  );
}