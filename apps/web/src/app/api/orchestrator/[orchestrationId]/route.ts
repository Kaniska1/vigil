import {
  auth,
} from "@/auth";

import {
  createApiToken,
} from "@/lib/api-auth";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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

  try {
    const upstream =
      await fetch(
        `${API_URL}/api/v1/orchestrator/${encodeURIComponent(
          orchestrationId
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },

          cache:
            "no-store",
        }
      );

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
              "content-type"
            ) ??
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "[Orchestration Proxy] Failed:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to fetch orchestration",
      },
      {
        status: 502,
      }
    );
  }
}