import { redirect } from "next/navigation";
import { getAdminUrl } from "@/lib/app-config";

export default async function AdminRedirectPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const adminPath = slug.length > 0 ? `/${slug.join("/")}` : "/";
  redirect(getAdminUrl(adminPath));
}
