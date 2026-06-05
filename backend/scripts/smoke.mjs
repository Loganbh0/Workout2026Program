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

function nextWeekday(target) {
  const d = new Date();
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const run = async () => {
  const monday = await get(`/today?date=${nextWeekday(1)}`);
  ok(monday.mode === 'workout' && monday.dayNumber === 1, `Monday -> Day 1 (${monday.programDay?.title})`);

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

  const history = await get('/sessions');
  ok(history.length >= 2, `History has ${history.length} sessions`);

  const prefill2 = await get('/prefill/day/1');
  const squat = prefill2.exercises.find((e) => e.name === 'Squat');
  ok(squat.prefill.source === 'history', 'Squat prefill from history');
  ok(squat.prefill.sets?.length === 3, `Squat prefill has ${squat.prefill.sets?.length} sets`);
  ok(Number(squat.prefill.sets[0].weightLbs) === 195, `Squat set 1 prefill = ${squat.prefill.sets[0].weightLbs}`);

  const progress = await get('/progress/exercise/Squat');
  ok(progress.length === 2, `Squat progress has ${progress.length} points`);
  ok(Number(progress[0].weight_lbs) === 185 && Number(progress[1].weight_lbs) === 195, 'Squat weight trend 185 -> 195');

  const stats = await get('/stats');
  ok(typeof stats.checkIns === 'number', `Check-ins = ${stats.checkIns}`);
  ok(typeof stats.completion === 'number', `Completion = ${stats.completion}%`);
  ok(typeof stats.programStatus === 'string', `Program status = ${stats.programStatus}`);

  const exercises = await get('/exercises');
  const names = exercises.map((e) => e.name ?? e);
  ok(names.includes('Squat'), `Exercises list includes Squat (${names.length} total)`);
  ok(names.includes('Pull-ups'), 'Exercises list includes Pull-ups (bodyweight_sets)');
  const pullMeta = exercises.find((e) => e.name === 'Pull-ups');
  ok(pullMeta?.loggingMode === 'bodyweight_sets', 'Pull-ups loggingMode is bodyweight_sets');

  const pullProgress = await get('/progress/exercise/Pull-ups');
  ok(pullProgress.length >= 1, `Pull-ups progress has ${pullProgress.length} point(s)`);
  ok(pullProgress[0].reps != null, 'Pull-ups progress includes reps');

  console.log(`\n${failures === 0 ? 'ALL SMOKE TESTS PASSED' : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
