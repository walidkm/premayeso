-- ============================================================
-- Topic codes for deterministic admin uploads
-- ============================================================

alter table public.topics
  add column if not exists code text;

with base_codes as (
  select
    t.id,
    s.code
      || '-'
      || upper(
        trim(
          both '-'
          from regexp_replace(
            regexp_replace(lower(t.name), '&', ' and ', 'g'),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        )
      ) as base_code,
    upper(coalesce(t.form_level, '')) as form_level_code,
    t.order_index
  from public.topics t
  join public.subjects s on s.id = t.subject_id
),
resolved_codes as (
  select
    id,
    case
      when count(*) over (partition by base_code) = 1 then base_code
      when form_level_code <> ''
        and count(*) over (partition by base_code || '-' || form_level_code) = 1
        then base_code || '-' || form_level_code
      else base_code || '-' || order_index::text
    end as resolved_code
  from base_codes
)
update public.topics t
set code = resolved_codes.resolved_code
from resolved_codes
where t.id = resolved_codes.id
  and (t.code is null or t.code = '');

create unique index if not exists topics_code_key on public.topics(code);

alter table public.topics
  alter column code set not null;
