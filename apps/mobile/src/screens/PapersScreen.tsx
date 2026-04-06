import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getPapers, ExamPaper } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Papers">;

const SOURCE_LABEL: Record<string, string> = {
  maneb:   "MANEB",
  school:  "School",
  teacher: "Teacher",
};

function paperLabel(p: ExamPaper): string {
  const parts: string[] = [];
  if (p.year) parts.push(String(p.year));
  if (p.paper_number) parts.push(`Paper ${p.paper_number}`);
  return parts.join(" · ") || p.title || "Untitled";
}

export default function PapersScreen({ route, navigation }: Props) {
  const { subject } = route.params;
  const { state } = useAuth();
  const examPath =
    state.status === "authenticated" ? state.examPath ?? undefined : undefined;

  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPapers(subject.id, examPath)
      .then(setPapers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [subject.id, examPath]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" /></View>;
  }

  if (error) {
    return <View style={s.center}><Text style={s.err}>{error}</Text></View>;
  }

  if (papers.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>No past papers uploaded yet for {subject.name}.</Text>
        <Text style={s.emptySub}>
          Use the admin dashboard to upload questions from the XLSX template
          with paper_type set to "maneb_past_paper".
        </Text>
      </View>
    );
  }

  // Group by source type
  const bySource = papers.reduce<Record<string, ExamPaper[]>>((acc, p) => {
    const key = p.source_type ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const sections = Object.entries(bySource);

  return (
    <FlatList
      data={sections}
      keyExtractor={([source]) => source}
      contentContainerStyle={s.list}
      renderItem={({ item: [source, items] }) => (
        <View style={s.section}>
          <Text style={s.sectionHeader}>{SOURCE_LABEL[source] ?? source} past papers</Text>
          {items.map((paper) => (
            <TouchableOpacity
              key={paper.id}
              style={s.card}
              onPress={() =>
                navigation.navigate("PaperDrill", { paper, subject })
              }
            >
              <View style={s.cardLeft}>
                <Text style={s.cardTitle}>{paperLabel(paper)}</Text>
                <Text style={s.cardSub}>
                  {paper.question_count} question{paper.question_count !== 1 ? "s" : ""} ·{" "}
                  {paper.exam_mode === "paper_layout" ? "Paper layout" : "Randomised"}
                </Text>
              </View>
              <View style={s.startBtn}>
                <Text style={s.startBtnText}>Start →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  err:  { color: "red" },
  empty: { fontSize: 16, fontWeight: "600", color: "#444", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  cardSub:  { fontSize: 13, color: "#777" },
  startBtn: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 12,
  },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
