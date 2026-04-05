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
import { getTopics, Topic } from "../lib/api";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Topics">;

export default function TopicsScreen({ route, navigation }: Props) {
  const { subject } = route.params;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTopics(subject.id)
      .then(setTopics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [subject.id]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" /></View>;
  }

  if (error) {
    return <View style={s.center}><Text style={s.errorText}>{error}</Text></View>;
  }

  if (topics.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>No topics yet for {subject.name}.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={topics}
      keyExtractor={(item) => item.id}
      contentContainerStyle={s.list}
      renderItem={({ item }) => (
        <View style={s.card}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Lessons", { topic: item })}
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            {item.description && (
              <Text style={s.cardDesc}>{item.description}</Text>
            )}
          </TouchableOpacity>

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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "red" },
  emptyText: { color: "#999" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardDesc: { fontSize: 14, color: "#666" },
  quizBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  quizBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
