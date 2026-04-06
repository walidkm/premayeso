-- ============================================================
-- Patch: add missing columns to pre-existing exam_papers table
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

alter table public.exam_papers
  add column if not exists exam_path   exam_path_enum,
  add column if not exists paper_type  text not null default 'maneb_past_paper'
    check (paper_type in ('maneb_past_paper','school_exam','question_pool')),
  add column if not exists exam_mode   text not null default 'paper_layout'
    check (exam_mode in ('paper_layout','randomized','both'));

-- Back-fill existing rows: old source_type 'maneb' → paper_type 'maneb_past_paper'
update public.exam_papers
  set paper_type = 'maneb_past_paper'
  where source_type = 'maneb'
    and paper_type = 'maneb_past_paper'; -- no-op if already set

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
