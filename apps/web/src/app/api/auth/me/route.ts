import { NextResponse } from "next/server";
import {
  applySessionCookies,
  clearSessionCookies,
  readSessionTokens,
} from "@/lib/auth-cookies";
import { getApiUrl } from "@/lib/app-config";

async function fetchMe(accessToken: string) {
  return fetch(getApiUrl("/api/v1/auth/me"), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

async function refreshSession(refreshToken: string) {
  const response = await fetch(getApiUrl("/api/v1/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

export async function GET() {
  const { accessToken, refreshToken } = await readSessionTokens();

  if (accessToken) {
    const meResponse = await fetchMe(accessToken);
    const mePayload = await meResponse.json().catch(() => ({}));
    if (meResponse.ok) {
      return NextResponse.json(mePayload, { status: 200 });
    }
  }

  if (!refreshToken) {
    const response = NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
    clearSessionCookies(response);
    return response;
  }

  const { response: refreshResponse, payload } = await refreshSession(refreshToken);
  if (!refreshResponse.ok) {
    const response = NextResponse.json(payload, { status: refreshResponse.status });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json(payload.user ?? null, { status: 200 });
  applySessionCookies(response, {
    accessToken: String(payload.accessToken),
    refreshToken: String(payload.refreshToken),
  });
  return response;
}
