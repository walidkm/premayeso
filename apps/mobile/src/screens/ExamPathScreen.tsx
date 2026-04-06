import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/AuthContext";

type PathOption = {
  key: string;
  label: string;
  subtitle: string;
  available: boolean;
};

const PATHS: PathOption[] = [
  {
    key: "JCE",
    label: "JCE",
    subtitle: "Junior Certificate of Education\nForms 1 – 4",
    available: true,
  },
  {
    key: "MSCE",
    label: "MSCE",
    subtitle: "Malawi School Certificate of Education\nForms 3 – 4",
    available: false,
  },
  {
    key: "PSLCE",
    label: "PSLCE",
    subtitle: "Primary School Leaving Certificate\nStandards 7 – 8",
    available: false,
  },
];

export default function ExamPathScreen() {
  const { setExamPath } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (key: string) => {
    setError(null);
    setLoading(true);
    try {
      await setExamPath(key);
      // Nav resets automatically — App.tsx reads examPath from auth state
    } catch {
      setError("Could not save your selection. Please try again.");
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.heading}>Choose your exam</Text>
      <Text style={s.subheading}>
        We'll show you subjects and past papers for your level.
        You can change this later in settings.
      </Text>

      {error && <Text style={s.error}>{error}</Text>}

      <View style={s.cards}>
        {PATHS.map((path) => (
          <TouchableOpacity
            key={path.key}
            style={[s.card, !path.available && s.cardLocked]}
            onPress={() => path.available && handleSelect(path.key)}
            disabled={!path.available || loading}
            activeOpacity={path.available ? 0.7 : 1}
          >
            <View style={s.cardTop}>
              <Text style={[s.cardLabel, !path.available && s.cardLabelLocked]}>
                {path.label}
              </Text>
              {!path.available && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>Coming soon</Text>
                </View>
              )}
            </View>
            <Text style={[s.cardSub, !path.available && s.cardSubLocked]}>
              {path.subtitle}
            </Text>
            {path.available && loading && (
              <ActivityIndicator style={{ marginTop: 8 }} color="#111" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 20,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
  },
  subheading: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  error: { color: "#dc2626", fontSize: 14 },
  cards: { gap: 12 },
  card: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff",
  },
  cardLocked: {
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  cardLabelLocked: { color: "#bbb" },
  cardSub: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
  },
  cardSubLocked: { color: "#ccc" },
  badge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
