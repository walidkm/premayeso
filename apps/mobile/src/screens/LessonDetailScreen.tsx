import { ScrollView, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "LessonDetail">;

export default function LessonDetailScreen({ route }: Props) {
  const { lesson } = route.params;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{lesson.title}</Text>
      {lesson.content ? (
        <Text style={styles.content}>{lesson.content}</Text>
      ) : (
        <Text style={styles.empty}>No content yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  content: { fontSize: 16, lineHeight: 26, color: "#333" },
  empty: { fontSize: 16, color: "#999" },
});
