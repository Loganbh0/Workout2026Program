import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import WorkoutForm from '../components/WorkoutForm.jsx';
import {
  exerciseFromLog,
  valueFromLog,
  buildLogsFromRows,
  createAdHocExercise,
  initExerciseValue,
} from '../workoutHelpers.js';
import { ChevronLeftIcon } from '../components/Icons.jsx';
import '../components/AdHocExerciseCard.css';

let nextTempId = 1;

export default function SessionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [values, setValues] = useState({});
  const [exertion, setExertion] = useState(null);
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .session(id)
      .then((s) => {
        if (!active) return;
        setSession(s);
        setTitle(s.title || s.display_title || '');
        setExertion(s.exertion ?? null);
        setNotes(s.session_notes || '');

        const rows = s.logs.map((log) => exerciseFromLog(log, null));
        const init = {};
        for (const ex of rows) {
          const log = s.logs.find((l) => l.exercise_name === ex.name);
          init[ex.id] = valueFromLog(log);
        }
        setExercises(rows);
        setValues(init);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  function handleExerciseChange(exId, value) {
    setValues((prev) => ({ ...prev, [exId]: value }));
  }

  function handleExerciseMetaChange(exId, patch) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, ...patch, name: patch.name ?? ex.name } : ex))
    );
    if (patch.logging_mode) {
      setValues((prev) => ({
        ...prev,
        [exId]: {
          completed: prev[exId]?.completed ?? false,
          variantKey: null,
          sets: patch.logging_mode === 'completion_only' ? [] : prev[exId]?.sets ?? [],
        },
      }));
    }
  }

  function handleAddExercise() {
    const exId = `extra-${nextTempId++}`;
    const ex = createAdHocExercise(exId);
    setExercises((prev) => [...prev, ex]);
    setValues((prev) => ({ ...prev, [exId]: initExerciseValue(ex) }));
  }

  function handleRemoveExercise(exId) {
    setExercises((prev) => prev.filter((e) => e.id !== exId));
    setValues((prev) => {
      const next = { ...prev };
      delete next[exId];
      return next;
    });
  }

  async function handleSave() {
    const rows = exercises.map((ex) => ({ exercise: ex, value: values[ex.id] || {} }));
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
      await api.updateSession(id, {
        exertion,
        sessionNotes: notes || null,
        title: session?.session_type === 'adhoc' ? title.trim() : undefined,
        logs: buildLogsFromRows(rows),
      });
      navigate(`/history/${id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const back = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Back"
      style={{ display: 'flex', color: 'var(--text-secondary)' }}
    >
      <ChevronLeftIcon width={24} height={24} />
    </button>
  );

  if (loading) {
    return (
      <>
        <TopNav title="Edit Workout" left={back} />
        <div className="spinner" />
      </>
    );
  }

  return (
    <>
      <TopNav title="Edit Workout" left={back} />
      <div className="screen">
        {session?.session_type === 'adhoc' && (
          <div className="section" style={{ marginTop: 12 }}>
            <p className="section-label">Workout title</p>
            <input className="select" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}

        <WorkoutForm
          showProgress={false}
          title={session?.session_type === 'program' ? session.display_title || session.title : undefined}
          exercises={exercises}
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
          saveLabel="Update workout"
          error={error}
          showLoggingFields={exercises.length > 0}
          emptyAddCard
        />
      </div>
    </>
  );
}
