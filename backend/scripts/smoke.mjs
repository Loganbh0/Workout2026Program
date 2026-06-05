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

// Find a Monday and a Saturday for deterministic day resolution.
function nextWeekday(target) {
  const d = new Date();
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const run = async () => {
  // 1. Day resolution
  const monday = await get(`/today?date=${nextWeekday(1)}`);
  ok(monday.mode === 'workout' && monday.dayNumber === 1, `Monday -> Day 1 (${monday.programDay?.title})`);

  const saturday = await get(`/today?date=${nextWeekday(6)}`);
  ok(saturday.mode === 'rest', 'Saturday -> rest day');

  // 2. Prefill (template, no history yet)
  const prefill = await get('/prefill/day/1');
  ok(prefill.exercises.length === 5, `Day 1 has ${prefill.exercises.length} exercises`);
  ok(prefill.exercises[0].name === 'Pull-ups', 'First exercise is Pull-ups');

  // 3. Log a session
  const created = await post('/sessions', {
    workoutDate: nextWeekday(1),
    dayNumber: 1,
    exertion: 4,
    sessionNotes: 'Smoke test session',
    logs: [
      { exerciseName: 'Pull-ups', sortOrder: 1, weightLbs: 0, reps: 5, completed: true },
      { exerciseName: 'Squat', sortOrder: 2, weightLbs: 185, reps: 5, completed: true },
      { exerciseName: 'Bench Press', sortOrder: 3, weightLbs: 135, reps: 5, completed: true },
    ],
  });
  ok(created.id != null, `Created session id=${created.id}`);
  ok(created.logs.length === 3, `Session has ${created.logs.length} logs`);

  // 4. Log a second session a week later (heavier squat) for trend data
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
    logs: [{ exerciseName: 'Squat', sortOrder: 2, weightLbs: 195, reps: 5, completed: true }],
  });

  // 5. History
  const history = await get('/sessions');
  ok(history.length >= 2, `History has ${history.length} sessions`);
  ok(history[0].title?.includes('Lift A'), `History shows program title (${history[0].title})`);

  // 6. Prefill should now reflect history (last Squat = 195)
  const prefill2 = await get('/prefill/day/1');
  const squat = prefill2.exercises.find((e) => e.name === 'Squat');
  ok(Number(squat.prefill.weightLbs) === 195 && squat.prefill.source === 'history', `Squat prefill = ${squat.prefill.weightLbs} from history`);

  // 7. Progress series
  const progress = await get('/progress/exercise/Squat');
  ok(progress.length === 2, `Squat progress has ${progress.length} points`);
  ok(Number(progress[0].weight_lbs) === 185 && Number(progress[1].weight_lbs) === 195, 'Squat weight trend 185 -> 195');

  // 8. Stats
  const stats = await get('/stats');
  ok(stats.checkIns === 2, `Check-ins = ${stats.checkIns}`);
  ok(typeof stats.completion === 'number', `Completion = ${stats.completion}%`);

  // 9. Exercises list
  const exercises = await get('/exercises');
  ok(exercises.includes('Squat'), `Exercises list includes Squat (${exercises.length} total)`);

  console.log(`\n${failures === 0 ? 'ALL SMOKE TESTS PASSED' : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
