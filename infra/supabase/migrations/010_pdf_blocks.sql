-- ============================================================
-- Migration 010 - PDF block support + Storage bucket
-- Run manually in Supabase SQL Editor (AFTER migration 009)
-- ============================================================

-- 1. Add file columns for PDF blocks
alter table public.lesson_blocks
  add column if not exists file_path  text,
  add column if not exists file_name  text,
  add column if not exists file_size  integer;

-- 2. Drop old constraints so we can widen them
alter table public.lesson_blocks
  drop constraint if exists lesson_blocks_block_type_check;

alter table public.lesson_blocks
  drop constraint if exists lesson_blocks_content_check;

-- 3. Re-create with pdf support
alter table public.lesson_blocks
  add constraint lesson_blocks_block_type_check
    check (block_type in ('text', 'video', 'pdf'));

alter table public.lesson_blocks
  add constraint lesson_blocks_content_check
    check (
      (block_type = 'text'  and text_content is not null and video_url is null and video_provider is null and file_path is null)
      or
      (block_type = 'video' and video_url is not null and text_content is null and file_path is null)
      or
      (block_type = 'pdf'   and file_path is not null and file_name is not null and text_content is null and video_url is null and video_provider is null)
    );

-- 4. Create private Storage bucket for lesson files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-files',
  'lesson-files',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
