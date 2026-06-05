import { query, withTransaction } from './db.js';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_TO_DAYNUMBER = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };

const PROGRAM_EXERCISE_COLS = `id, sort_order, name, block, target_sets, target_reps,
            tracks_weight, is_priority, notes_hint, logging_mode, variant_options`;

export async function getSettings() {
  const { rows } = await query('select * from app_settings where id = 1');
  return rows[0] || null;
}

export async function updateSettings({ startDate, weightUnit }) {
  const { rows } = await query(
    `update app_settings
        set start_date = coalesce($1, start_date),
            weight_unit = coalesce($2, weight_unit),
            updated_at = now()
      where id = 1
      returning *`,
    [startDate ?? null, weightUnit ?? null]
  );
  return rows[0];
}

export async function getProgramDay(dayNumber) {
  const { rows: dayRows } = await query(
    'select * from program_days where day_number = $1',
    [dayNumber]
  );
  if (!dayRows[0]) return null;
  const day = dayRows[0];
  const { rows: exercises } = await query(
    `select ${PROGRAM_EXERCISE_COLS}
       from program_exercises
      where day_id = $1
      order by sort_order`,
    [day.id]
  );
  return { ...day, exercises };
}

// Resolve a calendar date to either a workout day (1-5) or a rest day.
export async function resolveToday(isoDate) {
  const date = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date();
  const weekday = WEEKDAYS[date.getDay()];
  const dayNumber = WEEKDAY_TO_DAYNUMBER[weekday];

  if (!dayNumber) {
    return { mode: 'rest', weekday, date: toIso(date) };
  }

  const programDay = await getProgramDay(dayNumber);
  return { mode: 'workout', weekday, dayNumber, date: toIso(date), programDay };
}

async function fetchSetsForLogIds(logIds) {
  if (!logIds.length) return new Map();
  const { rows } = await query(
    `select id, exercise_log_id, set_number, weight_lbs, reps, assisted_band
       from exercise_set_logs
      where exercise_log_id = any($1::bigint[])
      order by set_number`,
    [logIds]
  );
  const byLog = new Map();
  for (const row of rows) {
    if (!byLog.has(row.exercise_log_id)) byLog.set(row.exercise_log_id, []);
    byLog.get(row.exercise_log_id).push(row);
  }
  return byLog;
}

function mapSets(rows) {
  return (rows || []).map((s) => ({
    setNumber: s.set_number,
    weightLbs: s.weight_lbs != null ? Number(s.weight_lbs) : null,
    reps: s.reps != null ? Number(s.reps) : null,
    assistedBand: Boolean(s.assisted_band),
  }));
}

// Batch pre-fill: for each exercise on a day, return the most recent logged sets.
export async function getPrefillForDay(dayNumber) {
  const day = await getProgramDay(dayNumber);
  if (!day) return null;

  const { rows: last } = await query(
    `select distinct on (el.exercise_name)
            el.id, el.exercise_name, el.variant_key, ws.workout_date
       from exercise_logs el
       join workout_sessions ws on ws.id = el.session_id
      where ws.day_number = $1
      order by el.exercise_name, ws.workout_date desc, el.id desc`,
    [dayNumber]
  );
  const lastByName = new Map(last.map((r) => [r.exercise_name, r]));
  const setsByLog = await fetchSetsForLogIds(last.map((r) => r.id));

  const exercises = day.exercises.map((ex) => {
    const prev = lastByName.get(ex.name);
    const setRows = prev ? setsByLog.get(prev.id) : null;
    return {
      ...ex,
      prefill: prev
        ? {
            variantKey: prev.variant_key,
            sets: mapSets(setRows),
            fromDate: prev.workout_date,
            source: 'history',
          }
        : { variantKey: null, sets: [], fromDate: null, source: 'template' },
    };
  });

  return { ...day, exercises };
}

export async function listSessions({ from, to, dayNumber, limit = 100 } = {}) {
  const conditions = [];
  const params = [];
  if (from) { params.push(from); conditions.push(`ws.workout_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`ws.workout_date <= $${params.length}`); }
  if (dayNumber) { params.push(dayNumber); conditions.push(`ws.day_number = $${params.length}`); }
  params.push(limit);

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await query(
    `select ws.id, ws.workout_date, ws.day_number, ws.exertion, ws.session_notes,
            ws.completed_at, pd.title, pd.type,
            count(el.id)::int as exercise_count
       from workout_sessions ws
       left join program_days pd on pd.day_number = ws.day_number
       left join exercise_logs el on el.session_id = ws.id
       ${where}
      group by ws.id, pd.title, pd.type
      order by ws.workout_date desc, ws.id desc
      limit $${params.length}`,
    params
  );
  return rows;
}

export async function getSession(id) {
  const { rows: sessionRows } = await query(
    `select ws.*, pd.title, pd.subtitle, pd.type
       from workout_sessions ws
       left join program_days pd on pd.day_number = ws.day_number
      where ws.id = $1`,
    [id]
  );
  if (!sessionRows[0]) return null;
  const { rows: logs } = await query(
    `select id, exercise_name, sort_order, weight_lbs, reps, completed, variant_key
       from exercise_logs
      where session_id = $1
      order by sort_order, id`,
    [id]
  );
  const setsByLog = await fetchSetsForLogIds(logs.map((l) => l.id));
  const logsWithSets = logs.map((log) => ({
    ...log,
    sets: mapSets(setsByLog.get(log.id)),
  }));
  return { ...sessionRows[0], logs: logsWithSets };
}

export async function createSession({ workoutDate, dayNumber, exertion, sessionNotes, logs }) {
  const sessionId = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `insert into workout_sessions (workout_date, day_number, exertion, session_notes)
       values ($1, $2, $3, $4)
       returning id`,
      [workoutDate, dayNumber, exertion ?? null, sessionNotes ?? null]
    );
    const id = rows[0].id;

    for (const log of logs || []) {
      const { rows: logRows } = await client.query(
        `insert into exercise_logs (session_id, exercise_name, sort_order, completed, variant_key)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [
          id,
          log.exerciseName,
          log.sortOrder ?? 0,
          log.completed ?? false,
          log.variantKey ?? null,
        ]
      );
      const logId = logRows[0].id;

      for (const set of log.sets || []) {
        await client.query(
          `insert into exercise_set_logs (exercise_log_id, set_number, weight_lbs, reps, assisted_band)
           values ($1, $2, $3, $4, $5)`,
          [
            logId,
            set.setNumber,
            set.weightLbs ?? null,
            set.reps ?? null,
            set.assistedBand ?? false,
          ]
        );
      }
    }

    return id;
  });

  return getSession(sessionId);
}

const TRACKABLE_MODES = ['weighted_sets', 'bodyweight_sets', 'variant'];

async function getExerciseLoggingMode(name) {
  const { rows } = await query(
    `select logging_mode from program_exercises where name = $1 limit 1`,
    [name]
  );
  return rows[0]?.logging_mode ?? null;
}

// Time series for one exercise (for progress charts) — best set per session date.
export async function getExerciseProgress(name) {
  const loggingMode = await getExerciseLoggingMode(name);
  if (!loggingMode || !TRACKABLE_MODES.includes(loggingMode)) return [];

  const { rows } = await query(
    `select ws.workout_date,
            max(esl.weight_lbs) as weight_lbs,
            max(esl.reps) as reps,
            ws.exertion,
            bool_or(esl.assisted_band) as assisted_band
       from exercise_logs el
       join workout_sessions ws on ws.id = el.session_id
       left join exercise_set_logs esl on esl.exercise_log_id = el.id
      where el.exercise_name = $1
      group by ws.id, ws.workout_date, ws.exertion
      order by ws.workout_date asc`,
    [name]
  );
  return rows;
}

// Logged exercises with set-level data (excludes completion-only movement items).
export async function listLoggedExercises() {
  const { rows } = await query(
    `select distinct el.exercise_name, pe.logging_mode
       from exercise_logs el
       join program_exercises pe on pe.name = el.exercise_name
      where pe.logging_mode = any($1::text[])
      order by el.exercise_name`,
    [TRACKABLE_MODES]
  );
  return rows.map((r) => ({
    name: r.exercise_name,
    loggingMode: r.logging_mode,
  }));
}

export async function getStats() {
  const settings = await getSettings();
  const startDate = settings?.start_date ? toIso(settings.start_date) : null;
  const now = new Date();
  const start = startDate ? new Date(`${startDate}T12:00:00`) : null;
  const beforeStart = start && now < start;

  let total = 0;
  if (startDate && !beforeStart) {
    const { rows: countRows } = await query(
      'select count(*)::int as total from workout_sessions where workout_date >= $1',
      [startDate]
    );
    total = countRows[0].total;
  }

  const { rows: dateRows } = await query(
    'select distinct workout_date from workout_sessions order by workout_date desc'
  );
  const streak = computeStreak(dateRows.map((r) => r.workout_date));

  const totalWorkouts = settings?.total_workouts || 40;
  const completion = totalWorkouts ? Math.min(100, Math.round((total / totalWorkouts) * 100)) : 0;

  let currentWeek = null;
  let programStatus = 'active';
  let daysUntilStart = null;

  if (startDate) {
    if (beforeStart) {
      programStatus = 'pending';
      daysUntilStart = Math.ceil((start - now) / 86400000);
    } else {
      const diffDays = Math.floor((now - start) / 86400000);
      currentWeek = Math.min(
        settings.duration_weeks,
        Math.floor(diffDays / 7) + 1
      );
    }
  }

  return {
    checkIns: total,
    streak,
    completion,
    totalWorkouts,
    currentWeek,
    durationWeeks: settings?.duration_weeks || 8,
    startDate,
    programStatus,
    daysUntilStart,
  };
}

// Consecutive distinct workout dates, allowing weekend gaps (<= 3 days apart).
function computeStreak(dates) {
  if (!dates.length) return 0;
  const asDates = dates.map((d) => new Date(`${toIso(d)}T12:00:00`));
  let streak = 1;
  for (let i = 1; i < asDates.length; i++) {
    const gap = Math.round((asDates[i - 1] - asDates[i]) / 86400000);
    if (gap >= 1 && gap <= 3) streak++;
    else break;
  }
  return streak;
}

function toIso(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
