import { query, withTransaction } from './db.js';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_ORDER = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
const VALID_WEEKDAYS = Object.keys(WEEKDAY_ORDER);
const VALID_LOGGING_MODES = ['weighted_sets', 'bodyweight_sets', 'completion_only'];
const TRACKABLE_MODES = ['weighted_sets', 'bodyweight_sets', 'variant'];

const PROGRAM_EXERCISE_COLS = `id, sort_order, name, block, target_sets, target_reps,
            tracks_weight, is_priority, notes_hint, logging_mode, variant_options`;

function mapExercise(row) {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    name: row.name,
    block: row.block,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    tracksWeight: row.tracks_weight,
    isPriority: row.is_priority,
    notesHint: row.notes_hint,
    loggingMode: row.logging_mode,
    variantOptions: row.variant_options,
  };
}

function mapProgram(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    slug: row.slug,
    durationWeeks: row.duration_weeks,
    sessionsPerWeek: row.sessions_per_week,
    totalWorkouts: row.total_workouts,
    startDate: row.start_date ? toIso(row.start_date) : null,
    isActive: row.is_active,
    dayCount: row.day_count != null ? Number(row.day_count) : undefined,
    createdAt: row.created_at,
  };
}

export async function getActiveProgram() {
  const { rows } = await query(
    `select p.*, count(pd.id)::int as day_count
       from programs p
       left join program_days pd on pd.program_id = p.id
      where p.is_active = true
      group by p.id
      limit 1`
  );
  return rows[0] || null;
}

async function requireActiveProgram() {
  const program = await getActiveProgram();
  if (!program) {
    const err = new Error('No active program');
    err.status = 404;
    throw err;
  }
  return program;
}

function resolveScope(scope) {
  return scope === 'all' ? 'all' : 'active';
}

export async function listPrograms() {
  const { rows } = await query(
    `select p.*, count(pd.id)::int as day_count
       from programs p
       left join program_days pd on pd.program_id = p.id
      group by p.id
      order by p.is_active desc, p.created_at asc`
  );
  return rows.map(mapProgram);
}

export async function getProgram(id) {
  const { rows: programRows } = await query(
    `select p.*, count(pd.id)::int as day_count
       from programs p
       left join program_days pd on pd.program_id = p.id
      where p.id = $1
      group by p.id`,
    [id]
  );
  if (!programRows[0]) return null;

  const { rows: days } = await query(
    `select pd.*, count(pe.id)::int as exercise_count
       from program_days pd
       left join program_exercises pe on pe.day_id = pd.id
      where pd.program_id = $1
      group by pd.id
      order by pd.day_number`,
    [id]
  );

  const dayIds = days.map((d) => d.id);
  let exercisesByDay = new Map();
  if (dayIds.length) {
    const { rows: exercises } = await query(
      `select ${PROGRAM_EXERCISE_COLS}, day_id
         from program_exercises
        where day_id = any($1::bigint[])
        order by sort_order`,
      [dayIds]
    );
    for (const ex of exercises) {
      if (!exercisesByDay.has(ex.day_id)) exercisesByDay.set(ex.day_id, []);
      exercisesByDay.get(ex.day_id).push(mapExercise(ex));
    }
  }

  return {
    ...mapProgram(programRows[0]),
    days: days.map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      weekday: d.weekday,
      code: d.code,
      type: d.type,
      title: d.title,
      subtitle: d.subtitle,
      exerciseCount: Number(d.exercise_count),
      exercises: exercisesByDay.get(d.id) || [],
    })),
  };
}

export async function updateProgram(id, { displayName }) {
  const { rows } = await query(
    `update programs
        set display_name = coalesce($2, display_name)
      where id = $1
      returning *`,
    [id, displayName ?? null]
  );
  if (!rows[0]) return null;
  return mapProgram(rows[0]);
}

export async function activateProgram(id, { startDate } = {}) {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    const err = new Error('startDate is required (YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }

  await withTransaction(async (client) => {
    await client.query('update programs set is_active = false where is_active = true');
    const { rows } = await client.query(
      'update programs set is_active = true, start_date = $2 where id = $1 returning id',
      [id, startDate]
    );
    if (!rows[0]) {
      const err = new Error('Program not found');
      err.status = 404;
      throw err;
    }
  });
  return getProgram(id);
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'program';
}

async function uniqueSlug(base) {
  let slug = base;
  let n = 0;
  while (true) {
    const { rows } = await query('select id from programs where slug = $1 limit 1', [slug]);
    if (!rows.length) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function sortDaysByWeekday(days) {
  return [...days].sort(
    (a, b) => (WEEKDAY_ORDER[a.weekday] || 99) - (WEEKDAY_ORDER[b.weekday] || 99)
  );
}

function validateCreateProgram(body) {
  const { displayName, durationWeeks, days } = body || {};
  if (!displayName?.trim()) {
    const err = new Error('displayName is required');
    err.status = 400;
    throw err;
  }
  const weeks = Number(durationWeeks);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
    const err = new Error('durationWeeks must be an integer between 1 and 52');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(days) || days.length < 1) {
    const err = new Error('At least one training day is required');
    err.status = 400;
    throw err;
  }

  const seenWeekdays = new Set();
  for (const day of days) {
    if (!VALID_WEEKDAYS.includes(day.weekday)) {
      const err = new Error(`Invalid weekday: ${day.weekday}`);
      err.status = 400;
      throw err;
    }
    if (seenWeekdays.has(day.weekday)) {
      const err = new Error(`Duplicate weekday: ${day.weekday}`);
      err.status = 400;
      throw err;
    }
    seenWeekdays.add(day.weekday);
    if (!day.title?.trim()) {
      const err = new Error(`Title required for ${day.weekday}`);
      err.status = 400;
      throw err;
    }
    if (!Array.isArray(day.exercises) || day.exercises.length < 1) {
      const err = new Error(`At least one exercise required for ${day.weekday}`);
      err.status = 400;
      throw err;
    }
    for (const ex of day.exercises) {
      if (!ex.name?.trim()) {
        const err = new Error('Exercise name is required');
        err.status = 400;
        throw err;
      }
      if (!ex.targetSets || !String(ex.targetSets).trim()) {
        const err = new Error(`Sets required for ${ex.name}`);
        err.status = 400;
        throw err;
      }
      if (!VALID_LOGGING_MODES.includes(ex.loggingMode)) {
        const err = new Error(`Invalid loggingMode for ${ex.name}`);
        err.status = 400;
        throw err;
      }
    }
  }

  return {
    displayName: displayName.trim(),
    durationWeeks: weeks,
    days: sortDaysByWeekday(days),
  };
}

export async function createProgram(body) {
  const { displayName, durationWeeks, days } = validateCreateProgram(body);
  const sessionsPerWeek = days.length;
  const totalWorkouts = durationWeeks * sessionsPerWeek;
  const slug = await uniqueSlug(slugify(displayName));

  const programId = await withTransaction(async (client) => {
    const { rows: programRows } = await client.query(
      `insert into programs (
         display_name, slug, duration_weeks, sessions_per_week, total_workouts, is_active
       ) values ($1, $2, $3, $4, $5, false)
       returning id`,
      [displayName, slug, durationWeeks, sessionsPerWeek, totalWorkouts]
    );
    const pid = programRows[0].id;

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const dayNumber = i + 1;
      const { rows: dayRows } = await client.query(
        `insert into program_days (
           program_id, day_number, weekday, code, type, title, subtitle
         ) values ($1, $2, $3, $4, 'lift', $5, $6)
         returning id`,
        [
          pid,
          dayNumber,
          day.weekday,
          `custom_day_${dayNumber}`,
          day.title.trim(),
          day.subtitle?.trim() || null,
        ]
      );
      const dayId = dayRows[0].id;

      for (let j = 0; j < day.exercises.length; j++) {
        const ex = day.exercises[j];
        const tracksWeight = ex.loggingMode === 'weighted_sets';
        await client.query(
          `insert into program_exercises (
             day_id, sort_order, name, target_sets, target_reps,
             tracks_weight, logging_mode, is_priority
           ) values ($1, $2, $3, $4, $5, $6, $7, false)`,
          [
            dayId,
            j + 1,
            ex.name.trim(),
            String(ex.targetSets).trim(),
            ex.targetReps?.trim() || null,
            tracksWeight,
            ex.loggingMode,
          ]
        );
      }
    }

    return pid;
  });

  return getProgram(programId);
}

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
  if (startDate) {
    await query(
      `update programs set start_date = $1 where is_active = true`,
      [startDate]
    );
  }
  return rows[0];
}

export async function getProgramDay(dayNumber, programId) {
  const { rows: dayRows } = await query(
    'select * from program_days where program_id = $1 and day_number = $2',
    [programId, dayNumber]
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

async function isAlreadyLogged(programId, workoutDate) {
  const { rows } = await query(
    `select id from workout_sessions
      where program_id = $1 and workout_date = $2
      limit 1`,
    [programId, workoutDate]
  );
  return rows.length > 0;
}

export async function resolveToday(isoDate) {
  const program = await requireActiveProgram();
  const date = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date();
  const dateIso = toIso(date);
  const weekday = WEEKDAYS[date.getDay()];
  const alreadyLogged = await isAlreadyLogged(program.id, dateIso);

  const { rows: dayRows } = await query(
    'select * from program_days where program_id = $1 and weekday = $2',
    [program.id, weekday]
  );

  if (!dayRows[0] || weekday === 'saturday' || weekday === 'sunday') {
    return {
      mode: 'rest',
      weekday,
      date: dateIso,
      alreadyLogged,
      program: mapProgram(program),
    };
  }

  const programDay = await getProgramDay(dayRows[0].day_number, program.id);
  return {
    mode: 'workout',
    weekday,
    dayNumber: dayRows[0].day_number,
    date: dateIso,
    alreadyLogged,
    program: mapProgram(program),
    programDay,
  };
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

export async function getPrefillForDay(dayNumber) {
  const program = await requireActiveProgram();
  const day = await getProgramDay(dayNumber, program.id);
  if (!day) return null;

  const { rows: last } = await query(
    `select distinct on (el.exercise_name)
            el.id, el.exercise_name, el.variant_key, ws.workout_date
       from exercise_logs el
       join workout_sessions ws on ws.id = el.session_id
      where ws.program_id = $1 and ws.day_number = $2
      order by el.exercise_name, ws.workout_date desc, el.id desc`,
    [program.id, dayNumber]
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

export async function listSessions({ from, to, dayNumber, limit = 100, scope = 'active' } = {}) {
  const conditions = [];
  const params = [];

  if (resolveScope(scope) === 'active') {
    const program = await getActiveProgram();
    if (!program) return [];
    params.push(program.id);
    conditions.push(`ws.program_id = $${params.length}`);
  }

  if (from) { params.push(from); conditions.push(`ws.workout_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`ws.workout_date <= $${params.length}`); }
  if (dayNumber) { params.push(dayNumber); conditions.push(`ws.day_number = $${params.length}`); }
  params.push(limit);

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await query(
    `select ws.id, ws.workout_date, ws.day_number, ws.exertion, ws.session_notes,
            ws.completed_at, ws.program_id, pd.title, pd.type,
            count(el.id)::int as exercise_count
       from workout_sessions ws
       left join program_days pd on pd.program_id = ws.program_id and pd.day_number = ws.day_number
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
       left join program_days pd on pd.program_id = ws.program_id and pd.day_number = ws.day_number
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
  const program = await requireActiveProgram();

  const sessionId = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `insert into workout_sessions (workout_date, day_number, exertion, session_notes, program_id)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [workoutDate, dayNumber, exertion ?? null, sessionNotes ?? null, program.id]
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

async function getExerciseLoggingMode(name, programId) {
  const params = [name];
  let sql = `select pe.logging_mode
               from program_exercises pe
               join program_days pd on pd.id = pe.day_id
              where pe.name = $1`;
  if (programId) {
    params.push(programId);
    sql += ` and pd.program_id = $2`;
  }
  sql += ' limit 1';
  const { rows } = await query(sql, params);
  return rows[0]?.logging_mode ?? null;
}

export async function getExerciseProgress(name, scope = 'active') {
  const program = resolveScope(scope) === 'active' ? await getActiveProgram() : null;
  const loggingMode = await getExerciseLoggingMode(name, program?.id);
  if (!loggingMode || !TRACKABLE_MODES.includes(loggingMode)) return [];

  const params = [name];
  let programFilter = '';
  if (program) {
    params.push(program.id);
    programFilter = ` and ws.program_id = $${params.length}`;
  }

  const { rows } = await query(
    `select ws.workout_date,
            max(esl.weight_lbs) as weight_lbs,
            max(esl.reps) as reps,
            ws.exertion,
            bool_or(esl.assisted_band) as assisted_band
       from exercise_logs el
       join workout_sessions ws on ws.id = el.session_id
       left join exercise_set_logs esl on esl.exercise_log_id = el.id
      where el.exercise_name = $1${programFilter}
      group by ws.id, ws.workout_date, ws.exertion
      order by ws.workout_date asc`,
    params
  );
  return rows;
}

export async function listLoggedExercises(scope = 'active') {
  const params = [TRACKABLE_MODES];
  let programFilter = '';
  if (resolveScope(scope) === 'active') {
    const program = await getActiveProgram();
    if (!program) return [];
    params.push(program.id);
    programFilter = ` and ws.program_id = $${params.length}`;
  }

  const { rows } = await query(
    `select distinct el.exercise_name, pe.logging_mode
       from exercise_logs el
       join workout_sessions ws on ws.id = el.session_id
       join program_exercises pe on pe.name = el.exercise_name
       join program_days pd on pd.id = pe.day_id and pd.program_id = ws.program_id
      where pe.logging_mode = any($1::text[])${programFilter}
      order by el.exercise_name`,
    params
  );
  return rows.map((r) => ({
    name: r.exercise_name,
    loggingMode: r.logging_mode,
  }));
}

export async function getStats(scope = 'active') {
  const scoped = resolveScope(scope) === 'active';
  const program = scoped ? await getActiveProgram() : null;
  const now = new Date();

  let startDate = null;
  let totalWorkouts = 40;
  let durationWeeks = 8;

  if (scoped && program) {
    startDate = program.start_date ? toIso(program.start_date) : null;
    totalWorkouts = program.total_workouts || 40;
    durationWeeks = program.duration_weeks || 8;
  } else if (!scoped) {
    const { rows: sumRows } = await query(
      'select coalesce(sum(total_workouts), 40)::int as total from programs'
    );
    totalWorkouts = sumRows[0].total;
    const { rows: durRows } = await query(
      'select coalesce(max(duration_weeks), 8)::int as weeks from programs'
    );
    durationWeeks = durRows[0].weeks;
  }

  const start = startDate ? new Date(`${startDate}T12:00:00`) : null;
  const beforeStart = scoped && start && now < start;

  let total = 0;
  if (scoped) {
    if (startDate && !beforeStart) {
      const { rows: countRows } = await query(
        'select count(*)::int as total from workout_sessions where program_id = $1 and workout_date >= $2',
        [program.id, startDate]
      );
      total = countRows[0].total;
    }
  } else {
    const { rows: countRows } = await query('select count(*)::int as total from workout_sessions');
    total = countRows[0].total;
  }

  const streakParams = [];
  let streakFilter = '';
  if (scoped && program) {
    streakParams.push(program.id);
    streakFilter = 'where program_id = $1';
  }
  const { rows: dateRows } = await query(
    `select distinct workout_date from workout_sessions ${streakFilter} order by workout_date desc`,
    streakParams
  );
  const streak = computeStreak(dateRows.map((r) => r.workout_date));

  const completion = totalWorkouts ? Math.min(100, Math.round((total / totalWorkouts) * 100)) : 0;

  let currentWeek = null;
  let programStatus = 'active';
  let daysUntilStart = null;

  if (scoped && startDate) {
    if (beforeStart) {
      programStatus = 'pending';
      daysUntilStart = Math.ceil((start - now) / 86400000);
    } else {
      const diffDays = Math.floor((now - start) / 86400000);
      currentWeek = Math.min(durationWeeks, Math.floor(diffDays / 7) + 1);
    }
  }

  return {
    checkIns: total,
    streak,
    completion,
    totalWorkouts,
    currentWeek,
    durationWeeks,
    startDate,
    programStatus,
    daysUntilStart,
    scope: scoped ? 'active' : 'all',
    activeProgramId: program?.id ?? null,
  };
}

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
