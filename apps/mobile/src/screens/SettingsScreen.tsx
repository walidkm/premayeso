import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/AuthContext";
import {
  EXAM_PATH_DESCRIPTIONS,
  EXAM_PATH_LABELS,
  EXAM_PATHS,
  type ExamPath,
} from "../lib/examPath";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { state, signOut, setExamPath } = useAuth();
  const [savingPath, setSavingPath] = useState<ExamPath | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (state.status !== "authenticated") return null;

  const { user, examPath } = state;

  const handleExamPathChange = async (path: ExamPath) => {
    if (path === examPath || savingPath) return;

    setError(null);
    setSavingPath(path);

    try {
      await setExamPath(path);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update exam level");
    } finally {
      setSavingPath(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user.phone.replace(/\D/g, "").slice(-2)}</Text>
        </View>
        <View style={s.heroText}>
          <Text style={s.eyebrow}>Account</Text>
          <Text style={s.phone}>{user.phone}</Text>
          <Text style={s.subcopy}>
            Manage your exam level and keep your dashboard focused on the right learning path.
          </Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Exam Level</Text>
        <Text style={s.sectionCopy}>
          Switching exam level updates the dashboard subjects and past papers across the app.
        </Text>

        <View style={s.pathList}>
          {EXAM_PATHS.map((path) => {
            const isActive = examPath === path;
            const isSaving = savingPath === path;

            return (
              <Pressable
                key={path}
                onPress={() => void handleExamPathChange(path)}
                disabled={!!savingPath}
                style={({ pressed }) => [
                  s.pathCard,
                  isActive && s.pathCardActive,
                  pressed && !isActive && !savingPath ? s.pathCardPressed : null,
                ]}
              >
                <View style={s.pathCardTop}>
                  <Text style={[s.pathTitle, isActive && s.pathTitleActive]}>{path}</Text>
                  {isActive ? (
                    <View style={s.activeBadge}>
                      <Text style={s.activeBadgeText}>Active</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[s.pathLabel, isActive && s.pathLabelActive]}>
                  {EXAM_PATH_LABELS[path]}
                </Text>
                <Text style={[s.pathDescription, isActive && s.pathDescriptionActive]}>
                  {EXAM_PATH_DESCRIPTIONS[path]}
                </Text>
                {isSaving ? <ActivityIndicator color="#ffffff" style={s.pathSpinner} /> : null}
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Account Details</Text>
        <View style={s.metaBlock}>
          <Row label="Phone" value={user.phone} />
          <View style={s.divider} />
          <Row
            label="Role"
            value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          />
          <View style={s.divider} />
          <Row label="Current level" value={EXAM_PATH_LABELS[examPath]} />
        </View>
      </View>

      <TouchableOpacity
        style={s.signOutBtn}
        onPress={async () => {
          await signOut();
        }}
      >
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={s.version}>PreMayeso v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#94a3b8",
    fontWeight: "700",
  },
  phone: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  subcopy: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
  },
  pathList: {
    gap: 12,
  },
  pathCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe2ea",
    backgroundColor: "#f8fafc",
    padding: 16,
    gap: 6,
  },
  pathCardActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  pathCardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.94,
  },
  pathCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pathTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  pathTitleActive: {
    color: "#f8fafc",
  },
  activeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#1e293b",
  },
  activeBadgeText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pathLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  pathLabelActive: {
    color: "#f8fafc",
  },
  pathDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },
  pathDescriptionActive: {
    color: "#cbd5e1",
  },
  pathSpinner: {
    marginTop: 4,
    alignSelf: "flex-start",
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
  },
  metaBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eef2f7",
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  rowValue: {
    flex: 2,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  divider: {
    height: 1,
    backgroundColor: "#eef2f7",
    marginHorizontal: 16,
  },
  signOutBtn: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
    paddingVertical: 16,
    alignItems: "center",
  },
  signOutText: {
    color: "#b91c1c",
    fontSize: 15,
    fontWeight: "800",
  },
  version: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 12,
  },
});
