-- Patch: add section column to pre-existing paper_questions table
alter table public.paper_questions add column if not exists section text;
notify pgrst, 'reload schema';
