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
} from "../lib/api";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Quiz">;

type AnswerRecord = {
  question_id: string;
  chosen: string;
  correct: boolean;
};

type Phase = "question" | "feedback" | "results";

export default function QuizScreen({ route, navigation }: Props) {
  const { topic } = route.params;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

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

  // Results screen
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
              <Text style={s.reviewStem}>{q.stem}</Text>
              <Text style={a.correct ? s.correctText : s.incorrectText}>
                {a.correct ? "Correct" : `Incorrect — answer: ${a.chosen}`}
              </Text>
            </View>
          );
        })}

        <TouchableOpacity
          style={s.btn}
          onPress={() => navigation.goBack()}
        >
          <Text style={s.btnText}>Back to Topics</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const question = questions[index];

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
      const finalAnswers = answers;
      const score = finalAnswers.filter((a) => a.correct).length;

      // TODO: replace null with real user_id once auth is added
      await saveQuizAttempt({
        user_id: null,
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
      <Text style={s.counter}>
        {index + 1} / {questions.length}
      </Text>

      <Text style={s.stem}>{question.stem}</Text>

      <View style={s.options}>
        {question.options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={optionStyle(opt.key)}
            onPress={() => handleOptionPress(opt.key)}
            disabled={phase === "feedback" || checking}
          >
            <Text style={s.optionKey}>{opt.key}.</Text>
            <Text style={s.optionText}>{opt.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {phase === "feedback" && (
        <View style={s.feedback}>
          <Text style={result?.correct ? s.correctText : s.incorrectText}>
            {result?.correct ? "Correct!" : "Incorrect"}
          </Text>
          {result?.explanation && (
            <Text style={s.explanation}>{result.explanation}</Text>
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
  stem: { fontSize: 18, fontWeight: "600", lineHeight: 26 },
  options: { gap: 10, marginTop: 8 },
  option: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fff",
  },
  optionSelected: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "#555",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f5f5f5",
  },
  optionCorrect: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "#16a34a",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f0fdf4",
  },
  optionWrong: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "#dc2626",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fef2f2",
  },
  optionKey: { fontWeight: "700", fontSize: 15, color: "#333", minWidth: 20 },
  optionText: { fontSize: 15, color: "#333", flex: 1 },
  feedback: { gap: 10, marginTop: 8 },
  correctText: { fontSize: 16, fontWeight: "700", color: "#16a34a" },
  incorrectText: { fontSize: 16, fontWeight: "700", color: "#dc2626" },
  explanation: { fontSize: 14, color: "#555", lineHeight: 22 },
  btn: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  resultsTitle: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  score: { fontSize: 48, fontWeight: "800", textAlign: "center", color: "#111" },
  scoreLabel: { fontSize: 16, color: "#666", textAlign: "center" },
  reviewRow: {
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 12,
    gap: 4,
  },
  reviewStem: { fontSize: 14, color: "#333" },
});
