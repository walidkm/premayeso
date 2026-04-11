import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/app-config";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const response = await fetch(getApiUrl("/api/v1/waitlist"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
