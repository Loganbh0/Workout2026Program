import { useNavigate } from 'react-router-dom';
import { Card } from './Cards.jsx';
import { formatSetSummary } from '../workoutHelpers.js';
import './SessionLogSummary.css';

function normalizeSet(set) {
  return {
    weightLbs: set.weightLbs ?? (set.weight_lbs != null ? Number(set.weight_lbs) : null),
    reps: set.reps != null ? Number(set.reps) : null,
    durationSeconds:
      set.durationSeconds ?? (set.duration_seconds != null ? Number(set.duration_seconds) : null),
    distanceYd: set.distanceYd ?? (set.distance_yd != null ? Number(set.distance_yd) : null),
    assistedBand: Boolean(set.assistedBand ?? set.assisted_band),
  };
}

export function formatLogSummary(log) {
  if (log.sets?.length) {
    return log.sets
      .map((s) => {
        const num = s.setNumber ?? s.set_number;
        return `Set ${num}: ${formatSetSummary(normalizeSet(s))}`;
      })
      .join(' · ');
  }
  if (log.weight_lbs != null || log.reps != null) {
    return formatSetSummary({
      weightLbs: log.weight_lbs != null ? Number(log.weight_lbs) : null,
      reps: log.reps != null ? Number(log.reps) : null,
      assistedBand: false,
    });
  }
  return log.completed ? 'Done' : '—';
}

export default function SessionLogSummary({ session, showEdit = false, compact = false }) {
  const navigate = useNavigate();
  const title =
    session.display_title || session.title || `Day ${session.day_number}`;

  return (
    <div className={`session-log${compact ? ' session-log--compact' : ''}`}>
      <div className="session-log__head">
        <div>
          <p className="session-log__title">{title}</p>
          {session.session_type === 'adhoc' && (
            <span className="session-log__tag">One-off</span>
          )}
        </div>
        {showEdit && session.id != null && (
          <button
            type="button"
            className="session-log__edit"
            onClick={() => navigate(`/history/${session.id}/edit`)}
          >
            Edit
          </button>
        )}
      </div>

      <Card className="stats-card session-log__stats">
        <div className="stat">
          <div className="stat__value">{session.exertion ? `${session.exertion}/5` : '—'}</div>
          <div className="stat__label">Effort</div>
        </div>
        <div className="stat">
          <div className="stat__value">{session.logs?.length ?? 0}</div>
          <div className="stat__label">Exercises</div>
        </div>
        <div className="stat">
          <div className="stat__value">
            {session.logs?.filter((l) => l.completed).length ?? 0}
          </div>
          <div className="stat__label">Completed</div>
        </div>
      </Card>

      <Card>
        {(session.logs || []).map((log) => (
          <div className="detail-row detail-row--stacked" key={log.id ?? log.exercise_name}>
            <span className="detail-row__label">{log.exercise_name}</span>
            <span className="detail-row__value">{formatLogSummary(log)}</span>
          </div>
        ))}
      </Card>

      {session.session_notes && (
        <div className="session-log__notes">
          <p className="section-label">Notes</p>
          <Card>
            <p className="session-log__notes-text">{session.session_notes}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
