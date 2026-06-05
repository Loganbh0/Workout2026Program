import './VariantPicker.css';

export default function VariantPicker({ options, value, onChange }) {
  if (!options?.length) return null;

  return (
    <div className="variant-picker" role="group" aria-label="Exercise variant">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`variant-picker__btn${value === opt.key ? ' variant-picker__btn--on' : ''}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
