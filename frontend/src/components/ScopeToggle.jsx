import './ScopeToggle.css';

export default function ScopeToggle({ value, onChange }) {
  return (
    <div className="scope-toggle" role="group" aria-label="Data scope">
      <button
        type="button"
        className={`scope-toggle__btn${value === 'active' ? ' scope-toggle__btn--on' : ''}`}
        onClick={() => onChange('active')}
      >
        For active plan
      </button>
      <button
        type="button"
        className={`scope-toggle__btn${value === 'all' ? ' scope-toggle__btn--on' : ''}`}
        onClick={() => onChange('all')}
      >
        All time
      </button>
    </div>
  );
}
