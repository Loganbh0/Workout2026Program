import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import { ChevronLeftIcon } from '../components/Icons.jsx';

const WEEKDAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
];

const WEEKDAY_ORDER = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };

const LOGGING_OPTIONS = [
  { value: 'weighted_sets', label: 'Weight' },
  { value: 'bodyweight_sets', label: 'Bodyweight (reps)' },
  { value: 'completion_only', label: 'Bodyweight (no reps)' },
];

const WEEKDAY_FULL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

function emptyExercise() {
  return { name: '', targetSets: '3', targetReps: '8-12', loggingMode: 'weighted_sets' };
}

function emptyDay() {
  return { title: '', subtitle: '', exercises: [emptyExercise()] };
}

export default function CreateProgramPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [selectedDays, setSelectedDays] = useState(['monday', 'wednesday', 'friday']);
  const [dayDrafts, setDayDrafts] = useState({
    monday: { ...emptyDay(), title: 'Day 1' },
    wednesday: { ...emptyDay(), title: 'Day 2' },
    friday: { ...emptyDay(), title: 'Day 3' },
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const sortedSelected = useMemo(
    () => [...selectedDays].sort((a, b) => WEEKDAY_ORDER[a] - WEEKDAY_ORDER[b]),
    [selectedDays]
  );

  function toggleDay(weekday) {
    setSelectedDays((prev) => {
      if (prev.includes(weekday)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== weekday);
      }
      setDayDrafts((drafts) =>
        drafts[weekday] ? drafts : { ...drafts, [weekday]: emptyDay() }
      );
      return [...prev, weekday];
    });
  }

  function updateDay(weekday, patch) {
    setDayDrafts((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], ...patch },
    }));
  }

  function updateExercise(weekday, index, patch) {
    setDayDrafts((prev) => {
      const day = prev[weekday];
      const exercises = day.exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex));
      return { ...prev, [weekday]: { ...day, exercises } };
    });
  }

  function addExercise(weekday) {
    setDayDrafts((prev) => ({
      ...prev,
      [weekday]: {
        ...prev[weekday],
        exercises: [...prev[weekday].exercises, emptyExercise()],
      },
    }));
  }

  function removeExercise(weekday, index) {
    setDayDrafts((prev) => {
      const day = prev[weekday];
      if (day.exercises.length <= 1) return prev;
      return {
        ...prev,
        [weekday]: {
          ...day,
          exercises: day.exercises.filter((_, i) => i !== index),
        },
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Program name is required.');
      return;
    }

    const days = sortedSelected.map((weekday) => {
      const draft = dayDrafts[weekday] || emptyDay();
      return {
        weekday,
        title: draft.title.trim() || `${WEEKDAY_FULL[weekday]} Workout`,
        subtitle: draft.subtitle.trim() || null,
        exercises: draft.exercises.map((ex) => ({
          name: ex.name.trim(),
          targetSets: String(ex.targetSets).trim(),
          targetReps: ex.targetReps?.trim() || null,
          loggingMode: ex.loggingMode,
        })),
      };
    });

    for (const day of days) {
      for (const ex of day.exercises) {
        if (!ex.name) {
          setError(`Every exercise needs a name (${WEEKDAY_FULL[day.weekday]}).`);
          return;
        }
        if (!ex.targetSets) {
          setError(`Sets required for ${ex.name}.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const program = await api.createProgram({
        displayName: displayName.trim(),
        durationWeeks: Number(durationWeeks),
        days,
      });
      navigate(`/programs/${program.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const back = (
    <button
      type="button"
      onClick={() => navigate('/home')}
      aria-label="Back"
      style={{ display: 'flex', color: 'var(--text-secondary)' }}
    >
      <ChevronLeftIcon width={24} height={24} />
    </button>
  );

  return (
    <>
      <TopNav title="New Program" left={back} />
      <form className="screen" onSubmit={handleSubmit}>
        <h1 className="heading" style={{ marginTop: 12 }}>Create program</h1>
        <p className="subtitle">Build a custom weekly plan.</p>

        <div className="section">
          <p className="section-label">Program name</p>
          <input
            className="select"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. 8 Week Strength"
          />
        </div>

        <div className="section">
          <p className="section-label">Duration (weeks)</p>
          <input
            className="select"
            type="number"
            min={1}
            max={52}
            value={durationWeeks}
            onChange={(e) => setDurationWeeks(e.target.value)}
          />
        </div>

        <div className="section">
          <p className="section-label">Training days</p>
          <div className="day-chips">
            {WEEKDAYS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`day-chip${selectedDays.includes(key) ? ' day-chip--on' : ''}`}
                onClick={() => toggleDay(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {sortedSelected.map((weekday) => {
          const draft = dayDrafts[weekday] || emptyDay();
          return (
            <div className="section" key={weekday}>
              <p className="section-label">{WEEKDAY_FULL[weekday]}</p>
              <div className="stack">
                <input
                  className="select"
                  value={draft.title}
                  onChange={(e) => updateDay(weekday, { title: e.target.value })}
                  placeholder="Workout title"
                />
                <input
                  className="select"
                  value={draft.subtitle}
                  onChange={(e) => updateDay(weekday, { subtitle: e.target.value })}
                  placeholder="Subtitle (optional)"
                />

                {draft.exercises.map((ex, i) => (
                  <div className="builder-exercise" key={i}>
                    <input
                      className="select"
                      value={ex.name}
                      onChange={(e) => updateExercise(weekday, i, { name: e.target.value })}
                      placeholder="Exercise name"
                    />
                    <div className="builder-exercise__row">
                      <input
                        className="select builder-exercise__sets"
                        type="number"
                        min={1}
                        value={ex.targetSets}
                        onChange={(e) => updateExercise(weekday, i, { targetSets: e.target.value })}
                        placeholder="Sets"
                      />
                      <input
                        className="select"
                        value={ex.targetReps}
                        onChange={(e) => updateExercise(weekday, i, { targetReps: e.target.value })}
                        placeholder="Reps"
                        disabled={ex.loggingMode === 'completion_only'}
                      />
                    </div>
                    <select
                      className="select"
                      value={ex.loggingMode}
                      onChange={(e) => updateExercise(weekday, i, { loggingMode: e.target.value })}
                    >
                      {LOGGING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {draft.exercises.length > 1 && (
                      <button
                        type="button"
                        className="builder-exercise__remove"
                        onClick={() => removeExercise(weekday, i)}
                      >
                        Remove exercise
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" className="btn btn--secondary" onClick={() => addExercise(weekday)}>
                  Add exercise
                </button>
              </div>
            </div>
          );
        })}

        {error && <div className="empty" style={{ paddingBottom: 0 }}>{error}</div>}

        <div className="section">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save program'}
          </button>
        </div>
      </form>
    </>
  );
}
