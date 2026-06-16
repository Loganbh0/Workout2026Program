-- Ad-hoc one-off sessions + nullable day_number for non-program workouts.

alter table public.workout_sessions
  add column if not exists session_type text not null default 'program';

alter table public.workout_sessions
  add column if not exists title text;

alter table public.workout_sessions
  drop constraint if exists workout_sessions_session_type_check;

alter table public.workout_sessions
  add constraint workout_sessions_session_type_check
  check (session_type in ('program', 'adhoc'));

alter table public.workout_sessions
  alter column day_number drop not null;

alter table public.workout_sessions
  drop constraint if exists workout_sessions_day_number_check;

alter table public.workout_sessions
  add constraint workout_sessions_day_number_check
  check (day_number is null or day_number between 1 and 7);

alter table public.workout_sessions
  drop constraint if exists workout_sessions_program_day_check;

alter table public.workout_sessions
  add constraint workout_sessions_program_day_check
  check (
    (session_type = 'program' and day_number is not null)
    or (session_type = 'adhoc' and day_number is null)
  );

create index if not exists workout_sessions_type_date_idx
  on public.workout_sessions (program_id, workout_date desc, session_type);
