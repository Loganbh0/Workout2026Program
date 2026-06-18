import { useCallback, useState } from 'react';
import StartDateWheel from './StartDateWheel.jsx';
import { localIsoDate } from '../api.js';

export default function StartDateModal({
  open,
  onClose,
  onConfirm,
  loading,
  title = 'Start date',
  subtitle = 'When should this program begin?',
  confirmLabel = 'Activate',
}) {
  const [startDate, setStartDate] = useState(localIsoDate());

  const handleChange = useCallback((iso) => {
    setStartDate(iso);
  }, []);

  if (!open) return null;

  return (
    <div className="date-wheel-modal" role="dialog" aria-modal="true" aria-labelledby="start-date-title">
      <div className="date-wheel-modal__sheet">
        <h2 id="start-date-title" className="date-wheel-modal__title">{title}</h2>
        <p className="date-wheel-modal__subtitle">{subtitle}</p>
        <StartDateWheel value={startDate} onChange={handleChange} />
        <div className="date-wheel-modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onConfirm(startDate)}
            disabled={loading}
          >
            {loading ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
