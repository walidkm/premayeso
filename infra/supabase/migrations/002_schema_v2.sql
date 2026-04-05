-- ============================================================
-- PreMayeso schema v2
-- Adds: exam_path routing, subject codes, subtopics,
--       enhanced questions, auth stubs (otp_logs,
--       subscriptions, vouchers), schools/exam_papers/paper_questions
-- ============================================================

-- ── exam_path enum ──────────────────────────────────────────
do $$ begin
  create type exam_path_enum as enum ('JCE', 'MSCE', 'PSLCE');
exception when duplicate_object then null;
end $$;

-- ── Extend: users ───────────────────────────────────────────
-- Drop email unique constraint (phone-first product; email optional)
alter table public.users
  add column if not exists phone        text unique,
  add column if not exists exam_path    exam_path_enum,
  add column if not exists subscription_status text not null default 'free'
    check (subscription_status in ('free', 'premium'));

-- email is now optional (phone is the primary identifier)
alter table public.users
  alter column email drop not null;

-- ── Extend: subjects ────────────────────────────────────────
alter table public.subjects
  add column if not exists code         text unique,     -- e.g. MATH-JCE
  add column if not exists exam_path    exam_path_enum,
  add column if not exists order_index  integer not null default 0;

-- ── Extend: topics ──────────────────────────────────────────
alter table public.topics
  add column if not exists form_level   text check (form_level in ('F1','F2','F3','F4')),
  add column if not exists exam_path    exam_path_enum;

-- ── New: subtopics ──────────────────────────────────────────
create table if not exists public.subtopics (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics(id) on delete cascade,
  name        text not null,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Extend: lessons ─────────────────────────────────────────
alter table public.lessons
  add column if not exists exam_path      exam_path_enum,
  add column if not exists is_free_preview boolean not null default false,
  add column if not exists tier_gate      text not null default 'free'
    check (tier_gate in ('free', 'premium'));

-- ── Extend: questions ───────────────────────────────────────
-- Rename stem → body for alignment with docs; keep stem as alias view
alter table public.questions
  add column if not exists subtopic_id    uuid references public.subtopics(id) on delete set null,
  add column if not exists exam_path      exam_path_enum,
  add column if not exists type           text not null default 'mcq'
    check (type in ('mcq','true_false','short_answer','essay')),
  add column if not exists difficulty     text not null default 'medium'
    check (difficulty in ('easy','medium','hard')),
  add column if not exists marks          integer not null default 1,
  add column if not exists allow_shuffle  boolean not null default true,
  add column if not exists hints          jsonb,           -- [{level:1,text:"..."}, ...]
  add column if not exists worked_solution jsonb,          -- {steps:[...]}
  add column if not exists tier_gate      text not null default 'free'
    check (tier_gate in ('free', 'premium')),
  add column if not exists is_approved    boolean not null default false,
  add column if not exists language       text not null default 'English',
  add column if not exists pool_tag       text,
  add column if not exists question_no    text;            -- e.g. 2022-P1-Q04

-- ── New: schools ────────────────────────────────────────────
create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ── New: exam_papers ────────────────────────────────────────
create table if not exists public.exam_papers (
  id              uuid primary key default gen_random_uuid(),
  exam_path       exam_path_enum,
  subject_id      uuid references public.subjects(id) on delete set null,
  school_id       uuid references public.schools(id) on delete set null,
  source_type     text not null default 'maneb'
    check (source_type in ('maneb','school','teacher')),
  paper_type      text not null default 'paper_layout'
    check (paper_type in ('maneb_past_paper','school_exam','question_pool')),
  exam_mode       text not null default 'paper_layout'
    check (exam_mode in ('paper_layout','randomized','both')),
  title           text,
  year            integer,
  paper_number    integer,
  term            text,
  duration_min    integer,
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ── New: paper_questions ────────────────────────────────────
create table if not exists public.paper_questions (
  id              uuid primary key default gen_random_uuid(),
  exam_paper_id   uuid not null references public.exam_papers(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete cascade,
  order_index     integer not null default 0,
  section         text,
  created_at      timestamptz not null default now(),
  unique (exam_paper_id, question_id)
);

-- ── New: otp_logs ────────────────────────────────────────────
create table if not exists public.otp_logs (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  otp_hash    text not null,
  expires_at  timestamptz not null,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists otp_logs_phone_idx on public.otp_logs(phone);

-- ── New: subscriptions ───────────────────────────────────────
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  exam_path       exam_path_enum,
  plan            text not null default 'premium'
    check (plan in ('premium', 'family', 'school')),
  status          text not null default 'active'
    check (status in ('active', 'expired', 'cancelled')),
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

-- ── New: vouchers ────────────────────────────────────────────
create table if not exists public.vouchers (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  plan        text not null default 'premium',
  exam_path   exam_path_enum,    -- null = all paths
  used_by     uuid references public.users(id),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ── Extend: quiz_attempts ────────────────────────────────────
-- Make user_id nullable (anonymous attempts until auth is wired)
alter table public.quiz_attempts
  alter column user_id drop not null;

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists subtopics_topic_id_idx       on public.subtopics(topic_id);
create index if not exists questions_subtopic_id_idx    on public.questions(subtopic_id);
create index if not exists questions_exam_path_idx      on public.questions(exam_path);
create index if not exists subjects_exam_path_idx       on public.subjects(exam_path);
create index if not exists topics_exam_path_idx         on public.topics(exam_path);
create index if not exists exam_papers_subject_id_idx   on public.exam_papers(subject_id);
create index if not exists paper_questions_paper_id_idx on public.paper_questions(exam_paper_id);
create index if not exists paper_questions_q_id_idx     on public.paper_questions(question_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.subtopics      enable row level security;
alter table public.schools        enable row level security;
alter table public.exam_papers    enable row level security;
alter table public.paper_questions enable row level security;
alter table public.otp_logs       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.vouchers       enable row level security;

create policy "public read subtopics"       on public.subtopics       for select using (true);
create policy "public read schools"         on public.schools         for select using (true);
create policy "public read exam_papers"     on public.exam_papers     for select using (true);
create policy "public read paper_questions" on public.paper_questions for select using (true);

-- otp_logs: service role only (no client-side access)
-- subscriptions: users read own
create policy "users read own subscriptions"
  on public.subscriptions for select using (auth.uid() = user_id);
