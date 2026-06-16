import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import { Card } from '../components/Cards.jsx';
import { ChevronLeftIcon } from '../components/Icons.jsx';

function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSet(set) {
  const parts = [];
  if (set.weightLbs != null) parts.push(`${set.weightLbs} lbs`);
  if (set.reps != null) parts.push(`${set.reps} reps`);
  if (set.assistedBand) parts.push('band');
  return parts.length ? parts.join(' × ') : '—';
}

function formatLogSummary(log) {
  if (log.sets?.length) {
    return log.sets.map((s) => `Set ${s.setNumber}: ${formatSet(s)}`).join(' · ');
  }
  if (log.weight_lbs != null || log.reps != null) {
    return formatSet({
      weightLbs: log.weight_lbs != null ? Number(log.weight_lbs) : null,
      reps: log.reps != null ? Number(log.reps) : null,
      assistedBand: false,
    });
  }
  return log.completed ? 'Done' : '—';
}

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .session(id)
      .then((s) => active && setSession(s))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id]);

  const back = (
    <button onClick={() => navigate(-1)} aria-label="Back" style={{ display: 'flex', color: 'var(--text-secondary)' }}>
      <ChevronLeftIcon width={24} height={24} />
    </button>
  );

  return (
    <>
      <TopNav title="Workout" left={back} />
      <div className="screen">
        {error && <div className="empty">{error}</div>}
        {!session && !error && <div className="spinner" />}
        {session && (
          <>
            <h1 className="heading" style={{ marginTop: 12 }}>
              {session.display_title || session.title || `Day ${session.day_number}`}
            </h1>
            <p className="subtitle">{formatDate(session.workout_date)}</p>

            <div className="section">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate(`/history/${id}/edit`)}
              >
                Edit workout
              </button>
            </div>

            <div className="section">
              <Card className="stats-card">
                <div className="stat">
                  <div className="stat__value">{session.exertion ? `${session.exertion}/5` : '—'}</div>
                  <div className="stat__label">Effort</div>
                </div>
                <div className="stat">
                  <div className="stat__value">{session.logs.length}</div>
                  <div className="stat__label">Exercises</div>
                </div>
                <div className="stat">
                  <div className="stat__value">{session.logs.filter((l) => l.completed).length}</div>
                  <div className="stat__label">Completed</div>
                </div>
              </Card>
            </div>

            <div className="section">
              <p className="section-label">Exercises</p>
              <Card>
                {session.logs.map((log) => (
                  <div className="detail-row detail-row--stacked" key={log.id}>
                    <span className="detail-row__label">{log.exercise_name}</span>
                    <span className="detail-row__value">{formatLogSummary(log)}</span>
                  </div>
                ))}
              </Card>
            </div>

            {session.session_notes && (
              <div className="section">
                <p className="section-label">Notes</p>
                <Card>
                  <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {session.session_notes}
                  </p>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
