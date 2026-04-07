-- ============================================================
-- Migration 009 - Lesson blocks
-- Run manually in Supabase SQL Editor
-- ============================================================

create table if not exists public.lesson_blocks (
  id             uuid primary key default gen_random_uuid(),
  lesson_id      uuid not null references public.lessons(id) on delete cascade,
  block_type     text not null check (block_type in ('text', 'video')),
  title          text,
  text_content   text,
  video_url      text,
  video_provider text check (video_provider in ('youtube', 'vimeo', 'direct', 'other')),
  order_index    integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint lesson_blocks_content_check check (
    (block_type = 'text' and text_content is not null and video_url is null and video_provider is null)
    or
    (block_type = 'video' and video_url is not null and text_content is null)
  )
);

create index if not exists lesson_blocks_lesson_order_idx
  on public.lesson_blocks(lesson_id, order_index, created_at);

create or replace function public.set_lesson_blocks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lesson_blocks_updated_at on public.lesson_blocks;
create trigger set_lesson_blocks_updated_at
before update on public.lesson_blocks
for each row
execute function public.set_lesson_blocks_updated_at();

alter table public.lesson_blocks enable row level security;

do $$
begin
  create policy "public read lesson_blocks" on public.lesson_blocks for select using (true);
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
