import { redirect } from "next/navigation";
import { getAdminUrl } from "@/lib/app-config";

export default async function AdminRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const [{ slug = [] }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const adminPath = slug.length > 0 ? `/${slug.join("/")}` : "/";
  const adminUrl = new URL(getAdminUrl(adminPath));

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          adminUrl.searchParams.append(key, item);
        }
      }
      continue;
    }

    if (value) {
      adminUrl.searchParams.set(key, value);
    }
  }

  redirect(adminUrl.toString());
}
