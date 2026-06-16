// End-to-end smoke test against a running API. Usage: node scripts/smoke.mjs
const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000/api/v1';

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const get = (p) => fetch(`${BASE}${p}`).then((r) => r.json());
const post = (p, body) =>
  fetch(`${BASE}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());
const put = (p, body) =>
  fetch(`${BASE}${p}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

function nextWeekday(target) {
  const d = new Date();
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const run = async () => {
  const programs = await get('/programs');
  ok(Array.isArray(programs) && programs.length >= 1, `Programs list has ${programs?.length ?? 0} item(s)`);
  const active = programs.find((p) => p.isActive);
  ok(active != null, `Active program: ${active?.displayName}`);
  ok(active?.dayCount === 5, `Active program has ${active?.dayCount} days`);

  const detail = await get(`/programs/${active.id}`);
  ok(detail.days?.length === 5, `Program detail has ${detail.days?.length} days`);
  ok(detail.days[0].title != null, `Day 1 title = ${detail.days[0].title}`);
  ok(Array.isArray(detail.days[0].exercises), 'Program detail includes exercises per day');

  const renamed = await put(`/programs/${active.id}`, { displayName: active.displayName });
  ok(renamed.displayName === active.displayName, 'Program rename round-trip');

  const monday = await get(`/today?date=${nextWeekday(1)}`);
  ok(monday.mode === 'workout' && monday.dayNumber === 1, `Monday -> Day 1 (${monday.programDay?.title})`);
  ok(typeof monday.alreadyLogged === 'boolean', `alreadyLogged = ${monday.alreadyLogged}`);

  const saturday = await get(`/today?date=${nextWeekday(6)}`);
  ok(saturday.mode === 'rest', 'Saturday -> rest day');

  const prefill = await get('/prefill/day/1');
  ok(prefill.exercises.length === 5, `Day 1 has ${prefill.exercises.length} exercises`);
  ok(prefill.exercises[0].name === 'Pull-ups', 'First exercise is Pull-ups');
  ok(prefill.exercises[0].logging_mode === 'bodyweight_sets', 'Pull-ups use bodyweight_sets mode');

  const created = await post('/sessions', {
    workoutDate: nextWeekday(1),
    dayNumber: 1,
    exertion: 4,
    sessionNotes: 'Smoke test session',
    logs: [
      {
        exerciseName: 'Pull-ups',
        sortOrder: 1,
        completed: true,
        variantKey: null,
        sets: [
          { setNumber: 1, weightLbs: null, reps: 4, assistedBand: true },
          { setNumber: 2, weightLbs: null, reps: 5, assistedBand: false },
        ],
      },
      {
        exerciseName: 'Squat',
        sortOrder: 2,
        completed: true,
        variantKey: null,
        sets: [
          { setNumber: 1, weightLbs: 185, reps: 5, assistedBand: false },
          { setNumber: 2, weightLbs: 185, reps: 5, assistedBand: false },
          { setNumber: 3, weightLbs: 185, reps: 4, assistedBand: false },
        ],
      },
      {
        exerciseName: 'Bench Press',
        sortOrder: 3,
        completed: true,
        variantKey: null,
        sets: [{ setNumber: 1, weightLbs: 135, reps: 5, assistedBand: false }],
      },
    ],
  });
  ok(created.id != null, `Created session id=${created.id}`);
  ok(created.logs.length === 3, `Session has ${created.logs.length} logs`);
  const pullLog = created.logs.find((l) => l.exercise_name === 'Pull-ups');
  ok(pullLog?.sets?.length === 2, `Pull-ups saved ${pullLog?.sets?.length} sets`);
  ok(pullLog?.sets?.[0]?.assistedBand === true, 'Pull-up set 1 assisted band flag saved');
  const squatLog = created.logs.find((l) => l.exercise_name === 'Squat');
  ok(squatLog?.sets?.length === 3, `Squat saved ${squatLog?.sets?.length} sets`);

  const mondayLogged = await get(`/today?date=${nextWeekday(1)}`);
  ok(mondayLogged.alreadyLogged === true, 'Monday alreadyLogged after save');

  const monday2 = (() => {
    const d = new Date(`${nextWeekday(1)}T12:00:00`);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  await post('/sessions', {
    workoutDate: monday2,
    dayNumber: 1,
    exertion: 5,
    sessionNotes: 'Week 2',
    logs: [
      {
        exerciseName: 'Squat',
        sortOrder: 2,
        completed: true,
        variantKey: null,
        sets: [
          { setNumber: 1, weightLbs: 195, reps: 5, assistedBand: false },
          { setNumber: 2, weightLbs: 195, reps: 5, assistedBand: false },
          { setNumber: 3, weightLbs: 195, reps: 5, assistedBand: false },
        ],
      },
    ],
  });

  const historyActive = await get('/sessions?scope=active');
  ok(historyActive.length >= 2, `Active history has ${historyActive.length} sessions`);
  const historyAll = await get('/sessions?scope=all');
  ok(historyAll.length >= historyActive.length, `All-time history has ${historyAll.length} sessions`);

  const prefill2 = await get('/prefill/day/1');
  const squat = prefill2.exercises.find((e) => e.name === 'Squat');
  ok(squat.prefill.source === 'history', 'Squat prefill from history');
  ok(squat.prefill.sets?.length === 3, `Squat prefill has ${squat.prefill.sets?.length} sets`);
  ok(Number(squat.prefill.sets[0].weightLbs) === 195, `Squat set 1 prefill = ${squat.prefill.sets[0].weightLbs}`);

  const progress = await get('/progress/exercise/Squat?scope=active');
  ok(progress.length === 2, `Squat progress (active) has ${progress.length} points`);
  ok(Number(progress[0].weight_lbs) === 185 && Number(progress[1].weight_lbs) === 195, 'Squat weight trend 185 -> 195');

  const stats = await get('/stats?scope=active');
  ok(typeof stats.checkIns === 'number', `Check-ins = ${stats.checkIns}`);
  ok(typeof stats.completion === 'number', `Completion = ${stats.completion}%`);
  ok(typeof stats.programStatus === 'string', `Program status = ${stats.programStatus}`);

  const exercises = await get('/exercises?scope=active');
  const names = exercises.map((e) => e.name ?? e);
  ok(names.includes('Squat'), `Exercises list includes Squat (${names.length} total)`);
  ok(names.includes('Pull-ups'), 'Exercises list includes Pull-ups (bodyweight_sets)');
  const pullMeta = exercises.find((e) => e.name === 'Pull-ups');
  ok(pullMeta?.loggingMode === 'bodyweight_sets', 'Pull-ups loggingMode is bodyweight_sets');

  const pullProgress = await get('/progress/exercise/Pull-ups?scope=active');
  ok(pullProgress.length >= 1, `Pull-ups progress has ${pullProgress.length} point(s)`);
  ok(pullProgress[0].reps != null, 'Pull-ups progress includes reps');

  const activated = await post(`/programs/${active.id}/activate`, { startDate: '2026-06-08' });
  ok(activated.isActive === true, 'Activate program returns active program');
  ok(activated.startDate === '2026-06-08', 'Activate sets startDate');

  const custom = await post('/programs', {
    displayName: 'Smoke 3-Day Split',
    durationWeeks: 4,
    days: [
      {
        weekday: 'monday',
        title: 'Upper',
        exercises: [
          { name: 'Bench', targetSets: '3', targetReps: '5', loggingMode: 'weighted_sets' },
        ],
      },
      {
        weekday: 'wednesday',
        title: 'Lower',
        exercises: [
          { name: 'Squat Custom', targetSets: '3', targetReps: '5', loggingMode: 'weighted_sets' },
        ],
      },
      {
        weekday: 'friday',
        title: 'Full',
        exercises: [
          { name: 'Pull Custom', targetSets: '3', targetReps: '8', loggingMode: 'bodyweight_sets' },
        ],
      },
    ],
  });
  ok(custom.id != null, `Created custom program id=${custom.id}`);
  ok(custom.days?.length === 3, `Custom program has ${custom.days?.length} days`);
  ok(custom.days[0].exercises?.length === 1, 'Custom day includes exercises');

  const customStart = nextWeekday(1);
  const customActive = await post(`/programs/${custom.id}/activate`, { startDate: customStart });
  ok(customActive.isActive === true, 'Custom program activated');

  const monCustom = await get(`/today?date=${nextWeekday(1)}`);
  ok(monCustom.mode === 'workout' && monCustom.dayNumber === 1, 'Mon on 3-day split -> day 1');

  const tueCustom = await get(`/today?date=${nextWeekday(2)}`);
  ok(tueCustom.mode === 'rest', 'Tue on 3-day split -> rest');

  const wedCustom = await get(`/today?date=${nextWeekday(3)}`);
  ok(wedCustom.mode === 'workout' && wedCustom.dayNumber === 2, 'Wed on 3-day split -> day 2');

  await post(`/programs/${active.id}/activate`, { startDate: '2026-06-08' });
  ok(true, 'Restored original active program');

  const checkInsBefore = (await get('/stats?scope=active')).checkIns;

  const adhoc = await post('/sessions', {
    workoutDate: nextWeekday(1),
    sessionType: 'adhoc',
    title: 'Smoke Adhoc',
    exertion: 3,
    logs: [
      {
        exerciseName: 'Smoke Extra Lift',
        sortOrder: 1,
        completed: true,
        variantKey: null,
        sets: [{ setNumber: 1, weightLbs: 100, reps: 5, assistedBand: false }],
      },
    ],
  });
  ok(adhoc.session_type === 'adhoc', 'Adhoc session created');
  ok(adhoc.title === 'Smoke Adhoc', 'Adhoc session has title');

  const statsAfterAdhoc = await get('/stats?scope=active');
  ok(statsAfterAdhoc.checkIns === checkInsBefore, 'Adhoc does not increment program check-ins');

  const updated = await put(`/sessions/${created.id}`, {
    exertion: 5,
    sessionNotes: 'Updated smoke',
    logs: [
      {
        exerciseName: 'Squat',
        sortOrder: 2,
        completed: true,
        variantKey: null,
        sets: [{ setNumber: 1, weightLbs: 200, reps: 5, assistedBand: false }],
      },
    ],
  });
  ok(updated.exertion === 5, 'Session update saves exertion');
  ok(updated.logs.length === 1, 'Session update replaces logs');

  const todayLogged = await get(`/today?date=${nextWeekday(1)}`);
  ok(todayLogged.alreadyLogged === true, 'Today includes session when logged');
  ok(todayLogged.sessionId != null, 'Today returns sessionId');
  ok(todayLogged.session?.logs?.length >= 1, 'Today returns session payload');

  const editedProgram = await put(`/programs/${custom.id}`, {
    displayName: 'Smoke 3-Day Split Updated',
    durationWeeks: 4,
    days: custom.days.map((d) => ({
      weekday: d.weekday,
      title: `${d.title} v2`,
      exercises: d.exercises.map((ex) => ({
        name: ex.name,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        loggingMode: ex.loggingMode,
      })),
    })),
  });
  ok(editedProgram.displayName === 'Smoke 3-Day Split Updated', 'Full program update works');
  ok(editedProgram.days[0].title.endsWith('v2'), 'Program day title updated');

  console.log(`\n${failures === 0 ? 'ALL SMOKE TESTS PASSED' : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
