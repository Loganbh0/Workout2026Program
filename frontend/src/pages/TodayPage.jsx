import { useEffect, useMemo, useState } from 'react';
import { api, localIsoDate } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import DayCompleteView from '../components/DayCompleteView.jsx';
import { ProgressCard, StatsCard } from '../components/Cards.jsx';
import ExerciseCard from '../components/ExerciseCard.jsx';
import ExertionPicker from '../components/ExertionPicker.jsx';
import { DumbbellIcon, CheckIcon } from '../components/Icons.jsx';
import { parseSetCount, emptySets, resolveLoggingMode } from '../setCount.js';

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

function normalizeVariantOptions(exercise) {
  const raw = exercise.variant_options;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function initExerciseValue(exercise) {
  const setCount = parseSetCount(exercise.target_sets);
  const variantOptions = normalizeVariantOptions(exercise);
  const variantKey =
    exercise.prefill?.variantKey ||
    (exercise.logging_mode === 'variant' ? variantOptions[0]?.key ?? null : null);
  const mode = resolveLoggingMode(exercise, variantKey);
  const showSets = mode !== 'completion_only';

  let sets = emptySets(setCount);
  if (showSets && exercise.prefill?.sets?.length) {
    sets = emptySets(setCount).map((row, i) => ({
      ...row,
      ...(exercise.prefill.sets[i] || {}),
      setNumber: i + 1,
    }));
  }

  return {
    completed: false,
    variantKey,
    sets: showSets ? sets : [],
  };
}

function formatStartLabel(startDate) {
  const d = new Date(`${startDate}T12:00:00`);
  return `Starts ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
}

export default function TodayPage() {
  const [today, setToday] = useState(null);
  const [stats, setStats] = useState(null);
  const [day, setDay] = useState(null);
  const [values, setValues] = useState({});
  const [exertion, setExertion] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const date = localIsoDate();
        const [t, s] = await Promise.all([api.today(date), api.stats()]);
        if (!active) return;
        setToday(t);
        setStats(s);

        const showWorkoutForm =
          t.mode === 'workout' && !t.alreadyLogged;

        if (showWorkoutForm) {
          const d = await api.prefillDay(t.dayNumber);
          if (!active) return;
          setDay(d);
          const init = {};
          for (const ex of d.exercises) {
            init[ex.id] = initExerciseValue(ex);
          }
          setValues(init);
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(() => {
    if (!day) return [];
    const groups = [];
    let current = null;
    for (const ex of day.exercises) {
      const block = ex.block || null;
      if (!current || current.block !== block) {
        current = { block, items: [] };
        groups.push(current);
      }
      current.items.push(ex);
    }
    return groups;
  }, [day]);

  async function handleSave() {
    if (!day) return;
    setSaving(true);
    setError(null);
    try {
      const logs = day.exercises.map((ex) => {
        const v = values[ex.id] || {};
        const mode = resolveLoggingMode(ex, v.variantKey);
        return {
          exerciseName: ex.name,
          sortOrder: ex.sort_order,
          completed: v.completed ?? false,
          variantKey: v.variantKey ?? null,
          sets:
            mode === 'completion_only'
              ? []
              : (v.sets || []).map((s) => ({
                  setNumber: s.setNumber,
                  weightLbs: s.weightLbs ?? null,
                  reps: s.reps ?? null,
                  assistedBand: s.assistedBand ?? false,
                })),
        };
      });
      await api.createSession({
        workoutDate: localIsoDate(),
        dayNumber: today.dayNumber,
        exertion,
        sessionNotes: notes || null,
        logs,
      });
      setSaved(true);
      setToday((prev) => (prev ? { ...prev, alreadyLogged: true } : prev));
      const s = await api.stats();
      setStats(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <TopNav title="Today" />
        <div className="screen">
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (error && !today) {
    return (
      <>
        <TopNav title="Today" />
        <div className="screen">
          <div className="empty">Couldn't reach the server.<br />{error}</div>
        </div>
      </>
    );
  }

  const showDayComplete =
    today?.mode === 'rest' ||
    today?.alreadyLogged ||
    saved;

  if (showDayComplete) {
    return (
      <DayCompleteView
        mode={today?.mode === 'rest' ? 'rest' : 'complete'}
        weekday={today?.weekday}
        stats={stats}
      />
    );
  }

  const pd = today.programDay || day;
  const checkIns = stats?.checkIns ?? 0;
  const totalWorkouts = stats?.totalWorkouts ?? 40;
  const completion = stats?.completion ?? 0;

  const progressLabel =
    stats?.programStatus === 'pending' && stats?.startDate
      ? formatStartLabel(stats.startDate)
      : stats?.currentWeek
      ? `Week ${stats.currentWeek} of ${stats.durationWeeks}`
      : 'Progress';

  return (
    <>
      <TopNav title="Today" right={<span className="dim" style={{ fontSize: 13 }}>{todayLabel()}</span>} />
      <div className="screen">
        <DumbbellIcon className="page-icon" width={44} height={44} />
        <h1 className="heading">{pd?.title}</h1>
        {pd?.subtitle && <p className="subtitle">{pd.subtitle}</p>}

        <div className="section">
          <ProgressCard
            label={progressLabel}
            count={`${checkIns}/${totalWorkouts} workouts`}
            value={completion}
          />
        </div>

        <div className="section">
          <StatsCard
            stats={[
              { label: 'Streak', value: stats?.streak ?? 0 },
              { label: 'Check-Ins', value: checkIns },
              { label: 'Completion', value: `${completion}%` },
            ]}
          />
        </div>

        <div className="section">
          <p className="section-label">Exercises</p>
          <div className="stack">
            {grouped.map((group, gi) => (
              <div key={gi}>
                {group.block && <div className="block-label">{group.block}</div>}
                <div className="stack">
                  {group.items.map((ex) => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      value={
                        values[ex.id] || {
                          completed: false,
                          variantKey: null,
                          sets: [],
                        }
                      }
                      onChange={(v) => setValues((prev) => ({ ...prev, [ex.id]: v }))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <p className="section-label">Effort</p>
          <ExertionPicker value={exertion} onChange={setExertion} />
        </div>

        <div className="section">
          <p className="section-label">Notes</p>
          <textarea
            className="notes"
            placeholder="How did it feel? PRs, energy, soreness…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {error && <div className="empty" style={{ paddingBottom: 0 }}>{error}</div>}

        <div className="section">
          <button
            className={`btn${saved ? ' btn--done' : ''}`}
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saved ? (
              <>
                <CheckIcon width={20} height={20} /> Workout Saved
              </>
            ) : saving ? (
              'Saving…'
            ) : (
              'Save Workout'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
