import { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getPaperQuestions, PaperQuestion } from "../lib/api";
import MathText from "../components/MathText";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "PaperDrill">;

// 2.5 hours in seconds — standard MANEB paper allowance
const DEFAULT_DURATION = 2.5 * 60 * 60;

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timerColor(secs: number): string {
  if (secs < 5 * 60) return "#dc2626";   // < 5 min — red
  if (secs < 30 * 60) return "#d97706";  // < 30 min — amber
  return "#16a34a";                       // green
}

type Phase = "intro" | "drill" | "review";

export default function PaperDrillScreen({ route, navigation }: Props) {
  const { paper, subject } = route.params;

  const [questions, setQuestions] = useState<PaperQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // order_index → chosen key
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getPaperQuestions(paper.id)
      .then(setQuestions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [paper.id]);

  // Timer
  useEffect(() => {
    if (phase !== "drill") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("review");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleSubmit = useCallback(() => {
    const answered = Object.keys(answers).length;
    const total = questions.length;
    if (answered < total) {
      Alert.alert(
        "Submit paper?",
        `You have answered ${answered} of ${total} questions. Unanswered questions will be marked wrong.`,
        [
          { text: "Continue exam", style: "cancel" },
          {
            text: "Submit",
            style: "destructive",
            onPress: () => {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase("review");
            },
          },
        ]
      );
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("review");
    }
  }, [answers, questions.length]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" /></View>;
  }
  if (error) {
    return <View style={s.center}><Text style={s.err}>{error}</Text></View>;
  }

  // ── Intro screen ───────────────────────────────────────────────

  if (phase === "intro") {
    const yearStr = paper.year ? String(paper.year) : "";
    const paperStr = paper.paper_number ? ` · Paper ${paper.paper_number}` : "";
    return (
      <ScrollView contentContainerStyle={s.introContainer}>
        <Text style={s.introSubject}>{subject.name}</Text>
        <Text style={s.introTitle}>{yearStr}{paperStr} Past Paper</Text>
        {paper.title && <Text style={s.introMeta}>{paper.title}</Text>}

        <View style={s.infoGrid}>
          {[
            { label: "Questions", value: String(questions.length) },
            { label: "Time allowed", value: "2 hr 30 min" },
            { label: "Exam path", value: paper.exam_path ?? "—" },
            { label: "Mode", value: paper.exam_mode === "paper_layout" ? "Paper layout" : "Randomised" },
          ].map((item) => (
            <View key={item.label} style={s.infoCell}>
              <Text style={s.infoCellValue}>{item.value}</Text>
              <Text style={s.infoCellLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.instructions}>
          <Text style={s.instructionsTitle}>Instructions</Text>
          <Text style={s.instructionsText}>
            • Answer all questions.{"\n"}
            • You can navigate back and change answers.{"\n"}
            • The timer starts when you tap Begin.{"\n"}
            • Your results are shown after submission.
          </Text>
        </View>

        {questions.length === 0 ? (
          <Text style={s.noQuestions}>
            No questions uploaded for this paper yet. Upload via the admin dashboard.
          </Text>
        ) : (
          <TouchableOpacity
            style={s.beginBtn}
            onPress={() => setPhase("drill")}
          >
            <Text style={s.beginBtnText}>Begin exam</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ── Review / results ───────────────────────────────────────────

  if (phase === "review") {
    const scored = questions.filter((pq) => {
      const chosen = answers[pq.order_index];
      return chosen === (pq.question as any).correct_option;
    });
    // Note: correct_option is not returned by the API (security) — score against
    // answers only (actual grading would require a server call). For MVP we show
    // "answered" vs "skipped" and invite the user to review.
    const answered = Object.keys(answers).length;
    const skipped = questions.length - answered;

    // Group by section for review
    const sections = questions.reduce<Record<string, PaperQuestion[]>>((acc, pq) => {
      const key = pq.section ?? "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(pq);
      return acc;
    }, {});

    return (
      <ScrollView contentContainerStyle={s.reviewContainer}>
        <Text style={s.reviewTitle}>Paper complete</Text>
        <Text style={s.reviewSub}>
          {paper.year} {paper.paper_number ? `Paper ${paper.paper_number}` : ""}
        </Text>

        <View style={s.scoreSummary}>
          <View style={s.scoreCell}>
            <Text style={s.scoreCellValue}>{answered}</Text>
            <Text style={s.scoreCellLabel}>Answered</Text>
          </View>
          <View style={[s.scoreCell, s.scoreCellMid]}>
            <Text style={[s.scoreCellValue, { color: "#dc2626" }]}>{skipped}</Text>
            <Text style={s.scoreCellLabel}>Skipped</Text>
          </View>
          <View style={s.scoreCell}>
            <Text style={s.scoreCellValue}>{questions.length}</Text>
            <Text style={s.scoreCellLabel}>Total</Text>
          </View>
        </View>

        <Text style={s.reviewNote}>
          💡 Correct answers are shown in the explanation. Use the review below to check your work.
        </Text>

        {Object.entries(sections).map(([section, pqs]) => (
          <View key={section} style={s.reviewSection}>
            <Text style={s.reviewSectionHeader}>{section}</Text>
            {pqs.map((pq) => {
              const chosen = answers[pq.order_index];
              return (
                <View key={pq.order_index} style={s.reviewRow}>
                  <View style={s.reviewRowHeader}>
                    <Text style={s.reviewQNum}>Q{pq.order_index + 1}</Text>
                    <View style={[
                      s.reviewBadge,
                      chosen ? s.reviewBadgeAnswered : s.reviewBadgeSkipped,
                    ]}>
                      <Text style={s.reviewBadgeText}>
                        {chosen ? `Answered: ${chosen}` : "Skipped"}
                      </Text>
                    </View>
                  </View>
                  <MathText text={pq.question.stem} fontSize={13} color="#444" />
                  {pq.question.explanation && (
                    <Text style={s.reviewExplanation}>
                      {pq.question.explanation}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={s.doneBtnText}>Back to papers</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Drill screen ───────────────────────────────────────────────

  const pq = questions[index];
  const q = pq.question;
  const chosen = answers[pq.order_index];
  const answeredCount = Object.keys(answers).length;

  // Detect section change
  const prevSection = index > 0 ? questions[index - 1].section : null;
  const showSectionHeader = pq.section && pq.section !== prevSection;

  return (
    <View style={s.drillRoot}>
      {/* Fixed header */}
      <View style={s.drillHeader}>
        <Text style={s.drillCounter}>
          {index + 1} / {questions.length}
          {answeredCount > 0 && (
            <Text style={s.drillAnswered}> · {answeredCount} answered</Text>
          )}
        </Text>
        <Text style={[s.drillTimer, { color: timerColor(timeLeft) }]}>
          {formatTime(timeLeft)}
        </Text>
      </View>

      {/* Question body */}
      <ScrollView contentContainerStyle={s.drillBody}>
        {showSectionHeader && (
          <View style={s.sectionBanner}>
            <Text style={s.sectionBannerText}>Section {pq.section}</Text>
          </View>
        )}

        {q.marks && <Text style={s.marks}>[{q.marks} mark{q.marks !== 1 ? "s" : ""}]</Text>}

        <MathText text={q.stem} fontSize={17} color="#111" />

        <View style={s.options}>
          {q.options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[s.option, chosen === opt.key && s.optionSelected]}
              onPress={() =>
                setAnswers((prev) => ({ ...prev, [pq.order_index]: opt.key }))
              }
            >
              <Text style={[s.optionKey, chosen === opt.key && s.optionKeySelected]}>
                {opt.key}
              </Text>
              <View style={{ flex: 1 }}>
                <MathText
                  text={opt.text}
                  fontSize={15}
                  color={chosen === opt.key ? "#111" : "#444"}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Navigation bar */}
      <View style={s.navBar}>
        <TouchableOpacity
          style={[s.navBtn, index === 0 && s.navBtnDisabled]}
          onPress={() => setIndex((i) => i - 1)}
          disabled={index === 0}
        >
          <Text style={s.navBtnText}>← Prev</Text>
        </TouchableOpacity>

        {/* Question grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.navGrid}>
          {questions.map((_, i) => {
            const isAnswered = answers[questions[i].order_index] !== undefined;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.gridDot,
                  i === index && s.gridDotCurrent,
                  isAnswered && i !== index && s.gridDotAnswered,
                ]}
                onPress={() => setIndex(i)}
              >
                <Text style={[
                  s.gridDotText,
                  (i === index || isAnswered) && s.gridDotTextActive,
                ]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {index < questions.length - 1 ? (
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setIndex((i) => i + 1)}
          >
            <Text style={s.navBtnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit}>
            <Text style={s.submitBtnText}>Submit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err:    { color: "red" },

  // ── Intro ──────────────────────────────────────────────────────
  introContainer: { padding: 24, gap: 20, flexGrow: 1, justifyContent: "center" },
  introSubject: { fontSize: 13, fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: 1 },
  introTitle:   { fontSize: 28, fontWeight: "800", color: "#111", marginTop: 4 },
  introMeta:    { fontSize: 14, color: "#666" },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  infoCell: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: "#f4f4f5",
    borderRadius: 12,
    padding: 14,
    gap: 2,
  },
  infoCellValue: { fontSize: 18, fontWeight: "700", color: "#111" },
  infoCellLabel: { fontSize: 12, color: "#888" },
  instructions: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
    padding: 16,
    gap: 8,
  },
  instructionsTitle: { fontSize: 14, fontWeight: "700", color: "#0369a1" },
  instructionsText:  { fontSize: 13, color: "#0c4a6e", lineHeight: 22 },
  noQuestions: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 20 },
  beginBtn: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  beginBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },

  // ── Drill ──────────────────────────────────────────────────────
  drillRoot: { flex: 1, backgroundColor: "#fff" },
  drillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  drillCounter:  { fontSize: 14, fontWeight: "600", color: "#555" },
  drillAnswered: { fontSize: 14, color: "#16a34a" },
  drillTimer:    { fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  drillBody:     { padding: 20, gap: 16 },
  sectionBanner: {
    backgroundColor: "#f4f4f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  sectionBannerText: { fontSize: 12, fontWeight: "700", color: "#666", textTransform: "uppercase", letterSpacing: 0.5 },
  marks: { fontSize: 12, color: "#888", fontStyle: "italic" },
  options: { gap: 10, marginTop: 4 },
  option: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fafafa",
    alignItems: "flex-start",
  },
  optionSelected: {
    borderColor: "#111",
    borderWidth: 2,
    backgroundColor: "#f4f4f5",
  },
  optionKey: { fontSize: 15, fontWeight: "700", color: "#aaa", minWidth: 20 },
  optionKeySelected: { color: "#111" },

  // ── Nav bar ────────────────────────────────────────────────────
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
    backgroundColor: "#fff",
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 13, fontWeight: "600", color: "#333" },
  navGrid: { flex: 1 },
  gridDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    backgroundColor: "#fafafa",
  },
  gridDotCurrent: { borderColor: "#111", borderWidth: 2, backgroundColor: "#111" },
  gridDotAnswered: { backgroundColor: "#dcfce7", borderColor: "#16a34a" },
  gridDotText: { fontSize: 10, color: "#aaa", fontWeight: "600" },
  gridDotTextActive: { color: "#fff" },
  submitBtn: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Review ─────────────────────────────────────────────────────
  reviewContainer: { padding: 20, gap: 20 },
  reviewTitle: { fontSize: 26, fontWeight: "800", color: "#111" },
  reviewSub:   { fontSize: 14, color: "#777", marginTop: -12 },
  scoreSummary: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 16,
    overflow: "hidden",
  },
  scoreCell:    { flex: 1, padding: 16, alignItems: "center", gap: 4, backgroundColor: "#fafafa" },
  scoreCellMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e4e4e7" },
  scoreCellValue: { fontSize: 28, fontWeight: "800", color: "#111" },
  scoreCellLabel: { fontSize: 12, color: "#888" },
  reviewNote: {
    fontSize: 13,
    color: "#78350f",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 12,
    lineHeight: 20,
  },
  reviewSection:       { gap: 12 },
  reviewSectionHeader: { fontSize: 13, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  reviewRow: {
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    backgroundColor: "#fff",
  },
  reviewRowHeader:    { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewQNum:         { fontSize: 12, fontWeight: "700", color: "#aaa" },
  reviewBadge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reviewBadgeAnswered:{ backgroundColor: "#dcfce7" },
  reviewBadgeSkipped: { backgroundColor: "#fee2e2" },
  reviewBadgeText:    { fontSize: 11, fontWeight: "600", color: "#444" },
  reviewExplanation:  { fontSize: 12, color: "#777", fontStyle: "italic", lineHeight: 18 },
  doneBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
