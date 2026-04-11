import { SubjectDetailView } from "@/components/app/SubjectDetailView";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  return <SubjectDetailView subjectId={subjectId} />;
}
