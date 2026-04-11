import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/session-constants";

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value ||
      request.cookies.get(REFRESH_COOKIE_NAME)?.value
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionExists = hasSessionCookie(request);

  // Protect /app/* — unauthenticated visitors go to /login
  if (pathname.startsWith("/app") && !sessionExists) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/app") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Already logged-in visitors hitting /login or /signup go straight to /app
  if ((pathname === "/login" || pathname === "/signup") && sessionExists) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    appUrl.search = "";
    return NextResponse.redirect(appUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
