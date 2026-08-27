import { NextResponse } from "next/server";
import { createApiToken } from "@/lib/api-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET(
  _request: Request,
  context: { params: Promise<{ apiKeyId: string }> }
) {
  try {
    const { apiKeyId } = await context.params;
    const token = await createApiToken();
    const response = await fetch(`${API_URL}/api/v1/api-keys/${apiKeyId}/reveal`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("API key reveal proxy failed:", error);
    return NextResponse.json({ success: false, message: "Failed to reveal API key" }, { status: 500 });
  }
}
