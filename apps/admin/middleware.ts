import { type NextRequest } from "next/server";
import { createProxyClient } from "./src/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createProxyClient(request);
  // Refresh the session so it doesn't expire mid-request
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
