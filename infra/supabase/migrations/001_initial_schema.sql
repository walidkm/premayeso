-- ============================================================
-- PreMayeso initial schema
-- ============================================================

-- Users (mirrors Supabase Auth, stores app-specific profile)
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  created_at  timestamptz not null default now()
);

-- Subjects (e.g. Biology, Chemistry)
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  created_at  timestamptz not null default now()
);

-- Topics (e.g. Cell Biology under Biology)
create table if not exists public.topics (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  name        text not null,
  description text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Lessons (content unit inside a topic)
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics(id) on delete cascade,
  title       text not null,
  content     text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Questions (multiple choice)
create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  topic_id       uuid not null references public.topics(id) on delete cascade,
  lesson_id      uuid references public.lessons(id) on delete set null,
  stem           text not null,
  options        jsonb not null,  -- [{ "key": "A", "text": "..." }, ...]
  correct_option text not null,
  explanation    text,
  created_at     timestamptz not null default now()
);

-- Quiz attempts (one row per student quiz session)
create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  topic_id     uuid not null references public.topics(id) on delete cascade,
  score        integer not null default 0,
  total        integer not null default 0,
  answers      jsonb not null default '[]',  -- [{ "question_id": "...", "chosen": "A", "correct": true }]
  completed_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists topics_subject_id_idx       on public.topics(subject_id);
create index if not exists lessons_topic_id_idx        on public.lessons(topic_id);
create index if not exists questions_topic_id_idx      on public.questions(topic_id);
create index if not exists quiz_attempts_user_id_idx   on public.quiz_attempts(user_id);
create index if not exists quiz_attempts_topic_id_idx  on public.quiz_attempts(topic_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users         enable row level security;
alter table public.subjects       enable row level security;
alter table public.topics         enable row level security;
alter table public.lessons        enable row level security;
alter table public.questions      enable row level security;
alter table public.quiz_attempts  enable row level security;

-- Public read on content tables
create policy "public read subjects"  on public.subjects  for select using (true);
create policy "public read topics"    on public.topics    for select using (true);
create policy "public read lessons"   on public.lessons   for select using (true);
create policy "public read questions" on public.questions for select using (true);

-- Users can only read/update their own profile
create policy "users read own profile"   on public.users for select using (auth.uid() = id);
create policy "users update own profile" on public.users for update using (auth.uid() = id);

-- Users can only read/insert their own quiz attempts
create policy "users read own attempts"   on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "users insert own attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);
