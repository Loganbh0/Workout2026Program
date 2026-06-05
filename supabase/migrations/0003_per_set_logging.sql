-- Per-set exercise logging: child set rows, program logging modes, variant support.
-- ---------------------------------------------------------------------------
-- Program exercise metadata
-- ---------------------------------------------------------------------------
alter table public.program_exercises
add column if not exists logging_mode text not null default 'weighted_sets' check (
    logging_mode in (
      'weighted_sets',
      'bodyweight_sets',
      'completion_only',
      'variant'
    )
  );
alter table public.program_exercises
add column if not exists variant_options jsonb;
-- ---------------------------------------------------------------------------
-- Exercise-level log: variant selection
-- ---------------------------------------------------------------------------
alter table public.exercise_logs
add column if not exists variant_key text;
-- ---------------------------------------------------------------------------
-- Per-set log rows
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_set_logs (
  id bigint generated always as identity primary key,
  exercise_log_id bigint not null references public.exercise_logs(id) on delete cascade,
  set_number smallint not null check (set_number >= 1),
  weight_lbs numeric(6, 2),
  reps integer,
  assisted_band boolean not null default false,
  unique (exercise_log_id, set_number)
);
create index if not exists exercise_set_logs_log_idx on public.exercise_set_logs (exercise_log_id, set_number);
alter table public.exercise_set_logs enable row level security;
-- ---------------------------------------------------------------------------
-- Migrate existing flat logs into single set rows
-- ---------------------------------------------------------------------------
insert into public.exercise_set_logs (
    exercise_log_id,
    set_number,
    weight_lbs,
    reps,
    assisted_band
  )
select el.id,
  1,
  el.weight_lbs,
  el.reps,
  false
from public.exercise_logs el
where (
    el.weight_lbs is not null
    or el.reps is not null
  )
  and not exists (
    select 1
    from public.exercise_set_logs esl
    where esl.exercise_log_id = el.id
  );