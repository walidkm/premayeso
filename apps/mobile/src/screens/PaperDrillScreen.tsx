import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  type ExamPaperDetail,
  type PaperAttemptQuestion,
  type PaperAttemptQuestionSummary,
  type PaperAttemptSectionSummary,
  type PaperAttemptSummary,
  type PaperSection,
  getPaperAttempt,
  getPaperAttemptQuestion,
  getPaperAttemptReview,
  getPaperDetail,
  savePaperAttemptAnswer,
  startPaperAttemptApi,
  submitPaperAttemptApi,
} from "../lib/api";
import MathText from "../components/MathText";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "PaperDrill">;
type Phase = "cover" | "attempt" | "selection" | "review";

type DraftPartAnswer = {
  selectedOption: string | null;
  textAnswer: string;
  numericAnswer: string;
};

type DraftAnswer = {
  selectedOption: string | null;
  textAnswer: string;
  numericAnswer: string;
  partAnswers: Record<string, DraftPartAnswer>;
};

type SubmissionConflict = {
  sectionId: string;
  sectionCode: string;
  message: string;
  requiredCount: number;
  questions: PaperAttemptQuestionSummary[];
};

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function timerColor(totalSeconds: number | null): string {
  if (totalSeconds === null) return "#166534";
  if (totalSeconds < 5 * 60) return "#b91c1c";
  if (totalSeconds < 30 * 60) return "#b45309";
  return "#166534";
}

function emptyDraftPart(): DraftPartAnswer {
  return { selectedOption: null, textAnswer: "", numericAnswer: "" };
}

function emptyDraft(): DraftAnswer {
  return { selectedOption: null, textAnswer: "", numericAnswer: "", partAnswers: {} };
}

function hasPartValue(part: DraftPartAnswer | undefined): boolean {
  if (!part) return false;
  return Boolean(part.selectedOption || part.textAnswer.trim() || part.numericAnswer.trim());
}

function hasDraftValue(draft: DraftAnswer | undefined): boolean {
  if (!draft) return false;
  if (draft.selectedOption || draft.textAnswer.trim() || draft.numericAnswer.trim()) return true;
  return Object.values(draft.partAnswers).some((part) => hasPartValue(part));
}

function buildDraftFromQuestion(question: PaperAttemptQuestion): DraftAnswer {
  const nextDraft = emptyDraft();
  for (const answer of question.answers) {
    if (answer.questionPartId) {
      nextDraft.partAnswers[answer.questionPartId] = {
        selectedOption: answer.selectedOption ?? null,
        textAnswer: answer.textAnswer ?? "",
        numericAnswer:
          answer.numericAnswer !== null && answer.numericAnswer !== undefined
            ? String(answer.numericAnswer)
            : "",
      };
      continue;
    }

    nextDraft.selectedOption = answer.selectedOption ?? null;
    nextDraft.textAnswer = answer.textAnswer ?? "";
    nextDraft.numericAnswer =
      answer.numericAnswer !== null && answer.numericAnswer !== undefined
        ? String(answer.numericAnswer)
        : "";
  }
  return nextDraft;
}

function serializeDraft(question: PaperAttemptQuestion, draft: DraftAnswer) {
  if (question.parts.length > 0) {
    const partAnswers = question.parts
      .map((part) => {
        const partDraft = draft.partAnswers[part.id];
        if (!hasPartValue(partDraft)) return null;
        return {
          questionPartId: part.id,
          selectedOption: partDraft?.selectedOption ?? null,
          textAnswer:
            !part.options.length && partDraft?.textAnswer.trim().length
              ? partDraft.textAnswer
              : null,
          numericAnswer:
            !part.options.length && partDraft?.numericAnswer.trim().length
              ? Number(partDraft.numericAnswer)
              : null,
        };
      })
      .filter(
        (
          partAnswer
        ): partAnswer is {
          questionPartId: string;
          selectedOption: string | null;
          textAnswer: string | null;
          numericAnswer: number | null;
        } => Boolean(partAnswer)
      );

    return {
      partAnswers,
    };
  }

  if (question.type === "mcq" || question.type === "true_false") {
    return { selectedOption: draft.selectedOption ?? null };
  }

  if (question.type === "numeric") {
    return {
      numericAnswer: draft.numericAnswer.trim().length ? Number(draft.numericAnswer) : null,
    };
  }

  return { textAnswer: draft.textAnswer.trim().length ? draft.textAnswer : null };
}

function formatPaperTitle(paper: { year?: number | null; paper_number?: number | null; title?: string | null }) {
  const parts: string[] = [];
  if (paper.year) parts.push(String(paper.year));
  if (paper.paper_number) parts.push(`Paper ${paper.paper_number}`);
  if (!parts.length && paper.title) parts.push(paper.title);
  return parts.join(" / ") || "Exam paper";
}

function flattenQuestionSummaries(summary: PaperAttemptSummary): Array<{
  section: PaperAttemptSectionSummary;
  question: PaperAttemptQuestionSummary;
}> {
  return summary.sections.flatMap((section) =>
    section.questions.map((question) => ({ section, question }))
  );
}

function buildSectionRule(section: PaperSection | PaperAttemptSectionSummary): string {
  const selectionMode =
    "questionSelectionMode" in section
      ? section.questionSelectionMode
      : section.question_selection_mode;
  const requiredCount =
    "requiredCount" in section ? section.requiredCount : section.required_count;

  if (selectionMode === "answer_any_n") {
    return `Answer any ${requiredCount ?? 0}`;
  }
  return "Answer all questions";
}

export default function PaperDrillScreen({ route, navigation }: Props) {
  const { paper, subject } = route.params;

  const [phase, setPhase] = useState<Phase>("cover");
  const [paperDetail, setPaperDetail] = useState<ExamPaperDetail | null>(null);
  const [attemptSummary, setAttemptSummary] = useState<PaperAttemptSummary | null>(null);
  const [reviewSummary, setReviewSummary] = useState<PaperAttemptSummary | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PaperAttemptQuestion | null>(null);
  const [currentSection, setCurrentSection] = useState<PaperSection | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftAnswer>(emptyDraft());
  const [draftsByQuestionId, setDraftsByQuestionId] = useState<Record<string, DraftAnswer>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [selectionConflicts, setSelectionConflicts] = useState<SubmissionConflict[]>([]);
  const [selectedQuestionIdsBySection, setSelectedQuestionIdsBySection] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expirySyncStartedRef = useRef(false);

  const questionList = attemptSummary ? flattenQuestionSummaries(attemptSummary) : [];
  const currentIndex = questionList.findIndex((entry) => entry.question.id === currentQuestionId);
  const currentQuestionSummary = currentIndex >= 0 ? questionList[currentIndex] : null;
  const sectionCards = paperDetail?.paper_sections ?? [];

  useEffect(() => {
    let cancelled = false;
    getPaperDetail(paper.id)
      .then((detail) => {
        if (!cancelled) setPaperDetail(detail);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load paper");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paper.id]);

  useEffect(() => {
    if (phase !== "attempt" || !attemptSummary?.attempt.id || !currentQuestionId) return;

    let cancelled = false;
    setQuestionLoading(true);
    setError(null);

    getPaperAttemptQuestion(attemptSummary.attempt.id, currentQuestionId)
      .then((response) => {
        if (cancelled) return;
        const nextDraft = buildDraftFromQuestion(response.question);
        setCurrentQuestion(response.question);
        setCurrentSection(response.section);
        setDraft(nextDraft);
        setDraftsByQuestionId((current) => ({ ...current, [response.question.id]: nextDraft }));
        setRemainingSeconds(response.question.remainingSeconds);
      })
      .catch(async (requestError) => {
        if (cancelled) return;
        const message = requestError instanceof Error ? requestError.message : "Failed to load question";
        if (message.includes("no longer in progress")) {
          try {
            const review = await getPaperAttemptReview(attemptSummary.attempt.id);
            if (!cancelled) {
              setReviewSummary(review);
              setRemainingSeconds(review.remainingSeconds ?? 0);
              setPhase("review");
            }
            return;
          } catch {
            // fall through to visible error below
          }
        }
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setQuestionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attemptSummary?.attempt.id, currentQuestionId, phase]);

  useEffect(() => {
    if (phase !== "attempt" || remainingSeconds === null) return;
    if (remainingSeconds <= 0) {
      if (attemptSummary?.attempt.id && !expirySyncStartedRef.current) {
        expirySyncStartedRef.current = true;
        void (async () => {
          await persistCurrentQuestion();
          await syncAttemptState(attemptSummary.attempt.id);
        })();
      }
      return;
    }

    const timer = setTimeout(() => {
      setRemainingSeconds((current) => (current === null ? current : Math.max(0, current - 1)));
    }, 1000);

    return () => clearTimeout(timer);
  }, [attemptSummary?.attempt.id, phase, remainingSeconds]);

  async function syncAttemptState(attemptId: string) {
    const summary = await getPaperAttempt(attemptId);

    if (summary.attempt.status === "in_progress") {
      expirySyncStartedRef.current = false;
      setAttemptSummary(summary);
      setRemainingSeconds(summary.remainingSeconds ?? null);
      setCurrentQuestionId((current) => {
        if (current && flattenQuestionSummaries(summary).some((entry) => entry.question.id === current)) {
          return current;
        }
        return summary.firstQuestionId ?? flattenQuestionSummaries(summary)[0]?.question.id ?? null;
      });
      return summary;
    }

    setReviewSummary(summary);
    setRemainingSeconds(summary.remainingSeconds ?? 0);
    setPhase("review");
    return summary;
  }

  async function handleBeginExam() {
    setLoading(true);
    setError(null);
    try {
      const started = await startPaperAttemptApi(paper.id);
      expirySyncStartedRef.current = false;
      setDraftsByQuestionId({});
      setSelectionConflicts([]);
      setSelectedQuestionIdsBySection({});
      await syncAttemptState(started.attempt.id);
      setPhase("attempt");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to start paper");
    } finally {
      setLoading(false);
    }
  }

  async function persistCurrentQuestion(): Promise<boolean> {
    if (!attemptSummary?.attempt.id || !currentQuestion || !currentQuestionId) return true;

    setSaving(true);
    setError(null);
    try {
      await savePaperAttemptAnswer(
        attemptSummary.attempt.id,
        currentQuestionId,
        serializeDraft(currentQuestion, draft)
      );
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save answer");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function navigateToQuestion(questionId: string) {
    if (questionId === currentQuestionId) return;
    const saved = await persistCurrentQuestion();
    if (!saved) return;
    setCurrentQuestionId(questionId);
  }

  function updateDraft(nextDraft: DraftAnswer) {
    setDraft(nextDraft);
    if (currentQuestionId) {
      setDraftsByQuestionId((current) => ({ ...current, [currentQuestionId]: nextDraft }));
    }
  }

  function toggleSelection(sectionId: string, questionId: string, requiredCount: number) {
    setSelectedQuestionIdsBySection((current) => {
      const selected = current[sectionId] ?? [];
      if (selected.includes(questionId)) {
        return { ...current, [sectionId]: selected.filter((candidate) => candidate !== questionId) };
      }
      if (selected.length >= requiredCount) {
        Alert.alert("Selection limit", `This section only counts ${requiredCount} questions.`);
        return current;
      }
      return { ...current, [sectionId]: [...selected, questionId] };
    });
  }

  async function handleSubmit(selectedMap?: Record<string, string[]>) {
    if (!attemptSummary?.attempt.id) return;

    const saved = await persistCurrentQuestion();
    if (!saved) return;

    setSubmitting(true);
    setError(null);

    try {
      const summary = await submitPaperAttemptApi(
        attemptSummary.attempt.id,
        selectedMap ?? selectedQuestionIdsBySection
      );
      setReviewSummary(summary);
      setRemainingSeconds(summary.remainingSeconds ?? 0);
      setPhase("review");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to submit paper";
      const validationErrors =
        requestError &&
        typeof requestError === "object" &&
        "validationErrors" in requestError &&
        Array.isArray((requestError as { validationErrors?: unknown }).validationErrors)
          ? (requestError as {
              validationErrors?: Array<{
                sectionId: string;
                sectionCode: string;
                message: string;
                answeredQuestionIds?: string[];
              }>;
            }).validationErrors ?? []
          : [];

      const blockingMessages = validationErrors
        .filter((entry) => !entry.answeredQuestionIds?.length)
        .map((entry) => entry.message);

      if (blockingMessages.length > 0) {
        Alert.alert("Submission blocked", blockingMessages.join("\n"));
      }

      const conflicts = validationErrors
        .filter((entry) => (entry.answeredQuestionIds?.length ?? 0) > 0)
        .map((entry) => {
          const section = attemptSummary.sections.find(
            (candidate) => candidate.id === entry.sectionId || candidate.sectionCode === entry.sectionCode
          );
          return {
            sectionId: entry.sectionId,
            sectionCode: entry.sectionCode,
            message: entry.message,
            requiredCount: section?.requiredCount ?? 0,
            questions:
              section?.questions.filter((question) =>
                (entry.answeredQuestionIds ?? []).includes(question.id)
              ) ?? [],
          } satisfies SubmissionConflict;
        });

      if (conflicts.length > 0) {
        const nextSelections: Record<string, string[]> = {};
        for (const conflict of conflicts) {
          nextSelections[conflict.sectionId] =
            selectedQuestionIdsBySection[conflict.sectionId] ??
            conflict.questions.slice(0, conflict.requiredCount).map((question) => question.id);
        }
        setSelectionConflicts(conflicts);
        setSelectedQuestionIdsBySection(nextSelections);
        setPhase("selection");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderPartInput(partId: string, options: Array<{ key: string; text: string }>) {
    const partDraft = draft.partAnswers[partId] ?? emptyDraftPart();

    if (options.length > 0) {
      return (
        <View style={s.optionList}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[s.optionCard, partDraft.selectedOption === option.key && s.optionCardSelected]}
              onPress={() =>
                updateDraft({
                  ...draft,
                  partAnswers: {
                    ...draft.partAnswers,
                    [partId]: { ...partDraft, selectedOption: option.key },
                  },
                })
              }
            >
              <Text style={[s.optionKey, partDraft.selectedOption === option.key && s.optionKeySelected]}>
                {option.key}
              </Text>
              <View style={{ flex: 1 }}>
                <MathText text={option.text} fontSize={14} color="#334155" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return (
      <TextInput
        value={partDraft.textAnswer}
        onChangeText={(value) =>
          updateDraft({
            ...draft,
            partAnswers: {
              ...draft.partAnswers,
              [partId]: { ...partDraft, textAnswer: value },
            },
          })
        }
        placeholder="Write your answer"
        multiline
        style={[s.textInput, s.multilineInput]}
        textAlignVertical="top"
      />
    );
  }

  function renderQuestionInput(question: PaperAttemptQuestion) {
    if (question.parts.length > 0) {
      return (
        <View style={s.partsList}>
          {question.parts.map((part) => (
            <View key={part.id} style={s.partCard}>
              <View style={s.rowBetween}>
                <Text style={s.partLabel}>{part.partLabel}</Text>
                <Text style={s.metaText}>{part.marks} marks</Text>
              </View>
              <MathText text={part.body} fontSize={15} color="#0f172a" />
              {renderPartInput(part.id, part.options)}
            </View>
          ))}
        </View>
      );
    }

    if (question.type === "mcq" || question.type === "true_false") {
      return (
        <View style={s.optionList}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[s.optionCard, draft.selectedOption === option.key && s.optionCardSelected]}
              onPress={() => updateDraft({ ...draft, selectedOption: option.key })}
            >
              <Text style={[s.optionKey, draft.selectedOption === option.key && s.optionKeySelected]}>
                {option.key}
              </Text>
              <View style={{ flex: 1 }}>
                <MathText text={option.text} fontSize={15} color="#334155" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (question.type === "numeric") {
      return (
        <TextInput
          value={draft.numericAnswer}
          onChangeText={(value) => updateDraft({ ...draft, numericAnswer: value })}
          keyboardType="numeric"
          placeholder="Enter a number"
          style={s.textInput}
        />
      );
    }

    return (
      <TextInput
        value={draft.textAnswer}
        onChangeText={(value) => updateDraft({ ...draft, textAnswer: value })}
        placeholder={question.type === "essay" ? "Write your essay answer" : "Write your answer"}
        multiline
        style={[s.textInput, s.multilineInput, question.type === "essay" && s.essayInput]}
        textAlignVertical="top"
      />
    );
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && phase === "cover") {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error}</Text>
      </View>
    );
  }

  if (phase === "cover") {
    return (
      <ScrollView contentContainerStyle={s.screen}>
        <Text style={s.kicker}>{subject.name}</Text>
        <Text style={s.title}>{formatPaperTitle(paperDetail ?? paper)}</Text>
        {paperDetail?.title ? <Text style={s.subtitle}>{paperDetail.title}</Text> : null}

        <View style={s.cardGrid}>
          <View style={s.card}><Text style={s.cardValue}>{paper.question_count}</Text><Text style={s.cardLabel}>Questions</Text></View>
          <View style={s.card}><Text style={s.cardValue}>{paperDetail?.duration_min ?? paper.duration_min ?? 150}</Text><Text style={s.cardLabel}>Minutes</Text></View>
          <View style={s.card}><Text style={s.cardValue}>{paperDetail?.total_marks ?? paper.total_marks ?? "-"}</Text><Text style={s.cardLabel}>Marks</Text></View>
          <View style={s.card}><Text style={s.cardValue}>{sectionCards.length}</Text><Text style={s.cardLabel}>Sections</Text></View>
        </View>

        <View style={s.infoCard}>
          <Text style={s.sectionTitle}>Instructions</Text>
          <Text style={s.infoText}>{paperDetail?.instructions?.trim() || "Read each section rule before you begin."}</Text>
        </View>

        {sectionCards.map((section) => (
          <View key={section.id} style={s.sectionCard}>
            <View style={s.rowBetween}>
              <Text style={s.sectionCode}>{section.section_code}</Text>
              <Text style={s.ruleText}>{buildSectionRule(section)}</Text>
            </View>
            <Text style={s.sectionTitle}>{section.title ?? `Section ${section.section_code}`}</Text>
            {section.instructions ? <Text style={s.infoText}>{section.instructions}</Text> : null}
          </View>
        ))}

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <TouchableOpacity style={s.primaryButton} onPress={() => void handleBeginExam()}>
          <Text style={s.primaryButtonText}>Begin exam</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === "selection") {
    return (
      <ScrollView contentContainerStyle={s.screen}>
        <Text style={s.title}>Select counted questions</Text>
        <Text style={s.subtitle}>Choose which answers should count in optional sections before submitting.</Text>

        {selectionConflicts.map((conflict) => {
          const selected = selectedQuestionIdsBySection[conflict.sectionId] ?? [];
          return (
            <View key={conflict.sectionId} style={s.sectionCard}>
              <Text style={s.sectionCode}>{conflict.sectionCode}</Text>
              <Text style={s.sectionTitle}>{conflict.message}</Text>
              <Text style={s.infoText}>Select {conflict.requiredCount} questions.</Text>

              {conflict.questions.map((question) => {
                const active = selected.includes(question.id);
                return (
                  <TouchableOpacity
                    key={question.id}
                    style={[s.selectionOption, active && s.selectionOptionActive]}
                    onPress={() => toggleSelection(conflict.sectionId, question.id, conflict.requiredCount)}
                  >
                    <Text style={[s.selectionTitle, active && s.selectionTitleActive]}>
                      Q{question.questionNumber}
                    </Text>
                    <Text style={[s.selectionText, active && s.selectionTitleActive]} numberOfLines={2}>
                      {question.question.stem}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <TouchableOpacity style={s.secondaryButton} onPress={() => setPhase("attempt")}>
          <Text style={s.secondaryButtonText}>Back to exam</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.primaryButton} onPress={() => void handleSubmit(selectedQuestionIdsBySection)}>
          <Text style={s.primaryButtonText}>Submit selected questions</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === "review") {
    const summary = reviewSummary ?? attemptSummary;
    if (!summary) {
      return (
        <View style={s.centered}>
          <Text style={s.errorText}>Review data is unavailable.</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={s.screen}>
        <Text style={s.title}>Paper review</Text>
        <Text style={s.subtitle}>{formatPaperTitle(summary.paper)}</Text>

        <View style={s.cardGrid}>
          <View style={s.card}><Text style={s.cardValue}>{summary.attempt.status}</Text><Text style={s.cardLabel}>Attempt</Text></View>
          <View style={s.card}><Text style={s.cardValue}>{summary.attempt.marking_status}</Text><Text style={s.cardLabel}>Marking</Text></View>
          <View style={s.card}><Text style={s.cardValue}>{summary.attempt.final_score ?? summary.attempt.objective_score ?? "-"}</Text><Text style={s.cardLabel}>Score</Text></View>
          <View style={s.card}><Text style={s.cardValue}>{summary.attempt.max_score ?? "-"}</Text><Text style={s.cardLabel}>Maximum</Text></View>
        </View>

        {!summary.revealSolutions ? (
          <View style={s.infoCard}>
            <Text style={s.infoText}>Worked solutions stay hidden until the paper rules allow review.</Text>
          </View>
        ) : null}

        {summary.sections.map((section) => (
          <View key={section.id} style={s.sectionCard}>
            <View style={s.rowBetween}>
              <Text style={s.sectionCode}>{section.sectionCode}</Text>
              <Text style={s.ruleText}>{buildSectionRule(section)}</Text>
            </View>
            <Text style={s.sectionTitle}>{section.title ?? `Section ${section.sectionCode}`}</Text>
            <Text style={s.infoText}>
              Answered {section.answeredCount}/{section.questionCount} / Pending manual {section.pendingManualCount} / Score {section.score}/{section.maxScore}
            </Text>

            {section.questions.map((question) => (
              <View key={question.id} style={s.questionReviewCard}>
                <View style={s.rowBetween}>
                  <Text style={s.selectionTitle}>Q{question.questionNumber}</Text>
                  <Text style={s.metaText}>
                    {question.pendingManual ? "Pending manual" : question.answered ? `Scored ${question.score ?? 0}/${question.maxScore}` : "Not answered"}
                  </Text>
                </View>
                <MathText text={question.question.stem} fontSize={14} color="#334155" />
                {summary.revealSolutions && question.question.expectedAnswer ? (
                  <Text style={s.infoText}>Expected answer: {question.question.expectedAnswer}</Text>
                ) : null}
                {summary.revealSolutions && question.question.explanation ? (
                  <Text style={s.infoText}>{question.question.explanation}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity style={s.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={s.primaryButtonText}>Back to papers</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!attemptSummary || !currentQuestion || !currentQuestionId || !currentQuestionSummary) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const answeredCount = questionList.filter((entry) => {
    const localDraft = draftsByQuestionId[entry.question.id];
    return localDraft ? hasDraftValue(localDraft) : entry.question.answered;
  }).length;
  const previousQuestionId = currentIndex > 0 ? questionList[currentIndex - 1]?.question.id : null;
  const nextQuestionId =
    currentIndex >= 0 && currentIndex < questionList.length - 1
      ? questionList[currentIndex + 1]?.question.id
      : null;

  return (
    <View style={s.attemptRoot}>
      <View style={s.attemptHeader}>
        <View>
          <Text style={s.selectionTitle}>{currentIndex + 1} / {questionList.length}</Text>
          <Text style={s.metaText}>{answeredCount} answered</Text>
        </View>
        <Text style={[s.timerText, { color: timerColor(remainingSeconds) }]}>{formatTime(remainingSeconds ?? 0)}</Text>
      </View>

      {questionLoading ? <ActivityIndicator style={{ marginTop: 8 }} size="small" /> : null}

      <ScrollView contentContainerStyle={s.screen}>
        <View style={s.sectionCard}>
          <View style={s.rowBetween}>
            <Text style={s.sectionCode}>{currentSection?.section_code ?? currentQuestionSummary.section.sectionCode}</Text>
            <Text style={s.ruleText}>{buildSectionRule(currentSection ?? currentQuestionSummary.section)}</Text>
          </View>
          <Text style={s.metaText}>Question {currentQuestion.questionNumber} / {currentQuestion.marks} marks</Text>
        </View>

        <MathText text={currentQuestion.stem} fontSize={18} color="#0f172a" />
        {currentSection?.instructions ? (
          <View style={s.infoCard}>
            <Text style={s.infoText}>{currentSection.instructions}</Text>
          </View>
        ) : null}

        {renderQuestionInput(currentQuestion)}
        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.secondaryButton, !previousQuestionId && s.disabled]}
          disabled={!previousQuestionId || saving || submitting}
          onPress={() => previousQuestionId && void navigateToQuestion(previousQuestionId)}
        >
          <Text style={s.secondaryButtonText}>Prev</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dotScroller}>
          {questionList.map((entry, index) => {
            const localDraft = draftsByQuestionId[entry.question.id];
            const answered = localDraft ? hasDraftValue(localDraft) : entry.question.answered;
            const active = entry.question.id === currentQuestionId;
            return (
              <TouchableOpacity
                key={entry.question.id}
                style={[s.dot, active && s.dotActive, answered && !active && s.dotAnswered]}
                onPress={() => void navigateToQuestion(entry.question.id)}
              >
                <Text style={[s.dotText, (active || answered) && s.dotTextActive]}>{index + 1}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {nextQuestionId ? (
          <TouchableOpacity
            style={s.secondaryButton}
            disabled={saving || submitting}
            onPress={() => nextQuestionId && void navigateToQuestion(nextQuestionId)}
          >
            <Text style={s.secondaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.primaryButtonSmall} disabled={saving || submitting} onPress={() => void handleSubmit()}>
            <Text style={s.primaryButtonText}>{submitting ? "Submitting..." : "Submit"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  screen: {
    padding: 18,
    gap: 16,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 14,
  },
  infoText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  ruleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonSmall: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
  },
  optionList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 14,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  optionKey: {
    fontSize: 15,
    fontWeight: "800",
    color: "#94a3b8",
    minWidth: 20,
  },
  optionKeySelected: {
    color: "#0f172a",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  multilineInput: {
    minHeight: 140,
  },
  essayInput: {
    minHeight: 220,
  },
  partsList: {
    gap: 12,
  },
  partCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 14,
    gap: 10,
  },
  partLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
  },
  selectionOption: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: "#ffffff",
  },
  selectionOptionActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  selectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  selectionTitleActive: {
    color: "#ffffff",
  },
  selectionText: {
    fontSize: 13,
    color: "#475569",
  },
  questionReviewCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 8,
  },
  attemptRoot: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  attemptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  timerText: {
    fontSize: 20,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  dotScroller: {
    flex: 1,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  dotAnswered: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
  },
  dotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  dotTextActive: {
    color: "#ffffff",
  },
  disabled: {
    opacity: 0.4,
  },
});
