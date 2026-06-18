import { useMemo } from 'react';
import ExerciseCard from './ExerciseCard.jsx';
import AdHocExerciseCard from './AdHocExerciseCard.jsx';
import ExertionPicker from './ExertionPicker.jsx';
import { ProgressCard } from './Cards.jsx';
import { CheckIcon } from './Icons.jsx';
import { formatStartLabel } from '../workoutHelpers.js';

export default function WorkoutForm({
  title,
  subtitle,
  icon,
  stats,
  showProgress = true,
  exercises,
  values,
  onExerciseChange,
  onExerciseMetaChange,
  onRemoveExercise,
  onAddExercise,
  exertion,
  onExertionChange,
  notes,
  onNotesChange,
  onSave,
  saving,
  saveLabel = 'Save Workout',
  error,
  footer,
  showLoggingFields = true,
  emptyAddCard = false,
}) {
  const grouped = useMemo(() => {
    const groups = [];
    let current = null;
    for (const ex of exercises) {
      const block = ex.block || null;
      if (!current || current.block !== block) {
        current = { block, items: [] };
        groups.push(current);
      }
      current.items.push(ex);
    }
    return groups;
  }, [exercises]);

  const checkIns = stats?.checkIns ?? 0;
  const totalWorkouts = stats?.totalWorkouts ?? 40;
  const completion = stats?.completion ?? 0;
  const progressLabel =
    stats?.programStatus === 'pending' && stats?.startDate
      ? formatStartLabel(stats.startDate)
      : stats?.currentWeek
      ? `Week ${stats.currentWeek} of ${stats.durationWeeks}`
      : 'Progress';

  return (
    <>
      {icon}
      {title && <h1 className="heading">{title}</h1>}
      {subtitle && <p className="subtitle">{subtitle}</p>}

      {showProgress && stats && (
        <div className="section">
          <ProgressCard
            label={progressLabel}
            count={`${checkIns}/${totalWorkouts} workouts`}
            value={completion}
          />
        </div>
      )}

      <div className="section">
        <p className="section-label">Exercises</p>
        {exercises.length === 0 && onAddExercise && emptyAddCard ? (
          <button type="button" className="add-exercise-card" onClick={onAddExercise}>
            Add exercise
          </button>
        ) : (
          <>
            <div className="stack">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  {group.block && <div className="block-label">{group.block}</div>}
                  <div className="stack">
                    {group.items.map((ex) =>
                      ex.isAdHoc ? (
                        <AdHocExerciseCard
                          key={ex.id}
                          exercise={ex}
                          value={values[ex.id] || { completed: false, variantKey: null, sets: [] }}
                          onChange={(v) => onExerciseChange(ex.id, v)}
                          onRemove={onRemoveExercise ? () => onRemoveExercise(ex.id) : undefined}
                          onMetaChange={(patch) => onExerciseMetaChange?.(ex.id, patch)}
                        />
                      ) : (
                        <div key={ex.id} className="exercise-row">
                          <ExerciseCard
                            exercise={ex}
                            value={
                              values[ex.id] || {
                                completed: false,
                                variantKey: null,
                                sets: [],
                              }
                            }
                            onChange={(v) => onExerciseChange(ex.id, v)}
                          />
                          {onRemoveExercise && (
                            <button
                              type="button"
                              className="exercise-row__remove"
                              onClick={() => onRemoveExercise(ex.id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
            {onAddExercise && (
              <button type="button" className="btn btn--secondary" style={{ marginTop: 12 }} onClick={onAddExercise}>
                Add exercise
              </button>
            )}
          </>
        )}
      </div>

      {showLoggingFields && (
        <>
          <div className="section">
            <p className="section-label">Effort</p>
            <ExertionPicker value={exertion} onChange={onExertionChange} />
          </div>

          <div className="section">
            <p className="section-label">Notes</p>
            <textarea
              className="notes"
              placeholder="How did it feel? PRs, energy, soreness…"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
            />
          </div>

          {error && <div className="empty" style={{ paddingBottom: 0 }}>{error}</div>}

          {onSave && (
            <div className="section">
              <button type="button" className="btn" onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : saveLabel}
              </button>
            </div>
          )}
        </>
      )}

      {!showLoggingFields && error && (
        <div className="empty" style={{ paddingBottom: 0 }}>{error}</div>
      )}

      {footer}
    </>
  );
}

export function WorkoutSavedButton({ saving, onClick }) {
  return (
    <button type="button" className="btn btn--done" onClick={onClick} disabled={saving}>
      <CheckIcon width={20} height={20} /> {saving ? 'Saving…' : 'Workout Saved'}
    </button>
  );
}
