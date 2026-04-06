import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  checkAnswer,
  getQuestions,
  saveQuizAttempt,
  CheckResult,
  Question,
  QuestionSource,
} from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import MathText from "../components/MathText";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Quiz">;

type AnswerRecord = {
  question_id: string;
  chosen: string;
  correct: boolean;
};

type Phase = "question" | "feedback" | "results";

function formatSource(source: QuestionSource): string {
  const parts: string[] = [];
  if (source.school) parts.push(source.school);
  if (source.year) parts.push(String(source.year));
  if (source.paper_number) parts.push(`Paper ${source.paper_number}`);
  return parts.join(" · ");
}

export default function QuizScreen({ route, navigation }: Props) {
  const { topic } = route.params;
  const { state } = useAuth();
  const userId = state.status === "authenticated" ? state.user.id : null;
  // Admin accounts can see all hints; free users see only the first hint
  const isPremium =
    state.status === "authenticated" && state.user.role === "admin";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // Hint ladder state
  const [hintsShown, setHintsShown] = useState(0);

  useEffect(() => {
    getQuestions(topic.id)
      .then(setQuestions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topic.id]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" /></View>;
  }
  if (error) {
    return <View style={s.center}><Text style={s.err}>{error}</Text></View>;
  }
  if (questions.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>No questions yet for {topic.name}.</Text>
      </View>
    );
  }

  // ── Results screen ────────────────────────────────────────────

  if (phase === "results") {
    const score = answers.filter((a) => a.correct).length;
    const total = answers.length;

    return (
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.resultsTitle}>Quiz Complete</Text>
        <Text style={s.score}>{score} / {total}</Text>
        <Text style={s.scoreLabel}>
          {score === total
            ? "Perfect score!"
            : score >= total / 2
            ? "Good effort!"
            : "Keep practising!"}
        </Text>

        {answers.map((a, i) => {
          const q = questions[i];
          return (
            <View key={a.question_id} style={s.reviewRow}>
              <MathText text={q.stem} fontSize={14} color="#333" />
              <Text style={a.correct ? s.correctText : s.incorrectText}>
                {a.correct ? "✓ Correct" : `✗ Your answer: ${a.chosen}`}
              </Text>
            </View>
          );
        })}

        <TouchableOpacity style={s.btn} onPress={() => navigation.goBack()}>
          <Text style={s.btnText}>Back to Topics</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Question screen ───────────────────────────────────────────

  const question = questions[index];
  const hints = question.hints ?? [];
  const maxHints = isPremium ? hints.length : Math.min(1, hints.length);
  const canShowMoreHint = hintsShown < maxHints;

  const handleOptionPress = async (key: string) => {
    if (checking || phase === "feedback") return;
    setChosen(key);
    setChecking(true);
    try {
      const res = await checkAnswer(question.id, key);
      setResult(res);
      setAnswers((prev) => [
        ...prev,
        { question_id: question.id, chosen: key, correct: res.correct },
      ]);
      setPhase("feedback");
    } catch {
      // keep on question phase if network fails
    } finally {
      setChecking(false);
    }
  };

  const handleNext = async () => {
    const isLast = index === questions.length - 1;
    if (isLast) {
      const finalAnswers = [...answers];
      const score = finalAnswers.filter((a) => a.correct).length;
      await saveQuizAttempt({
        user_id: userId,
        topic_id: topic.id,
        score,
        total: finalAnswers.length,
        answers: finalAnswers,
      });
      setPhase("results");
    } else {
      setIndex((i) => i + 1);
      setChosen(null);
      setResult(null);
      setHintsShown(0);
      setPhase("question");
    }
  };

  const optionStyle = (key: string) => {
    if (phase !== "feedback") {
      return chosen === key ? s.optionSelected : s.option;
    }
    if (key === result?.correctOption) return s.optionCorrect;
    if (key === chosen && !result?.correct) return s.optionWrong;
    return s.option;
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.counter}>{index + 1} / {questions.length}</Text>

      {/* Question stem — supports LaTeX */}
      <MathText text={question.stem} fontSize={18} color="#111" />

      {question.source && (
        <Text style={s.source}>{formatSource(question.source)}</Text>
      )}

      {/* Options */}
      <View style={s.options}>
        {question.options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={optionStyle(opt.key)}
            onPress={() => handleOptionPress(opt.key)}
            disabled={phase === "feedback" || checking}
          >
            <Text style={s.optionKey}>{opt.key}.</Text>
            <View style={{ flex: 1 }}>
              <MathText text={opt.text} fontSize={15} color="#333" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Hint ladder ─────────────────────────────────────── */}
      {hints.length > 0 && phase === "question" && (
        <View style={s.hintBox}>
          {hintsShown > 0 && (
            <View style={s.hintList}>
              {hints.slice(0, hintsShown).map((h, i) => (
                <View key={i} style={s.hintRow}>
                  <Text style={s.hintNum}>Hint {i + 1}</Text>
                  <Text style={s.hintText}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {canShowMoreHint && (
            <TouchableOpacity
              style={s.hintBtn}
              onPress={() => setHintsShown((n) => n + 1)}
            >
              <Text style={s.hintBtnText}>
                💡 {hintsShown === 0 ? "Show hint" : "Next hint"}
              </Text>
            </TouchableOpacity>
          )}

          {!canShowMoreHint && !isPremium && hints.length > 1 && (
            <Text style={s.hintUpgrade}>
              🔒 Upgrade to Premium to unlock {hints.length - 1} more hint
              {hints.length - 1 > 1 ? "s" : ""}
            </Text>
          )}
        </View>
      )}

      {/* Feedback */}
      {phase === "feedback" && (
        <View style={s.feedback}>
          <Text style={result?.correct ? s.correctText : s.incorrectText}>
            {result?.correct ? "Correct!" : "Incorrect"}
          </Text>
          {result?.explanation && (
            <MathText text={result.explanation} fontSize={14} color="#555" />
          )}
          <TouchableOpacity style={s.btn} onPress={handleNext}>
            <Text style={s.btnText}>
              {index === questions.length - 1 ? "See Results" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { color: "red" },
  empty: { color: "#999" },
  container: { padding: 20, gap: 16 },
  counter: { fontSize: 13, color: "#999", textAlign: "right" },
  source: { fontSize: 12, color: "#888", fontStyle: "italic" },
  options: { gap: 10, marginTop: 8 },
  option: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fff",
    alignItems: "flex-start",
  },
  optionSelected: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "#555",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "flex-start",
  },
  optionCorrect: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "#16a34a",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f0fdf4",
    alignItems: "flex-start",
  },
  optionWrong: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "#dc2626",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fef2f2",
    alignItems: "flex-start",
  },
  optionKey: { fontWeight: "700", fontSize: 15, color: "#333", minWidth: 20 },
  // ── Hints ──────────────────────────────────────────────────
  hintBox: {
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    backgroundColor: "#fffbeb",
    padding: 14,
    gap: 10,
  },
  hintList: { gap: 8 },
  hintRow: { gap: 2 },
  hintNum: { fontSize: 11, fontWeight: "700", color: "#92400e", textTransform: "uppercase" },
  hintText: { fontSize: 14, color: "#78350f", lineHeight: 20 },
  hintBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#fcd34d",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  hintBtnText: { fontSize: 13, fontWeight: "600", color: "#78350f" },
  hintUpgrade: { fontSize: 12, color: "#a16207", fontStyle: "italic" },
  // ── Feedback ───────────────────────────────────────────────
  feedback: { gap: 10, marginTop: 8 },
  correctText: { fontSize: 16, fontWeight: "700", color: "#16a34a" },
  incorrectText: { fontSize: 16, fontWeight: "700", color: "#dc2626" },
  btn: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  // ── Results ────────────────────────────────────────────────
  resultsTitle: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  score: { fontSize: 48, fontWeight: "800", textAlign: "center", color: "#111" },
  scoreLabel: { fontSize: 16, color: "#666", textAlign: "center" },
  reviewRow: { borderTopWidth: 1, borderColor: "#eee", paddingTop: 12, gap: 4 },
});
