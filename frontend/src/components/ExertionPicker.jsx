import './ExertionPicker.css';

const LABELS = { 1: 'Easy', 2: 'Light', 3: 'Moderate', 4: 'Hard', 5: 'Max' };

export default function ExertionPicker({ value, onChange }) {
  return (
    <div>
      <div className="exertion">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`exertion__pill${value === n ? ' exertion__pill--active' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`Effort ${n} of 5`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="exertion__caption">
        {value ? `${value}/5 · ${LABELS[value]}` : 'Tap to rate effort'}
      </div>
    </div>
  );
}
