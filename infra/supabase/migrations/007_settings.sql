-- ============================================================
-- Settings table — key/value store for integration config
-- Admin-only; read via service role key from API.
-- ============================================================

create table if not exists public.settings (
  key         text primary key,
  value       text not null default '',
  description text,
  is_secret   boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- Only admins (via service role) should access this table
alter table public.settings enable row level security;

create policy "Service role full access"
  on public.settings
  using (true)
  with check (true);

-- ── Seed default rows ─────────────────────────────────────────

insert into public.settings (key, value, description, is_secret) values
  ('at_api_key',    '',         'Africa''s Talking API key',                              true),
  ('at_username',   'sandbox',  'Africa''s Talking username (sandbox or your shortcode)', false),
  ('at_enabled',    'false',    'Set to "true" to send real SMS via Africa''s Talking',  false),
  ('otp_ttl_mins',  '5',        'OTP expiry in minutes',                                  false),
  ('otp_dev_log',   'true',     'Log OTPs to server console (disable in production)',     false),
  ('fl_public_key', '',         'Flutterwave public key (Sprint 5)',                       false),
  ('fl_secret_key', '',         'Flutterwave secret key (Sprint 5)',                       true),
  ('fl_enabled',    'false',    'Enable Flutterwave payments (Sprint 5)',                  false)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
