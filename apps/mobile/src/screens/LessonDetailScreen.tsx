import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getLessonDetail, type LessonBlock, type LessonDetail } from "../lib/api";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "LessonDetail">;

function renderText(content: string) {
  return content.split("\n").map((line, index) => {
    if (line.trim() === "") return <View key={index} style={{ height: 12 }} />;

    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Text key={index} style={styles.content}>
        {parts.map((part, partIndex) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <Text key={partIndex} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  });
}

function getProviderLabel(block: LessonBlock): string {
  switch (block.video_provider) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "direct":
      return "Direct video";
    case "other":
      return "External video";
    default:
      return "Video";
  }
}

function getVideoMeta(url: string | null): string {
  if (!url) return "No video link";

  try {
    const parsed = new URL(url);
    const value = `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  } catch {
    return url.length > 80 ? `${url.slice(0, 77)}...` : url;
  }
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LessonDetailScreen({ route }: Props) {
  const { lessonId, lessonTitle } = route.params;
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    setLoading(true);
    setError(null);

    getLessonDetail(lessonId)
      .then((data) => {
        if (isActive) {
          setLesson(data);
        }
      })
      .catch((requestError) => {
        if (isActive) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load lesson");
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [lessonId]);

  async function handleOpenUrl(url: string | null, label: string) {
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Unable to open ${label}`, `This ${label} link could not be opened on this device.`);
    }
  }

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
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const blocks = lesson?.blocks ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{lesson?.title ?? lessonTitle}</Text>

      {blocks.length === 0 ? (
        <Text style={styles.empty}>No content yet.</Text>
      ) : (
        blocks.map((block, index) =>
          block.block_type === "text" ? (
            <View key={block.id} style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Text section {index + 1}</Text>
              {block.title ? <Text style={styles.sectionTitle}>{block.title}</Text> : null}
              <View style={styles.textBlock}>{renderText(block.text_content ?? "")}</View>
            </View>
          ) : block.block_type === "pdf" ? (
            <TouchableOpacity
              key={block.id}
              activeOpacity={0.86}
              onPress={() => handleOpenUrl(block.download_url, "PDF")}
              style={styles.pdfCard}
            >
              <View style={styles.videoHeaderRow}>
                <Text style={styles.pdfEyebrow}>PDF Notes</Text>
                {block.file_size ? (
                  <Text style={styles.pdfSize}>{formatFileSize(block.file_size)}</Text>
                ) : null}
              </View>
              <Text style={styles.pdfTitle}>
                {block.title ?? block.file_name ?? "Lesson notes"}
              </Text>
              <View style={styles.pdfFooter}>
                <Text style={styles.pdfFooterText}>Tap to open PDF</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={block.id}
              activeOpacity={0.86}
              onPress={() => handleOpenUrl(block.video_url, "video")}
              style={styles.videoCard}
            >
              <View style={styles.videoHeaderRow}>
                <Text style={styles.videoEyebrow}>{getProviderLabel(block)}</Text>
                <Text style={styles.videoHint}>Open externally</Text>
              </View>
              <Text style={styles.videoTitle}>
                {block.title ?? `${getProviderLabel(block)} lesson video`}
              </Text>
              <Text style={styles.videoMeta}>{getVideoMeta(block.video_url)}</Text>
              <View style={styles.videoFooter}>
                <Text style={styles.videoFooterText}>Tap to open link</Text>
              </View>
            </TouchableOpacity>
          )
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
    color: "#111827",
  },
  error: {
    fontSize: 15,
    color: "#b91c1c",
    textAlign: "center",
  },
  empty: {
    fontSize: 16,
    color: "#6b7280",
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  textBlock: {
    gap: 2,
    marginTop: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: "#374151",
  },
  bold: {
    fontWeight: "700",
    color: "#111827",
  },
  videoCard: {
    borderRadius: 18,
    backgroundColor: "#0f172a",
    padding: 16,
  },
  videoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  videoEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#93c5fd",
  },
  videoHint: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  videoTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
  },
  videoMeta: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#cbd5e1",
  },
  videoFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 12,
  },
  videoFooterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#bfdbfe",
  },
  pdfCard: {
    borderRadius: 18,
    backgroundColor: "#7c2d12",
    padding: 16,
  },
  pdfEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#fdba74",
  },
  pdfSize: {
    fontSize: 12,
    color: "#fed7aa",
  },
  pdfTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff7ed",
  },
  pdfFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#9a3412",
    paddingTop: 12,
  },
  pdfFooterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fdba74",
  },
});
