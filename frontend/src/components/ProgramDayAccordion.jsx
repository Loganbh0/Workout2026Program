import { useState } from 'react';
import { ChevronDownIcon } from './Icons.jsx';
import './ProgramDayAccordion.css';

const WEEKDAY_LABEL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

const MODE_LABEL = {
  weighted_sets: 'Weight + reps',
  bodyweight_sets: 'Bodyweight reps',
  completion_only: 'Completion',
  variant: 'Variant',
};

function targetText(ex) {
  const sets = ex.targetSets;
  const reps = ex.targetReps;
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return `${sets} sets`;
  if (reps) return reps;
  return '—';
}

export default function ProgramDayAccordion({ day }) {
  const [expanded, setExpanded] = useState(false);
  const exercises = day.exercises || [];

  return (
    <div className={`day-accordion${expanded ? ' day-accordion--open' : ''}`}>
      <button
        type="button"
        className="day-accordion__head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="day-accordion__info">
          <span className="day-accordion__label">
            {WEEKDAY_LABEL[day.weekday] || day.weekday} · Day {day.dayNumber}
          </span>
          <span className="day-accordion__title">{day.title}</span>
          {day.subtitle && <span className="day-accordion__subtitle">{day.subtitle}</span>}
          <span className="day-accordion__meta">
            {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
          </span>
        </div>
        <ChevronDownIcon
          width={20}
          height={20}
          className={`day-accordion__chevron${expanded ? ' day-accordion__chevron--open' : ''}`}
        />
      </button>

      {expanded && (
        <div className="day-accordion__body">
          <div className="day-accordion__table-head">
            <span>Exercise</span>
            <span>Target</span>
            <span>Type</span>
          </div>
          {exercises.map((ex) => (
            <div className="day-accordion__row" key={ex.id || `${ex.name}-${ex.sortOrder}`}>
              <span className="day-accordion__ex-name">{ex.name}</span>
              <span className="day-accordion__ex-target">{targetText(ex)}</span>
              <span className="day-accordion__ex-mode">
                {MODE_LABEL[ex.loggingMode] || ex.loggingMode}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
