import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import './WorkoutCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function padIso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ key: `pad-${i}`, empty: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      key: padIso(year, month, day),
      empty: false,
      day,
      iso: padIso(year, month, day),
    });
  }
  return cells;
}

export default function WorkoutCalendar({ scope }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [workoutDates, setWorkoutDates] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setWorkoutDates(null);
    setError(null);
    api
      .activityCalendar(viewYear, viewMonth, scope)
      .then((data) => {
        if (!active) return;
        setWorkoutDates(new Set(data.dates || []));
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [viewYear, viewMonth, scope]);

  const cells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const todayIso = padIso(now.getFullYear(), now.getMonth() + 1, now.getDate());

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }

  return (
    <div className="workout-calendar">
      <div className="workout-calendar__head">
        <button
          type="button"
          className="workout-calendar__nav"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="workout-calendar__title">{monthLabel}</span>
        <button
          type="button"
          className="workout-calendar__nav"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="workout-calendar__weekdays">
        {WEEKDAYS.map((label) => (
          <span key={label} className="workout-calendar__weekday">
            {label}
          </span>
        ))}
      </div>

      {error && <p className="workout-calendar__error">{error}</p>}

      <div className="workout-calendar__grid" aria-busy={workoutDates === null}>
        {cells.map((cell) => {
          if (cell.empty) {
            return <span key={cell.key} className="workout-calendar__cell workout-calendar__cell--empty" />;
          }
          const hasWorkout = workoutDates?.has(cell.iso);
          const isToday = cell.iso === todayIso;
          return (
            <span
              key={cell.key}
              className={[
                'workout-calendar__cell',
                hasWorkout ? 'workout-calendar__cell--workout' : '',
                isToday ? 'workout-calendar__cell--today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {cell.day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
