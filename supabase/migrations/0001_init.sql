-- Workout 2026 Tracker — initial schema
-- Single-user personal app. The API (Render) connects with the Supabase
-- service role / direct connection string. RLS is enabled and locked down so
-- the public Data API (anon / authenticated) cannot read or write anything.

-- ---------------------------------------------------------------------------
-- Static program (seeded from the 8-week athletic strength program PDF)
-- ---------------------------------------------------------------------------

create table if not exists public.program_days (
  id          bigint generated always as identity primary key,
  day_number  smallint not null unique check (day_number between 1 and 5),
  weekday     text     not null check (weekday in ('monday','tuesday','wednesday','thursday','friday')),
  code        text     not null,
  type        text     not null check (type in ('lift','movement')),
  title       text     not null,
  subtitle    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.program_exercises (
  id            bigint generated always as identity primary key,
  day_id        bigint not null references public.program_days(id) on delete cascade,
  sort_order    smallint not null,
  name          text     not null,
  block         text,
  target_sets   text,
  target_reps   text,
  tracks_weight boolean  not null default true,
  is_priority   boolean  not null default false,
  notes_hint    text,
  unique (day_id, sort_order)
);

create index if not exists program_exercises_day_idx
  on public.program_exercises (day_id, sort_order);

-- Single-row app settings (program metadata + personal preferences).
create table if not exists public.app_settings (
  id              smallint primary key default 1 check (id = 1),
  program_name    text    not null default '8 Week Athletic Strength Program',
  duration_weeks  smallint not null default 8,
  sessions_per_week smallint not null default 5,
  total_workouts  smallint not null default 40,
  weight_unit     text    not null default 'lbs',
  start_date      date,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Logged workouts
-- ---------------------------------------------------------------------------

create table if not exists public.workout_sessions (
  id            bigint generated always as identity primary key,
  workout_date  date     not null,
  day_number    smallint not null check (day_number between 1 and 5),
  exertion      smallint check (exertion between 1 and 5),
  session_notes text,
  completed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists workout_sessions_date_idx
  on public.workout_sessions (workout_date desc);

create index if not exists workout_sessions_day_idx
  on public.workout_sessions (day_number, workout_date desc);

create table if not exists public.exercise_logs (
  id            bigint generated always as identity primary key,
  session_id    bigint not null references public.workout_sessions(id) on delete cascade,
  exercise_name text   not null,
  sort_order    smallint not null default 0,
  weight_lbs    numeric(6,2),
  reps          integer,
  completed     boolean not null default false
);

create index if not exists exercise_logs_session_idx
  on public.exercise_logs (session_id);

create index if not exists exercise_logs_progress_idx
  on public.exercise_logs (exercise_name);

-- ---------------------------------------------------------------------------
-- Row Level Security: deny the public Data API entirely.
-- The Render API uses the service_role key which bypasses RLS, so no policies
-- are needed for the app to function. Enabling RLS with zero policies means
-- anon / authenticated roles get no access.
-- ---------------------------------------------------------------------------

alter table public.program_days      enable row level security;
alter table public.program_exercises enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.exercise_logs     enable row level security;
alter table public.app_settings      enable row level security;

-- Ensure the single settings row exists. start_date stays null until the user
-- sets it (the app will default to "today" the first time it is needed).
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;
