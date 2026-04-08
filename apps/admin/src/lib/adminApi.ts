const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type ApiErrorResponse = {
  error?: string;
};

export function getApiUrl(pathname: string): string {
  return `${API_URL}${pathname}`;
}

export async function requestJson<T>(pathname: string, init: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(pathname), init);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(payload.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

export async function requestMultipartJson<T>(
  pathname: string,
  token: string,
  method: "POST" | "PATCH",
  body: FormData
): Promise<T> {
  const response = await fetch(getApiUrl(pathname), {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(payload.error ?? "Request failed");
  }

  return (await response.json()) as T;
}
