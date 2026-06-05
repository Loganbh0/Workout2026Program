-- Multi-program support: programs table, link days/sessions to programs.

create table if not exists public.programs (
  id                bigint generated always as identity primary key,
  display_name      text     not null,
  slug              text     not null unique,
  duration_weeks    smallint not null default 8,
  sessions_per_week smallint not null default 5,
  total_workouts    smallint not null default 40,
  start_date        date,
  is_active         boolean  not null default false,
  created_at        timestamptz not null default now()
);

alter table public.programs enable row level security;

-- Link program template days and logged sessions to a program.
alter table public.program_days
  add column if not exists program_id bigint references public.programs(id) on delete cascade;

alter table public.workout_sessions
  add column if not exists program_id bigint references public.programs(id) on delete set null;

-- Seed the default program from existing app_settings metadata.
insert into public.programs (
  display_name, slug, duration_weeks, sessions_per_week, total_workouts, start_date, is_active
)
select
  coalesce(program_name, '8 Week Athletic Strength Program'),
  'pullups-2026',
  duration_weeks,
  sessions_per_week,
  total_workouts,
  start_date,
  true
from public.app_settings
where id = 1
on conflict (slug) do nothing;

-- Attach existing template days and sessions to the default program.
update public.program_days
   set program_id = (select id from public.programs where slug = 'pullups-2026' limit 1)
 where program_id is null;

update public.workout_sessions
   set program_id = (select id from public.programs where slug = 'pullups-2026' limit 1)
 where program_id is null;

-- Replace global day_number uniqueness with per-program uniqueness.
alter table public.program_days drop constraint if exists program_days_day_number_key;
create unique index if not exists program_days_program_day_idx
  on public.program_days (program_id, day_number);

create index if not exists workout_sessions_program_idx
  on public.workout_sessions (program_id, workout_date desc);
