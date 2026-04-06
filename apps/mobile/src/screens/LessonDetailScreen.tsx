import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "LessonDetail">;

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function renderText(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.trim() === "") return <View key={i} style={{ height: 12 }} />;
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Text key={i} style={styles.content}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <Text key={j} style={styles.bold}>{part.slice(2, -2)}</Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  });
}

export default function LessonDetailScreen({ route }: Props) {
  const { lesson } = route.params;
  const { width } = useWindowDimensions();
  const videoHeight = Math.round((width - 32) * 9 / 16);

  const ytId = lesson.video_url ? extractYoutubeId(lesson.video_url) : null;
  const showText = lesson.content_type === "text" || lesson.content_type === "mixed";
  const showVideo = (lesson.content_type === "video" || lesson.content_type === "mixed") && ytId;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{lesson.title}</Text>

      {showText && lesson.content ? (
        <View style={styles.textBlock}>{renderText(lesson.content)}</View>
      ) : !showVideo ? (
        <Text style={styles.empty}>No content yet.</Text>
      ) : null}

      {showVideo && (
        <View style={[styles.videoWrapper, { height: videoHeight }]}>
          <WebView
            source={{ uri: `https://www.youtube.com/embed/${ytId}` }}
            allowsFullscreenVideo
            javaScriptEnabled
            style={{ flex: 1, borderRadius: 12 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, color: "#111" },
  textBlock: { gap: 2, marginBottom: 20 },
  content: { fontSize: 16, lineHeight: 26, color: "#333" },
  bold: { fontWeight: "700", color: "#111" },
  empty: { fontSize: 16, color: "#999" },
  videoWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
});
