import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { StudentSessionProvider } from "@/components/app/StudentSessionProvider";
import { StudentShell } from "@/components/app/StudentShell";
import { hasStudentSessionCookie } from "@/lib/auth-cookies";

export default async function LearnerAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const hasSession = await hasStudentSessionCookie();
  if (!hasSession) {
    redirect("/login");
  }

  return (
    <StudentSessionProvider>
      <StudentShell>{children}</StudentShell>
    </StudentSessionProvider>
  );
}
