import type { Metadata } from "next";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { normalizeExamPath } from "@/lib/exam-paths";

export const metadata: Metadata = {
  title: "MSCE and PSLCE waitlist",
  description:
    "Join the PreMayeso waitlist for future MSCE and PSLCE learner rollouts.",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const requested = Array.isArray(params.exam_path) ? params.exam_path[0] : params.exam_path;
  const initialExamPath = normalizeExamPath(requested) ?? "MSCE";

  return <WaitlistForm initialExamPath={initialExamPath} />;
}
