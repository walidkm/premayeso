import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getTopics, Topic } from "../lib/api";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Topics">;

export default function TopicsScreen({ route, navigation }: Props) {
  const { subject } = route.params;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getTopics(subject.id)
      .then((data) => {
        if (!cancelled) setTopics(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setTopics([]);
          setError(e instanceof Error ? e.message : "Failed to fetch topics");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subject.id, reloadKey]);

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  if (loading) {
    return (
      <View style={s.stateWrap}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={s.stateTitle}>Loading topics</Text>
        <Text style={s.stateCopy}>
          Preparing lessons, quizzes, and past papers for {subject.name}.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.stateWrap}>
        <Text style={s.stateTitle}>We could not load topics</Text>
        <Text style={s.stateCopy}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
          <Text style={s.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={topics}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        s.list,
        topics.length === 0 ? s.listEmpty : null,
      ]}
      ListHeaderComponent={
        <View style={s.headerBlock}>
          <View style={s.subjectHero}>
            <Text style={s.eyebrow}>Subject</Text>
            <Text style={s.subjectTitle}>{subject.name}</Text>
            <Text style={s.subjectCopy}>
              {subject.description ??
                "Work through lessons first or jump straight into a quiz when you are ready."}
            </Text>
            <View style={s.metaRow}>
              {subject.code ? (
                <View style={s.metaPill}>
                  <Text style={s.metaPillText}>{subject.code}</Text>
                </View>
              ) : null}
              {subject.exam_path ? (
                <View style={s.metaPill}>
                  <Text style={s.metaPillText}>{subject.exam_path}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={s.pastPapersBtn}
            onPress={() => navigation.navigate("Papers", { subject })}
          >
            <View style={s.pastPapersCopy}>
              <Text style={s.pastPapersBtnTitle}>Past Papers</Text>
              <Text style={s.pastPapersBtnSub}>
                MANEB past paper drills for {subject.name}
              </Text>
            </View>
            <View style={s.pastPapersArrow}>
              <Text style={s.pastPapersArrowText}>{">"}</Text>
            </View>
          </TouchableOpacity>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Topics</Text>
            <View style={s.countPill}>
              <Text style={s.countPillText}>{topics.length}</Text>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={s.emptyCard}>
          <Text style={s.emptyTitle}>No topics yet for {subject.name}</Text>
          <Text style={s.emptyCopy}>
            This subject is active, but its topic list has not been populated yet.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.cardPressArea, pressed ? s.cardPressAreaPressed : null]}
            onPress={() => navigation.navigate("Lessons", { topic: item })}
          >
            <View style={s.cardHeader}>
              <View style={s.cardText}>
                <Text style={s.cardTitle}>{item.name}</Text>
                <Text style={s.cardHint}>Open lessons and reading content</Text>
              </View>
              <View style={s.cardArrow}>
                <Text style={s.cardArrowText}>{">"}</Text>
              </View>
            </View>

            {item.description ? (
              <Text style={s.cardDesc}>{item.description}</Text>
            ) : null}

            <View style={s.topicMetaRow}>
              {item.form_level ? (
                <View style={s.topicMetaPill}>
                  <Text style={s.topicMetaPillText}>{item.form_level}</Text>
                </View>
              ) : null}
              {item.exam_path ? (
                <View style={s.topicMetaPill}>
                  <Text style={s.topicMetaPillText}>{item.exam_path}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          <TouchableOpacity
            style={s.quizBtn}
            onPress={() => navigation.navigate("Quiz", { topic: item })}
          >
            <Text style={s.quizBtnText}>Take Quiz</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 10,
    backgroundColor: "#f4f7fb",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  stateCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
    textAlign: "center",
    maxWidth: 320,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryBtnText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
  },
  list: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
    backgroundColor: "#f4f7fb",
  },
  listEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: 14,
    marginBottom: 10,
  },
  subjectHero: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#64748b",
  },
  subjectTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  subjectCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  metaPill: {
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pastPapersBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  pastPapersCopy: {
    flex: 1,
  },
  pastPapersBtnTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
  },
  pastPapersBtnSub: {
    fontSize: 13,
    color: "#cbd5e1",
    marginTop: 4,
    lineHeight: 18,
  },
  pastPapersArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
  },
  pastPapersArrowText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  countPill: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbe7f5",
  },
  countPillText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardPressArea: {
    gap: 10,
  },
  cardPressAreaPressed: {
    opacity: 0.95,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardHint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  cardDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
  cardArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  cardArrowText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  topicMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topicMetaPill: {
    borderRadius: 999,
    backgroundColor: "#eef2f7",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topicMetaPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  quizBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  quizBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
