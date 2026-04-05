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

export default function TopicsScreen({ route }: Props) {
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (topics.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No topics yet for {subject.name}.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={topics}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.description && (
            <Text style={styles.cardDesc}>{item.description}</Text>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "red" },
  emptyText: { color: "#999" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardDesc: { fontSize: 14, color: "#666" },
});
