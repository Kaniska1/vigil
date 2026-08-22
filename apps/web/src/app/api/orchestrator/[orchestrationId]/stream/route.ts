import {
  auth,
} from "@/auth";

import {
  createApiToken,
} from "@/lib/api-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      orchestrationId: string;
    }>;
  }
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

  const {
    orchestrationId,
  } = await context.params;

  const token =
    await createApiToken();

  const upstream =
    await fetch(
      `${API_URL}/api/v1/orchestrator/${encodeURIComponent(
        orchestrationId
      )}/stream`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
          Accept:
            "text/event-stream",
        },
        cache:
          "no-store",
      }
    );

  if (!upstream.ok) {
    const body =
      await upstream.text();

    return new Response(
      body,
      {
        status:
          upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get(
              "Content-Type"
            ) ??
            "application/json",
        },
      }
    );
  }

  if (!upstream.body) {
    return Response.json(
      {
        success: false,
        message:
          "Upstream SSE stream unavailable",
      },
      {
        status: 502,
      }
    );
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