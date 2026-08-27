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
  _request: Request,
  context: {
    params:
      Promise<{
        agentId: string;
      }>;
  }
) {
  try {
    const {
      agentId,
    } =
      await context.params;

    const token =
      await createApiToken();

    const response =
      await fetch(
        `${API_URL}/api/v1/agents/published/${agentId}`,
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
      "Failed to proxy published agent:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch published agent",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params:
      Promise<{
        agentId: string;
      }>;
  }
) {
  try {
    const {
      agentId,
    } =
      await context.params;

    const token =
      await createApiToken();

    const body =
      await request.json();

    const response =
      await fetch(
        `${API_URL}/api/v1/agents/published/${agentId}`,
        {
          method:
            "PATCH",

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
      "Failed to proxy published agent update:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update published agent",
      },
      {
        status: 500,
      }
    );
  }
}