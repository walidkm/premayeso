export const APP_NAME = "PreMayeso";

export const API_BASE_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

export const ADMIN_BASE_URL = (
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.premayeso.com"
).replace(/\/$/, "");

export function getApiUrl(pathname: string): string {
  return `${API_BASE_URL}${pathname}`;
}

export function getAdminUrl(pathname = "/"): string {
  if (!pathname || pathname === "/") {
    return ADMIN_BASE_URL;
  }

  return `${ADMIN_BASE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
