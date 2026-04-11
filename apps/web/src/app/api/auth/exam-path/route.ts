import { NextResponse } from "next/server";
import {
  applySessionCookies,
  clearSessionCookies,
  readSessionTokens,
} from "@/lib/auth-cookies";
import { getApiUrl } from "@/lib/app-config";

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

async function updateExamPath(accessToken: string, examPath: string) {
  const response = await fetch(getApiUrl("/api/v1/auth/exam-path"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ exam_path: examPath }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const examPath = typeof body.exam_path === "string" ? body.exam_path : "";
  const { accessToken, refreshToken } = await readSessionTokens();

  let activeAccessToken = accessToken;
  let nextAccessToken: string | null = null;
  let nextRefreshToken: string | null = null;

  if (!activeAccessToken && refreshToken) {
    const refreshed = await refreshSession(refreshToken);
    if (!refreshed.response.ok) {
      const response = NextResponse.json(refreshed.payload, {
        status: refreshed.response.status,
      });
      clearSessionCookies(response);
      return response;
    }

    activeAccessToken = String(refreshed.payload.accessToken);
    nextAccessToken = activeAccessToken;
    nextRefreshToken = String(refreshed.payload.refreshToken);
  }

  if (!activeAccessToken) {
    const response = NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
    clearSessionCookies(response);
    return response;
  }

  let result = await updateExamPath(activeAccessToken, examPath);
  if (result.response.status === 401 && refreshToken) {
    const refreshed = await refreshSession(refreshToken);
    if (!refreshed.response.ok) {
      const response = NextResponse.json(refreshed.payload, {
        status: refreshed.response.status,
      });
      clearSessionCookies(response);
      return response;
    }

    activeAccessToken = String(refreshed.payload.accessToken);
    nextAccessToken = activeAccessToken;
    nextRefreshToken = String(refreshed.payload.refreshToken);
    result = await updateExamPath(activeAccessToken, examPath);
  }

  const response = NextResponse.json(result.payload, {
    status: result.response.status,
  });

  if (!result.response.ok) {
    if (result.response.status === 401) {
      clearSessionCookies(response);
    }
    return response;
  }

  if (nextAccessToken && nextRefreshToken) {
    applySessionCookies(response, {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    });
  }

  return response;
}
