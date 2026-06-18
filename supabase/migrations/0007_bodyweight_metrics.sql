-- Bodyweight time/distance per-set logging + extended program logging modes.

alter table public.exercise_set_logs
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0);

alter table public.exercise_set_logs
  add column if not exists distance_yd numeric(8, 2) check (distance_yd is null or distance_yd >= 0);

alter table public.program_exercises
  drop constraint if exists program_exercises_logging_mode_check;

alter table public.program_exercises
  add constraint program_exercises_logging_mode_check
  check (
    logging_mode in (
      'weighted_sets',
      'bodyweight_sets',
      'bodyweight_time_sets',
      'bodyweight_distance_sets',
      'completion_only',
      'variant'
    )
  );
