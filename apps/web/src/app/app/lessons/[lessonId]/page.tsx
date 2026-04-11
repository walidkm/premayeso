import { LessonDetailView } from "@/components/app/LessonDetailView";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  return <LessonDetailView lessonId={lessonId} />;
}
