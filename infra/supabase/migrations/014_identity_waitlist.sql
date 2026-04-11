-- ============================================================
-- Migration 014 — identity normalization + public waitlist
-- ============================================================

update public.users
set role = lower(trim(role))
where role is not null;

update public.users
set role = case
  when role = 'admin' then 'platform_admin'
  when role = 'family_admin' then 'reviewer'
  else role
end
where role in ('admin', 'family_admin');

update public.users
set role = 'student'
where role is null or trim(role) = '';

alter table public.users
  alter column role set default 'student';

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (
    role in (
      'student',
      'content_author',
      'reviewer',
      'platform_admin',
      'super_admin',
      'school_admin',
      'teacher',
      'parent'
    )
  );

update public.users as u
set subscription_status = coalesce(
  (
    select case
      when s.status = 'active' and s.plan = 'school' then 'school'
      when s.status = 'active' and s.plan in ('premium', 'family') then 'premium'
      when s.status in ('expired', 'cancelled') then 'expired'
      else null
    end
    from public.subscriptions as s
    where s.user_id = u.id
    order by
      case when s.status = 'active' then 0 else 1 end,
      s.started_at desc
    limit 1
  ),
  subscription_status,
  'free'
);

update public.users
set subscription_status = 'voucher'
where subscription_status = 'free'
  and exists (
    select 1
    from public.vouchers
    where vouchers.used_by = public.users.id
  );

update public.users
set subscription_status = 'free'
where subscription_status is null or trim(subscription_status) = '';

alter table public.users
  alter column subscription_status set default 'free';

alter table public.users
  drop constraint if exists users_subscription_status_check;

alter table public.users
  add constraint users_subscription_status_check
  check (subscription_status in ('free', 'premium', 'school', 'voucher', 'expired'));

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  exam_path exam_path_enum not null,
  name text,
  email text,
  phone text,
  notes text,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create unique index if not exists waitlist_signups_exam_path_phone_idx
  on public.waitlist_signups (exam_path, phone)
  where phone is not null;

create unique index if not exists waitlist_signups_exam_path_email_idx
  on public.waitlist_signups (exam_path, lower(email))
  where email is not null;

alter table public.waitlist_signups enable row level security;

notify pgrst, 'reload schema';
