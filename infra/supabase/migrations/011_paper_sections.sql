-- ============================================================
-- Migration 011: Structured paper support
-- Adds: paper_sections, question_parts
-- Extends: exam_papers (new metadata), questions (new types)
-- Safe to run on existing data — all changes are additive.
-- ============================================================

-- ── Extend exam_papers ──────────────────────────────────────────
ALTER TABLE public.exam_papers
  ADD COLUMN IF NOT EXISTS paper_code           TEXT,
  ADD COLUMN IF NOT EXISTS session              TEXT,
  ADD COLUMN IF NOT EXISTS instructions         TEXT,
  ADD COLUMN IF NOT EXISTS has_sections         BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS total_marks          INTEGER,
  ADD COLUMN IF NOT EXISTS marking_mode         TEXT        NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS solution_unlock_mode TEXT        NOT NULL DEFAULT 'after_submit',
  ADD COLUMN IF NOT EXISTS status               TEXT        NOT NULL DEFAULT 'published';

-- Named check constraints (idempotent via EXCEPTION block)
DO $$ BEGIN
  ALTER TABLE public.exam_papers ADD CONSTRAINT exam_papers_marking_mode_check
    CHECK (marking_mode IN ('auto','manual','hybrid'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.exam_papers ADD CONSTRAINT exam_papers_solution_unlock_mode_check
    CHECK (solution_unlock_mode IN ('never','after_submit','after_marked','always'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.exam_papers ADD CONSTRAINT exam_papers_status_check
    CHECK (status IN ('draft','published','archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique partial index for paper_code (NULL values excluded so uniqueness only applies to non-NULL)
CREATE UNIQUE INDEX IF NOT EXISTS exam_papers_paper_code_idx
  ON public.exam_papers(paper_code)
  WHERE paper_code IS NOT NULL;

-- Back-fill: treat all existing rows as published (they were already live)
UPDATE public.exam_papers
  SET status = 'published'
  WHERE status IS NULL OR status = '';

-- ── New: paper_sections ─────────────────────────────────────────
-- A relational section table. paper_questions.section TEXT is preserved
-- for backward compatibility; new paper_questions optionally link via section_id.
CREATE TABLE IF NOT EXISTS public.paper_sections (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id             UUID        NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  section_code              TEXT        NOT NULL,   -- e.g. 'A', 'B', 'C'
  title                     TEXT,                   -- e.g. 'Section A — Compulsory'
  instructions              TEXT,
  order_index               INTEGER     NOT NULL DEFAULT 0,
  question_selection_mode   TEXT        NOT NULL DEFAULT 'answer_all'
    CHECK (question_selection_mode IN ('answer_all','answer_any_n')),
  required_count            INTEGER,                -- only used when question_selection_mode = 'answer_any_n'
  max_marks                 INTEGER,
  starts_at_question_number INTEGER,
  ends_at_question_number   INTEGER,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_paper_id, section_code)
);

ALTER TABLE public.paper_sections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "public read paper_sections" ON public.paper_sections FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS paper_sections_paper_id_idx ON public.paper_sections(exam_paper_id);

-- Optional FK from paper_questions to paper_sections (nullable, backward compatible)
ALTER TABLE public.paper_questions
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.paper_sections(id) ON DELETE SET NULL;

-- ── Extend questions: type constraint ──────────────────────────
-- Safely replace the type CHECK to allow new question types.
-- Find the existing unnamed/auto-named check constraint on questions.type and drop it.
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%''mcq''%';
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.questions DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.questions ADD CONSTRAINT questions_type_check
    CHECK (type IN ('mcq','true_false','short_answer','essay','structured','numeric','matching','fill_blank'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add expected_answer to questions (for short_answer/essay/structured)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS expected_answer TEXT,
  ADD COLUMN IF NOT EXISTS rubric_id       UUID;  -- FK wired in migration 012 after essay_rubrics exists

-- ── New: question_parts ─────────────────────────────────────────
-- Supports structured/essay questions with multiple labelled sub-parts (a, b, i, ii …).
-- For simple questions this table is empty; parts are optional.
CREATE TABLE IF NOT EXISTS public.question_parts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id       UUID        NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  part_label        TEXT        NOT NULL,   -- 'a', 'b', 'i', 'ii', '(a)', etc.
  body              TEXT        NOT NULL,
  marks             INTEGER     NOT NULL DEFAULT 1,
  expected_answer   TEXT,
  order_index       INTEGER     NOT NULL DEFAULT 0,
  rubric_id         UUID,                   -- FK wired in migration 012
  auto_marking_mode TEXT        NOT NULL DEFAULT 'manual'
    CHECK (auto_marking_mode IN ('exact','keyword','manual','hybrid')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_parts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "public read question_parts" ON public.question_parts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS question_parts_question_id_idx ON public.question_parts(question_id);

NOTIFY pgrst, 'reload schema';
