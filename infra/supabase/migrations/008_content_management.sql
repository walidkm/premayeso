-- ============================================================
-- Migration 008 — Content management + video lessons
-- Run manually in Supabase SQL Editor
-- ============================================================

-- Add video support to lessons
alter table public.lessons
  add column if not exists video_url    text,
  add column if not exists content_type text not null default 'text'
    check (content_type in ('text', 'video', 'mixed'));

-- Add school scoping for school_admin users
alter table public.users
  add column if not exists school_id uuid references public.schools(id);

notify pgrst, 'reload schema';
