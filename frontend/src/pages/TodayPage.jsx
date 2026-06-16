import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, localIsoDate } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import DayCompleteView from '../components/DayCompleteView.jsx';
import WorkoutForm from '../components/WorkoutForm.jsx';
import { DumbbellIcon } from '../components/Icons.jsx';
import {
  initExerciseValue,
  exerciseFromLog,
  valueFromLog,
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
  const [editing, setEditing] = useState(false);
  const [editSessionId, setEditSessionId] = useState(null);

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

  function startEdit() {
    const session = today?.session;
    if (!session) return;

    const templateByName = new Map(
      (day?.exercises || today.programDay?.exercises || []).map((ex) => [ex.name, ex])
    );
    const editRows = session.logs.map((log) => {
      const template = templateByName.get(log.exerciseName);
      return exerciseFromLog(
        {
          id: log.id,
          exerciseName: log.exerciseName,
          sortOrder: log.sortOrder,
          sets: log.sets,
          completed: log.completed,
          variantKey: log.variantKey,
        },
        template
      );
    });

    const init = {};
    for (const ex of editRows) {
      const log = session.logs.find((l) => l.exerciseName === ex.name);
      init[ex.id] = valueFromLog({
        ...log,
        exercise_name: log.exerciseName,
        variant_key: log.variantKey,
      });
    }

    setExercises(editRows);
    setValues(init);
    setExertion(session.exertion ?? null);
    setNotes(session.sessionNotes ?? '');
    setEditSessionId(session.id);
    setRemovedIds(new Set());
    setEditing(true);
  }

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
      if (editSessionId) {
        await api.updateSession(editSessionId, {
          exertion,
          sessionNotes: notes || null,
          logs,
        });
        setEditing(false);
        const date = localIsoDate();
        const t = await api.today(date);
        setToday(t);
      } else {
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
        setEditing(false);
      }
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
    !editing &&
    (today?.mode === 'rest' || today?.alreadyLogged);

  if (showDayComplete) {
    return (
      <DayCompleteView
        mode={today?.mode === 'rest' ? 'rest' : 'complete'}
        weekday={today?.weekday}
        stats={stats}
        onEdit={today?.alreadyLogged && today?.mode === 'workout' ? startEdit : undefined}
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
          saveLabel={editSessionId ? 'Update workout' : 'Save Workout'}
          error={error}
          footer={
            !editSessionId && (
              <Link to="/session/new" className="adhoc-link">
                Log one-off workout instead
              </Link>
            )
          }
        />
      </div>
    </>
  );
}
