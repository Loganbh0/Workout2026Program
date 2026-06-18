import { useMemo, useState } from 'react';

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
  { value: 'bodyweight_sets', label: 'Bodyweight — reps' },
  { value: 'bodyweight_time_sets', label: 'Bodyweight — time' },
  { value: 'bodyweight_distance_sets', label: 'Bodyweight — distance' },
  { value: 'completion_only', label: 'Bodyweight (no reps)' },
];

const WEEKDAY_FULL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export function emptyExercise() {
  return { name: '', targetSets: '3', targetReps: '8-12', loggingMode: 'weighted_sets' };
}

export function emptyDay() {
  return { title: '', subtitle: '', exercises: [emptyExercise()] };
}

export function programToFormState(program) {
  const dayDrafts = {};
  const selectedDays = [];
  for (const day of program.days || []) {
    selectedDays.push(day.weekday);
    dayDrafts[day.weekday] = {
      title: day.title || '',
      subtitle: day.subtitle || '',
      exercises: (day.exercises || []).map((ex) => ({
        name: ex.name,
        targetSets: ex.targetSets || '3',
        targetReps: ex.targetReps || '',
        loggingMode: ex.loggingMode || 'weighted_sets',
      })),
    };
  }
  if (!selectedDays.length) {
    selectedDays.push('monday');
    dayDrafts.monday = { ...emptyDay(), title: 'Day 1' };
  }
  return {
    displayName: program.displayName || '',
    durationWeeks: program.durationWeeks || 8,
    selectedDays,
    dayDrafts,
  };
}

export function buildProgramPayload({ displayName, durationWeeks, selectedDays, dayDrafts }) {
  const sortedSelected = [...selectedDays].sort(
    (a, b) => WEEKDAY_ORDER[a] - WEEKDAY_ORDER[b]
  );
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
  return {
    displayName: displayName.trim(),
    durationWeeks: Number(durationWeeks),
    days,
  };
}

export function validateProgramForm(payload) {
  if (!payload.displayName) return 'Program name is required.';
  for (const day of payload.days) {
    for (const ex of day.exercises) {
      if (!ex.name) return `Every exercise needs a name (${WEEKDAY_FULL[day.weekday]}).`;
      if (!ex.targetSets) return `Sets required for ${ex.name}.`;
    }
  }
  return null;
}

export default function ProgramForm({
  heading,
  subtitle,
  initialDisplayName = '',
  initialDurationWeeks = 8,
  initialSelectedDays = ['monday', 'wednesday', 'friday'],
  initialDayDrafts = null,
  submitLabel = 'Save program',
  onSubmit,
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [durationWeeks, setDurationWeeks] = useState(initialDurationWeeks);
  const [selectedDays, setSelectedDays] = useState(initialSelectedDays);
  const [dayDrafts, setDayDrafts] = useState(
    initialDayDrafts || {
      monday: { ...emptyDay(), title: 'Day 1' },
      wednesday: { ...emptyDay(), title: 'Day 2' },
      friday: { ...emptyDay(), title: 'Day 3' },
    }
  );
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
    const payload = buildProgramPayload({ displayName, durationWeeks, selectedDays, dayDrafts });
    const validationError = validateProgramForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="screen" onSubmit={handleSubmit}>
      <h1 className="heading" style={{ marginTop: 12 }}>{heading}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}

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
                      placeholder={
                        ex.loggingMode === 'bodyweight_time_sets'
                          ? 'Target (e.g. 60 sec)'
                          : ex.loggingMode === 'bodyweight_distance_sets'
                            ? 'Target (e.g. 20 yd)'
                            : 'Reps'
                      }
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
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
