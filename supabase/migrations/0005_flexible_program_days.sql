-- Flexible training splits: variable days per program (e.g. Mon/Wed/Fri).

alter table public.program_days
  drop constraint if exists program_days_day_number_check;

alter table public.program_days
  add constraint program_days_day_number_check
  check (day_number between 1 and 7);

alter table public.workout_sessions
  drop constraint if exists workout_sessions_day_number_check;

alter table public.workout_sessions
  add constraint workout_sessions_day_number_check
  check (day_number between 1 and 7);

create unique index if not exists program_days_program_weekday_idx
  on public.program_days (program_id, weekday);
