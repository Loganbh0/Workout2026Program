import { useMemo, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from './Icons.jsx';
import SetRow from './SetRow.jsx';
import VariantPicker from './VariantPicker.jsx';
import { parseSetCount, emptySets, resolveLoggingMode } from '../setCount.js';
import './ExerciseCard.css';

function targetText(ex) {
  const sets = ex.target_sets;
  const reps = ex.target_reps;
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return sets;
  if (reps) return reps;
  return null;
}

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

export default function ExerciseCard({ exercise, value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const target = targetText(exercise);
  const variantOptions = normalizeVariantOptions(exercise);
  const setCount = parseSetCount(exercise.target_sets);
  const mode = resolveLoggingMode(exercise, value.variantKey);
  const showSets = mode !== 'completion_only';
  const canExpand = showSets || exercise.logging_mode === 'variant';

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

  const handleVariantChange = (variantKey) => {
    onChange({
      completed: value.completed ?? false,
      variantKey,
      sets: emptySets(setCount),
    });
  };

  const handleSetChange = (index, setValue) => {
    const next = [...sets];
    next[index] = setValue;
    update({ sets: next });
  };

  const panelId = `exercise-panel-${exercise.id}`;

  return (
    <div className={`exercise${value.completed ? ' exercise--done' : ''}${expanded ? ' exercise--open' : ''}`}>
      <div className="exercise__head">
        {canExpand ? (
          <button
            type="button"
            className="exercise__toggle"
            onClick={() => setExpanded((o) => !o)}
            aria-expanded={expanded}
            aria-controls={panelId}
          >
            <div className="exercise__title">
              <span className="exercise__name">{exercise.name}</span>
              {exercise.is_priority && <span className="exercise__badge">Priority</span>}
            </div>
            {(target || exercise.notes_hint) && (
              <div className="exercise__meta">
                {target && <span className="exercise__target">{target}</span>}
                {exercise.notes_hint && <span className="exercise__hint">{exercise.notes_hint}</span>}
              </div>
            )}
            <ChevronDownIcon
              className={`exercise__chevron${expanded ? ' exercise__chevron--open' : ''}`}
              width={18}
              height={18}
            />
          </button>
        ) : (
          <div className="exercise__toggle exercise__toggle--static">
            <div className="exercise__title">
              <span className="exercise__name">{exercise.name}</span>
              {exercise.is_priority && <span className="exercise__badge">Priority</span>}
            </div>
            {(target || exercise.notes_hint) && (
              <div className="exercise__meta">
                {target && <span className="exercise__target">{target}</span>}
                {exercise.notes_hint && <span className="exercise__hint">{exercise.notes_hint}</span>}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className={`exercise__check${value.completed ? ' exercise__check--on' : ''}`}
          onClick={() => update({ completed: !value.completed })}
          aria-label="Mark complete"
        >
          {value.completed && <CheckIcon width={16} height={16} />}
        </button>
      </div>

      {canExpand && expanded && (
        <div className="exercise__body" id={panelId}>
          {exercise.logging_mode === 'variant' && (
            <VariantPicker
              options={variantOptions}
              value={value.variantKey || variantOptions[0]?.key}
              onChange={handleVariantChange}
            />
          )}

          {showSets && (
            <div className="exercise__sets">
              {sets.map((set, i) => (
                <SetRow
                  key={set.setNumber}
                  setNumber={set.setNumber}
                  mode={mode}
                  value={set}
                  onChange={(v) => handleSetChange(i, v)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
