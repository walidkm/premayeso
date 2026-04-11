import { redirect } from "next/navigation";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const loginUrl = requested?.startsWith("/app")
    ? `/login?next=${encodeURIComponent(requested)}`
    : "/login";

  redirect(loginUrl);
}
