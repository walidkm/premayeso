import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "./session-constants";

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function applySessionCookies(
  response: NextResponse,
  session: { accessToken: string; refreshToken: string }
) {
  response.cookies.set(ACCESS_COOKIE_NAME, session.accessToken, BASE_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE_NAME, session.refreshToken, BASE_COOKIE_OPTIONS);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export async function readSessionTokens() {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null,
  };
}

export async function hasStudentSessionCookie(): Promise<boolean> {
  const { accessToken, refreshToken } = await readSessionTokens();
  return Boolean(accessToken || refreshToken);
}
