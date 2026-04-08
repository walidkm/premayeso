-- ============================================================
-- Migration 012: MANEB structured papers, rubrics, and attempts
-- Adds: essay_rubrics, essay_rubric_criteria, paper_attempts,
--       attempt_answers, answer_marks, essay_marking_reviews
-- Extends: exam_papers, paper_questions, questions, paper_sections,
--          question_parts
-- Safe to run on existing data — changes are additive or relaxing.
-- ============================================================

-- ── Extend exam_papers ───────────────────────────────────────
ALTER TABLE public.exam_papers
  ALTER COLUMN paper_type SET DEFAULT 'maneb_past_paper';

ALTER TABLE public.exam_papers
  ADD COLUMN IF NOT EXISTS question_mode TEXT NOT NULL DEFAULT 'one_question_at_a_time',
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.exam_papers ADD CONSTRAINT exam_papers_question_mode_check
    CHECK (question_mode IN ('one_question_at_a_time','full_paper'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.exam_papers
  SET updated_at = COALESCE(updated_at, created_at, now());

-- ── Extend subtopics ─────────────────────────────────────────
ALTER TABLE public.subtopics
  ADD COLUMN IF NOT EXISTS code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS subtopics_code_idx
  ON public.subtopics(code)
  WHERE code IS NOT NULL;

-- ── Extend paper_sections / question_parts ───────────────────
ALTER TABLE public.paper_sections
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.question_parts
  ADD COLUMN IF NOT EXISTS options    JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS correct_option TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── Extend paper_questions ───────────────────────────────────
ALTER TABLE public.paper_questions
  ADD COLUMN IF NOT EXISTS question_number INTEGER;

UPDATE public.paper_questions
  SET question_number = order_index + 1
  WHERE question_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS paper_questions_paper_question_number_idx
  ON public.paper_questions(exam_paper_id, question_number)
  WHERE question_number IS NOT NULL;

-- ── Extend questions ─────────────────────────────────────────
ALTER TABLE public.questions
  ALTER COLUMN correct_option DROP NOT NULL,
  ALTER COLUMN options SET DEFAULT '[]'::jsonb;

UPDATE public.questions
  SET options = '[]'::jsonb
  WHERE options IS NULL;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS auto_marking_mode TEXT NOT NULL DEFAULT 'exact';

DO $$ BEGIN
  ALTER TABLE public.questions ADD CONSTRAINT questions_auto_marking_mode_check
    CHECK (auto_marking_mode IN ('exact','keyword','manual','hybrid'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.questions
  SET auto_marking_mode = CASE
    WHEN type = 'essay' THEN 'manual'
    WHEN type = 'structured' THEN 'manual'
    WHEN type = 'short_answer' THEN 'keyword'
    ELSE 'exact'
  END
  WHERE auto_marking_mode IS NULL
     OR auto_marking_mode = '';

-- ── New: essay_rubrics ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.essay_rubrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_code TEXT,
  exam_path   exam_path_enum,
  subject_id  UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  total_marks INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS essay_rubrics_rubric_code_idx
  ON public.essay_rubrics(rubric_code)
  WHERE rubric_code IS NOT NULL;

ALTER TABLE public.essay_rubrics ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.essay_rubric_criteria (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id     UUID NOT NULL REFERENCES public.essay_rubrics(id) ON DELETE CASCADE,
  criterion_name TEXT NOT NULL,
  max_marks     NUMERIC(8,2) NOT NULL DEFAULT 0,
  mark_bands    JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS essay_rubric_criteria_rubric_id_idx
  ON public.essay_rubric_criteria(rubric_id);

CREATE UNIQUE INDEX IF NOT EXISTS essay_rubric_criteria_order_idx
  ON public.essay_rubric_criteria(rubric_id, order_index);

ALTER TABLE public.essay_rubric_criteria ENABLE ROW LEVEL SECURITY;

-- Wire rubric foreign keys after tables exist.
DO $$ BEGIN
  ALTER TABLE public.questions ADD CONSTRAINT questions_rubric_id_fkey
    FOREIGN KEY (rubric_id) REFERENCES public.essay_rubrics(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.question_parts ADD CONSTRAINT question_parts_rubric_id_fkey
    FOREIGN KEY (rubric_id) REFERENCES public.essay_rubrics(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── New: paper_attempts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paper_attempts (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id                  UUID NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  user_id                        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status                         TEXT NOT NULL DEFAULT 'in_progress',
  marking_status                 TEXT NOT NULL DEFAULT 'pending',
  time_limit_seconds             INTEGER,
  started_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                     TIMESTAMPTZ NOT NULL,
  submitted_at                   TIMESTAMPTZ,
  finalized_at                   TIMESTAMPTZ,
  selected_question_ids_by_section JSONB NOT NULL DEFAULT '{}'::jsonb,
  objective_score                NUMERIC(8,2),
  manual_score                   NUMERIC(8,2),
  final_score                    NUMERIC(8,2),
  max_score                      NUMERIC(8,2),
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.paper_attempts ADD CONSTRAINT paper_attempts_status_check
    CHECK (status IN ('in_progress','submitted','auto_submitted','partially_marked','marked','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.paper_attempts ADD CONSTRAINT paper_attempts_marking_status_check
    CHECK (marking_status IN ('pending','objective_scored','pending_manual','under_review','completed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS paper_attempts_paper_id_idx ON public.paper_attempts(exam_paper_id);
CREATE INDEX IF NOT EXISTS paper_attempts_user_id_idx ON public.paper_attempts(user_id);
CREATE INDEX IF NOT EXISTS paper_attempts_status_idx ON public.paper_attempts(status);

ALTER TABLE public.paper_attempts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "users read own paper_attempts"
    ON public.paper_attempts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "users insert own paper_attempts"
    ON public.paper_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "users update own paper_attempts"
    ON public.paper_attempts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── New: attempt_answers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_attempt_id    UUID NOT NULL REFERENCES public.paper_attempts(id) ON DELETE CASCADE,
  paper_question_id   UUID NOT NULL REFERENCES public.paper_questions(id) ON DELETE CASCADE,
  question_id         UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  question_part_id    UUID REFERENCES public.question_parts(id) ON DELETE CASCADE,
  selected_option     TEXT,
  text_answer         TEXT,
  numeric_answer      NUMERIC(12,4),
  answer_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  answer_status       TEXT NOT NULL DEFAULT 'draft',
  is_selected_for_marking BOOLEAN NOT NULL DEFAULT TRUE,
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.attempt_answers ADD CONSTRAINT attempt_answers_status_check
    CHECK (answer_status IN ('draft','submitted','auto_submitted','skipped'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS attempt_answers_attempt_id_idx ON public.attempt_answers(paper_attempt_id);
CREATE INDEX IF NOT EXISTS attempt_answers_paper_question_id_idx ON public.attempt_answers(paper_question_id);
CREATE INDEX IF NOT EXISTS attempt_answers_question_part_id_idx ON public.attempt_answers(question_part_id);

CREATE UNIQUE INDEX IF NOT EXISTS attempt_answers_question_unique_idx
  ON public.attempt_answers(paper_attempt_id, paper_question_id)
  WHERE question_part_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attempt_answers_question_part_unique_idx
  ON public.attempt_answers(paper_attempt_id, question_part_id)
  WHERE question_part_id IS NOT NULL;

ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "users read own attempt_answers"
    ON public.attempt_answers
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.paper_attempts
        WHERE public.paper_attempts.id = paper_attempt_id
          AND public.paper_attempts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "users insert own attempt_answers"
    ON public.attempt_answers
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.paper_attempts
        WHERE public.paper_attempts.id = paper_attempt_id
          AND public.paper_attempts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "users update own attempt_answers"
    ON public.attempt_answers
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.paper_attempts
        WHERE public.paper_attempts.id = paper_attempt_id
          AND public.paper_attempts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── New: answer_marks ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.answer_marks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_attempt_id UUID NOT NULL REFERENCES public.paper_attempts(id) ON DELETE CASCADE,
  attempt_answer_id UUID NOT NULL REFERENCES public.attempt_answers(id) ON DELETE CASCADE,
  criterion_id     UUID REFERENCES public.essay_rubric_criteria(id) ON DELETE SET NULL,
  marker_type      TEXT NOT NULL DEFAULT 'system',
  score            NUMERIC(8,2),
  suggested_score  NUMERIC(8,2),
  final_score      NUMERIC(8,2),
  comment          TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'unreviewed',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.answer_marks ADD CONSTRAINT answer_marks_marker_type_check
    CHECK (marker_type IN ('system','ai','human','moderator'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.answer_marks ADD CONSTRAINT answer_marks_moderation_status_check
    CHECK (moderation_status IN ('unreviewed','reviewed','overridden'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS answer_marks_attempt_id_idx ON public.answer_marks(paper_attempt_id);
CREATE INDEX IF NOT EXISTS answer_marks_answer_id_idx ON public.answer_marks(attempt_answer_id);
CREATE INDEX IF NOT EXISTS answer_marks_criterion_id_idx ON public.answer_marks(criterion_id);

CREATE UNIQUE INDEX IF NOT EXISTS answer_marks_answer_marker_unique_idx
  ON public.answer_marks(attempt_answer_id, marker_type)
  WHERE criterion_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS answer_marks_answer_criterion_marker_unique_idx
  ON public.answer_marks(attempt_answer_id, criterion_id, marker_type)
  WHERE criterion_id IS NOT NULL;

ALTER TABLE public.answer_marks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "users read own answer_marks"
    ON public.answer_marks
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.paper_attempts
        WHERE public.paper_attempts.id = paper_attempt_id
          AND public.paper_attempts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── New: essay_marking_reviews ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.essay_marking_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_attempt_id UUID NOT NULL REFERENCES public.paper_attempts(id) ON DELETE CASCADE,
  paper_question_id UUID REFERENCES public.paper_questions(id) ON DELETE CASCADE,
  attempt_answer_id UUID REFERENCES public.attempt_answers(id) ON DELETE CASCADE,
  reviewer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  marker_mode      TEXT NOT NULL DEFAULT 'manual',
  status           TEXT NOT NULL DEFAULT 'draft',
  overall_comment  TEXT,
  suggested_total  NUMERIC(8,2),
  final_total      NUMERIC(8,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at     TIMESTAMPTZ
);

DO $$ BEGIN
  ALTER TABLE public.essay_marking_reviews ADD CONSTRAINT essay_marking_reviews_marker_mode_check
    CHECK (marker_mode IN ('manual','ai_assisted','hybrid'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.essay_marking_reviews ADD CONSTRAINT essay_marking_reviews_status_check
    CHECK (status IN ('draft','finalized'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS essay_marking_reviews_attempt_id_idx
  ON public.essay_marking_reviews(paper_attempt_id);

CREATE INDEX IF NOT EXISTS essay_marking_reviews_answer_id_idx
  ON public.essay_marking_reviews(attempt_answer_id);

ALTER TABLE public.essay_marking_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "users read own essay_marking_reviews"
    ON public.essay_marking_reviews
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.paper_attempts
        WHERE public.paper_attempts.id = paper_attempt_id
          AND public.paper_attempts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
