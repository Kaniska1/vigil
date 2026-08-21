import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { createApiToken } from "@/lib/api-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      slug: string;
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

  const { slug } =
    await context.params;

  const token =
    await createApiToken();

  const body =
    await request.text();

  const upstream =
    await fetch(
      `${API_URL}/api/v1/agents/${slug}/runs`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body,

        cache: "no-store",
      }
    );

  const responseBody =
    await upstream.text();

  return new Response(
    responseBody,
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