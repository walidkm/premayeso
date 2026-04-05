const API_URL = "http://192.168.1.4:4000";

export type Subject = {
  id: string;
  name: string;
  description: string | null;
};

export type Topic = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
};

export async function getSubjects(): Promise<Subject[]> {
  const res = await fetch(`${API_URL}/subjects`);
  if (!res.ok) throw new Error("Failed to fetch subjects");
  return res.json();
}

export async function getTopics(subjectId: string): Promise<Topic[]> {
  const res = await fetch(`${API_URL}/subjects/${subjectId}/topics`);
  if (!res.ok) throw new Error("Failed to fetch topics");
  return res.json();
}
