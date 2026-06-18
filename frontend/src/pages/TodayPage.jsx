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

function resetWorkoutDraft() {
  return {
    exercises: [],
    values: {},
    exertion: null,
    notes: '',
    removedIds: new Set(),
  };
}

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
  const [loggingAnother, setLoggingAnother] = useState(false);

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

  const isFreeWorkout = today?.mode === 'no_program' || loggingAnother;
  const visibleExercises = useMemo(
    () => exercises.filter((ex) => !removedIds.has(ex.id)),
    [exercises, removedIds]
  );
  const hasExercises = visibleExercises.length > 0;

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
    if (ex?.isAdHoc || isFreeWorkout) {
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

  function handleAddAnother() {
    const draft = resetWorkoutDraft();
    setLoggingAnother(true);
    setExercises(draft.exercises);
    setValues(draft.values);
    setRemovedIds(draft.removedIds);
    setExertion(draft.exertion);
    setNotes(draft.notes);
    setError(null);
  }

  async function refreshToday() {
    const date = localIsoDate();
    const [t, s] = await Promise.all([api.today(date), api.stats()]);
    setToday(t);
    setStats(s);
    setLoggingAnother(false);
    const draft = resetWorkoutDraft();
    setExercises(draft.exercises);
    setValues(draft.values);
    setRemovedIds(draft.removedIds);
    setExertion(draft.exertion);
    setNotes(draft.notes);
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
      if (isFreeWorkout) {
        await api.createSession({
          workoutDate: localIsoDate(),
          sessionType: 'adhoc',
          exertion,
          sessionNotes: notes || null,
          logs,
        });
      } else {
        await api.createSession({
          workoutDate: localIsoDate(),
          dayNumber: today.dayNumber,
          exertion,
          sessionNotes: notes || null,
          logs,
        });
      }
      await refreshToday();
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

  const isRest = today?.mode === 'rest';
  const showDayComplete =
    !loggingAnother &&
    (isRest || today?.alreadyLogged);

  if (showDayComplete) {
    return (
      <DayCompleteView
        mode={isRest ? 'rest' : 'complete'}
        weekday={today?.weekday}
        stats={stats}
        showProgress={today?.mode !== 'no_program'}
        showAddAnother={!isRest && Boolean(today?.alreadyLogged)}
        onAddAnother={handleAddAnother}
      />
    );
  }

  const pd = today?.programDay || day;

  if (isFreeWorkout) {
    return (
      <>
        <TopNav title="Today" right={<span className="dim" style={{ fontSize: 13 }}>{todayLabel()}</span>} />
        <div className="screen">
          <h1 className="heading" style={{ marginTop: 12 }}>Ready when you are</h1>
          <p className="subtitle">
            No plan needed — log what you did today and keep moving forward.
          </p>

          <WorkoutForm
            showProgress={false}
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
            saveLabel="Log workout"
            error={error}
            showLoggingFields={hasExercises}
            emptyAddCard
            footer={
              today?.mode === 'no_program' ? (
                <Link to="/home" className="adhoc-link">
                  Browse plans
                </Link>
              ) : null
            }
          />
        </div>
      </>
    );
  }

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
        />
      </div>
    </>
  );
}
