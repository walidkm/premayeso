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
import { getSubjects, Subject } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Subjects">;

export default function SubjectsScreen({ navigation }: Props) {
  const { state } = useAuth();
  const examPath = state.status === "authenticated" ? state.examPath : undefined;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getSubjects(examPath)
      .then((data) => {
        if (!cancelled) setSubjects(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSubjects([]);
          setError(e instanceof Error ? e.message : "Failed to fetch subjects");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examPath, reloadKey]);

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  if (loading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.stateTitle}>Loading your dashboard</Text>
        <Text style={styles.stateCopy}>
          Pulling in subjects, topics, and practice for your next study session.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.stateTitle}>We could not load subjects</Text>
        <Text style={styles.stateCopy}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emptyTitle =
    examPath === "MSCE" ? "MSCE content is coming soon" : "No subjects available yet";
  const emptyCopy =
    examPath === "MSCE"
      ? "You can switch back to JCE from Settings while MSCE subjects are being prepared."
      : "There are no subjects available right now. Please try again shortly.";

  return (
    <FlatList
      data={subjects}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.list,
        subjects.length === 0 ? styles.listEmpty : null,
      ]}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>PreMayeso</Text>
            <Text style={styles.heroTitle}>Your study dashboard</Text>
            <Text style={styles.heroCopy}>
              Choose a subject to move into topics, lessons, quizzes, and past papers without extra taps or clutter.
            </Text>
          </View>

          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.sectionTitle}>Subjects</Text>
              <Text style={styles.sectionCopy}>
                Open the area you want to study next.
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{subjects.length}</Text>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyCopy}>{emptyCopy}</Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.emptyActionText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            pressed ? styles.cardPressed : null,
          ]}
          onPress={() => navigation.navigate("Topics", { subject: item })}
        >
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>
              {(item.code ?? item.name).slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardHint}>Open topics, lessons, and quiz</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : (
              <Text style={styles.cardDescMuted}>
                Practice lessons, quizzes, and past papers in one place.
              </Text>
            )}
          </View>
          <View style={styles.cardArrow}>
            <Text style={styles.cardArrowText}>{">"}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
    gap: 18,
    marginBottom: 10,
  },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 22,
    gap: 8,
  },
  eyebrow: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "800",
  },
  heroCopy: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionCopy: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748b",
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
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 22,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  emptyAction: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  cardBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbe7f5",
  },
  cardBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardBody: {
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
    lineHeight: 19,
    color: "#475569",
  },
  cardDescMuted: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748b",
  },
  cardArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  cardArrowText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },
});
