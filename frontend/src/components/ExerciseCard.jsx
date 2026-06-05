import { CheckIcon } from './Icons.jsx';
import './ExerciseCard.css';

function targetText(ex) {
  const sets = ex.target_sets;
  const reps = ex.target_reps;
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return sets;
  if (reps) return reps;
  return null;
}

export default function ExerciseCard({ exercise, value, onChange }) {
  const target = targetText(exercise);
  const tracksWeight = exercise.tracks_weight;

  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className={`exercise${value.completed ? ' exercise--done' : ''}`}>
      <div className="exercise__head">
        <div className="exercise__title">
          <span className="exercise__name">{exercise.name}</span>
          {exercise.is_priority && <span className="exercise__badge">Priority</span>}
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

      {(target || exercise.notes_hint) && (
        <div className="exercise__meta">
          {target && <span className="exercise__target">{target}</span>}
          {exercise.notes_hint && <span className="exercise__hint">{exercise.notes_hint}</span>}
        </div>
      )}

      {tracksWeight && (
        <div className="exercise__inputs">
          <label className="field">
            <span className="field__label">Weight (lbs)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              placeholder="—"
              value={value.weightLbs ?? ''}
              onChange={(e) =>
                update({ weightLbs: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Reps</span>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="—"
              value={value.reps ?? ''}
              onChange={(e) =>
                update({ reps: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}
