import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, localIsoDate } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import DayCompleteView from '../components/DayCompleteView.jsx';
import WorkoutForm from '../components/WorkoutForm.jsx';
import { DumbbellIcon } from '../components/Icons.jsx';
import {
  initExerciseValue,
  buildLogsFromRows,
  createAdHocExercise,
} from '../workoutHelpers.js';
import '../components/AdHocExerciseCard.css';

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

let nextTempId = 1;

export default function TodayPage() {
  const [today, setToday] = useState(null);
  const [stats, setStats] = useState(null);
  const [day, setDay] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [values, setValues] = useState({});
  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [exertion, setExertion] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const date = localIsoDate();
        const [t, s] = await Promise.all([api.today(date), api.stats()]);
        if (!active) return;
        setToday(t);
        setStats(s);

        if (t.mode === 'workout' && !t.alreadyLogged) {
          const d = await api.prefillDay(t.dayNumber);
          if (!active) return;
          setDay(d);
          setExercises(d.exercises);
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

  const visibleExercises = useMemo(
    () => exercises.filter((ex) => !removedIds.has(ex.id)),
    [exercises, removedIds]
  );

  function handleExerciseChange(id, value) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleExerciseMetaChange(id, patch) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch, name: patch.name ?? ex.name } : ex))
    );
    if (patch.logging_mode) {
      setValues((prev) => ({
        ...prev,
        [id]: {
          completed: prev[id]?.completed ?? false,
          variantKey: null,
          sets: patch.logging_mode === 'completion_only' ? [] : prev[id]?.sets ?? [],
        },
      }));
    }
  }

  function handleAddExercise() {
    const id = `extra-${nextTempId++}`;
    const ex = createAdHocExercise(id);
    setExercises((prev) => [...prev, ex]);
    setValues((prev) => ({ ...prev, [id]: initExerciseValue(ex) }));
  }

  function handleRemoveExercise(id) {
    const ex = exercises.find((e) => e.id === id);
    if (ex?.isAdHoc) {
      setExercises((prev) => prev.filter((e) => e.id !== id));
      setValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setRemovedIds((prev) => new Set(prev).add(id));
    }
  }

  async function handleSave() {
    const rows = visibleExercises.map((ex) => ({ exercise: ex, value: values[ex.id] || {} }));
    if (!rows.length) {
      setError('Add at least one exercise.');
      return;
    }
    for (const row of rows) {
      if (!row.exercise.name?.trim()) {
        setError('Every exercise needs a name.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const logs = buildLogsFromRows(rows);
      await api.createSession({
        workoutDate: localIsoDate(),
        dayNumber: today.dayNumber,
        exertion,
        sessionNotes: notes || null,
        logs,
      });
      const date = localIsoDate();
      const [t, s] = await Promise.all([api.today(date), api.stats()]);
      setToday(t);
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

  if (today?.mode === 'no_program') {
    return (
      <>
        <TopNav title="Today" />
        <div className="screen">
          <h1 className="heading" style={{ marginTop: 12 }}>No active program</h1>
          <p className="subtitle">
            Choose a program from Home and activate or resume it to see today&apos;s workout.
          </p>
          <div className="section">
            <Link to="/home" className="btn">
              Go to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  const showDayComplete = today?.mode === 'rest' || today?.alreadyLogged;

  if (showDayComplete) {
    return (
      <DayCompleteView
        mode={today?.mode === 'rest' ? 'rest' : 'complete'}
        weekday={today?.weekday}
        stats={stats}
        showAdhocLink
      />
    );
  }

  const pd = today?.programDay || day;

  return (
    <>
      <TopNav title="Today" right={<span className="dim" style={{ fontSize: 13 }}>{todayLabel()}</span>} />
      <div className="screen">
        <WorkoutForm
          icon={<DumbbellIcon className="page-icon" width={44} height={44} />}
          title={pd?.title}
          subtitle={pd?.subtitle}
          stats={stats}
          exercises={visibleExercises}
          values={values}
          onExerciseChange={handleExerciseChange}
          onExerciseMetaChange={handleExerciseMetaChange}
          onRemoveExercise={handleRemoveExercise}
          onAddExercise={handleAddExercise}
          exertion={exertion}
          onExertionChange={setExertion}
          notes={notes}
          onNotesChange={setNotes}
          onSave={handleSave}
          saving={saving}
          saveLabel="Save Workout"
          error={error}
          footer={
            <Link to="/session/new" className="adhoc-link">
              Log one-off workout instead
            </Link>
          }
        />
      </div>
    </>
  );
}
