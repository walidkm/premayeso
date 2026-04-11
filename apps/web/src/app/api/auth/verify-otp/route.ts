import { NextResponse } from "next/server";
import { applySessionCookies } from "@/lib/auth-cookies";
import { getApiUrl } from "@/lib/app-config";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const response = await fetch(getApiUrl("/api/v1/auth/verify-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  const nextResponse = NextResponse.json(
    { user: payload.user ?? null },
    { status: 200 }
  );
  applySessionCookies(nextResponse, {
    accessToken: String(payload.accessToken),
    refreshToken: String(payload.refreshToken),
  });

  return nextResponse;
}
