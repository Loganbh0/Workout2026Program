import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, localIsoDate } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import WorkoutForm from '../components/WorkoutForm.jsx';
import { ChevronLeftIcon } from '../components/Icons.jsx';
import {
  initExerciseValue,
  createAdHocExercise,
  buildLogsFromRows,
} from '../workoutHelpers.js';
import '../components/AdHocExerciseCard.css';

let nextTempId = 1;

export default function AdhocSessionPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState([]);
  const [values, setValues] = useState({});
  const [exertion, setExertion] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const hasExercises = exercises.length > 0;

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
    const id = `adhoc-${nextTempId++}`;
    const ex = createAdHocExercise(id);
    setExercises((prev) => [...prev, ex]);
    setValues((prev) => ({ ...prev, [id]: initExerciseValue(ex) }));
  }

  function handleRemoveExercise(id) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
    setValues((prev) => {
      const next = { ...prev };
      delete next[id];
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
      await api.createSession({
        workoutDate: localIsoDate(),
        sessionType: 'adhoc',
        title: title.trim() || undefined,
        exertion,
        sessionNotes: notes || null,
        logs: buildLogsFromRows(rows),
      });
      navigate('/history');
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

  return (
    <>
      <TopNav title="One-off Workout" left={back} />
      <div className="screen">
        <h1 className="heading" style={{ marginTop: 12 }}>Log one-off workout</h1>
        <p className="subtitle">Won&apos;t count toward your program schedule.</p>

        {hasExercises && (
          <div className="section">
            <p className="section-label">Workout title (optional)</p>
            <input
              className="select"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hotel gym session"
            />
          </div>
        )}

        <WorkoutForm
          showProgress={false}
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
          saveLabel="Save workout"
          error={error}
          showLoggingFields={hasExercises}
          emptyAddCard
        />
      </div>
    </>
  );
}
