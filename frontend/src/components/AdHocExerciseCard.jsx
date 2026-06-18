import { useMemo } from 'react';
import { CheckIcon, ChevronDownIcon } from './Icons.jsx';
import SetRow from './SetRow.jsx';
import { parseSetCount, emptySets, resolveLoggingMode } from '../setCount.js';
import './ExerciseCard.css';
import './AdHocExerciseCard.css';

const LOGGING_OPTIONS = [
  { value: 'weighted_sets', label: 'Weight' },
  { value: 'bodyweight_sets', label: 'Bodyweight — reps' },
  { value: 'bodyweight_time_sets', label: 'Bodyweight — time' },
  { value: 'bodyweight_distance_sets', label: 'Bodyweight — distance' },
  { value: 'completion_only', label: 'Completion only' },
];

export default function AdHocExerciseCard({
  exercise,
  value,
  onChange,
  onRemove,
  onMetaChange,
}) {
  const setCount = parseSetCount(exercise.target_sets);
  const mode = exercise.logging_mode || 'weighted_sets';
  const showSets = mode !== 'completion_only';

  const sets = useMemo(() => {
    if (!showSets) return [];
    const current = value.sets || [];
    if (current.length === setCount) return current;
    const next = emptySets(setCount);
    for (let i = 0; i < Math.min(current.length, setCount); i++) {
      next[i] = { ...next[i], ...current[i], setNumber: i + 1 };
    }
    return next;
  }, [value.sets, setCount, showSets]);

  const update = (patch) => onChange({ ...value, ...patch });

  const handleSetChange = (index, setValue) => {
    const next = [...sets];
    next[index] = setValue;
    update({ sets: next });
  };

  const handleModeChange = (loggingMode) => {
    onMetaChange?.({ logging_mode: loggingMode, target_sets: exercise.target_sets });
    onChange({
      completed: value.completed ?? false,
      variantKey: null,
      sets: loggingMode === 'completion_only' ? [] : emptySets(setCount),
    });
  };

  const handleSetsCountChange = (count) => {
    const n = Math.max(1, Number(count) || 1);
    onMetaChange?.({ target_sets: String(n) });
    const next = emptySets(n).map((row, i) => ({
      ...row,
      ...(value.sets?.[i] || {}),
      setNumber: i + 1,
    }));
    onChange({ ...value, sets: mode === 'completion_only' ? [] : next });
  };

  return (
    <div className={`exercise adhoc-exercise${value.completed ? ' exercise--done' : ''}`}>
      <div className="exercise__head">
        <div className="adhoc-exercise__fields">
          <input
            className="select"
            value={exercise.name}
            onChange={(e) => onMetaChange?.({ name: e.target.value })}
            placeholder="Exercise name"
          />
          <select
            className="select"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value)}
          >
            {LOGGING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {showSets && (
            <input
              className="select adhoc-exercise__sets-input"
              type="number"
              min={1}
              value={setCount}
              onChange={(e) => handleSetsCountChange(e.target.value)}
              aria-label="Number of sets"
            />
          )}
        </div>
        <button
          type="button"
          className={`exercise__check${value.completed ? ' exercise__check--on' : ''}`}
          onClick={() => update({ completed: !value.completed })}
          aria-label="Mark complete"
        >
          {value.completed && <CheckIcon width={16} height={16} />}
        </button>
      </div>

      {showSets && (
        <div className="exercise__body">
          <div className="exercise__sets">
            {sets.map((set, i) => (
              <SetRow
                key={set.setNumber}
                setNumber={set.setNumber}
                mode={resolveLoggingMode(exercise, null)}
                value={set}
                onChange={(v) => handleSetChange(i, v)}
              />
            ))}
          </div>
        </div>
      )}

      {onRemove && (
        <button type="button" className="adhoc-exercise__remove" onClick={onRemove}>
          Remove exercise
        </button>
      )}
    </div>
  );
}
