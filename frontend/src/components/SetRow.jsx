import './SetRow.css';

export default function SetRow({ setNumber, mode, value, onChange }) {
  const update = (patch) => onChange({ ...value, ...patch });

  if (mode === 'completion_only') return null;

  const showWeight = mode === 'weighted_sets';
  const showReps = mode === 'weighted_sets' || mode === 'bodyweight_sets';
  const showBand = mode === 'bodyweight_sets';
  const showTime = mode === 'bodyweight_time_sets';
  const showDistance = mode === 'bodyweight_distance_sets';

  const totalSec = value.durationSeconds;
  const minDisplay = totalSec != null ? Math.floor(totalSec / 60) : '';
  const secDisplay = totalSec != null ? totalSec % 60 : '';

  const updateTime = (minutesRaw, secondsRaw) => {
    const minutesEmpty = minutesRaw === '';
    const secondsEmpty = secondsRaw === '';
    if (minutesEmpty && secondsEmpty) {
      update({ durationSeconds: null });
      return;
    }
    const minutes = minutesEmpty ? 0 : Number(minutesRaw);
    const seconds = secondsEmpty ? 0 : Number(secondsRaw);
    update({ durationSeconds: minutes * 60 + seconds });
  };

  let inputClass = '';
  if (showReps && !showWeight) inputClass = ' set-row__inputs--reps-only';
  else if (showTime) inputClass = ' set-row__inputs--time';
  else if (showDistance) inputClass = ' set-row__inputs--distance';

  return (
    <div className="set-row">
      <span className="set-row__label">Set {setNumber}</span>
      <div className={`set-row__inputs${inputClass}`}>
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
        {showTime && (
          <>
            <label className="field">
              <span className="field__label">Min</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                placeholder="—"
                value={minDisplay}
                onChange={(e) => updateTime(e.target.value, secDisplay)}
              />
            </label>
            <label className="field">
              <span className="field__label">Sec</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                step="1"
                placeholder="—"
                value={secDisplay}
                onChange={(e) => updateTime(minDisplay, e.target.value)}
              />
            </label>
          </>
        )}
        {showDistance && (
          <label className="field set-row__distance">
            <span className="field__label">Distance</span>
            <div className="set-row__distance-input">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                placeholder="—"
                value={value.distanceYd ?? ''}
                onChange={(e) =>
                  update({ distanceYd: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
              <span className="set-row__unit">yd</span>
            </div>
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
