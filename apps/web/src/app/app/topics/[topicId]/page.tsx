import { TopicDetailView } from "@/components/app/TopicDetailView";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  return <TopicDetailView topicId={topicId} />;
}
