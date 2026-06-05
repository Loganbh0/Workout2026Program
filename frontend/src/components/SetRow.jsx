import './SetRow.css';

export default function SetRow({ setNumber, mode, value, onChange }) {
  const update = (patch) => onChange({ ...value, ...patch });

  if (mode === 'completion_only') return null;

  const showWeight = mode === 'weighted_sets';
  const showReps = mode === 'weighted_sets' || mode === 'bodyweight_sets';
  const showBand = mode === 'bodyweight_sets';

  return (
    <div className="set-row">
      <span className="set-row__label">Set {setNumber}</span>
      <div className={`set-row__inputs${showWeight ? '' : ' set-row__inputs--reps-only'}`}>
        {showWeight && (
          <label className="field">
            <span className="field__label">Weight</span>
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
        )}
        {showReps && (
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
        )}
        {showBand && (
          <label className="set-row__band">
            <input
              type="checkbox"
              checked={Boolean(value.assistedBand)}
              onChange={(e) => update({ assistedBand: e.target.checked })}
            />
            <span>Band</span>
          </label>
        )}
      </div>
    </div>
  );
}
