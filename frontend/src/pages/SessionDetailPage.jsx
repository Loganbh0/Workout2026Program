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
            <h1 className="heading" style={{ marginTop: 12 }}>{session.title || `Day ${session.day_number}`}</h1>
            <p className="subtitle">{formatDate(session.workout_date)}</p>

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
                  <div className="detail-row" key={log.id}>
                    <span className="detail-row__label">{log.exercise_name}</span>
                    <span className="detail-row__value">
                      {log.weight_lbs != null || log.reps != null
                        ? `${log.weight_lbs != null ? `${log.weight_lbs} lbs` : ''}${
                            log.weight_lbs != null && log.reps != null ? ' × ' : ''
                          }${log.reps != null ? `${log.reps} reps` : ''}`
                        : log.completed
                        ? 'Done'
                        : '—'}
                    </span>
                  </div>
                ))}
              </Card>
            </div>

            {session.session_notes && (
              <div className="section">
                <p className="section-label">Notes</p>
                <Card>
                  <p style={{ margin: 0 }} className="muted">{session.session_notes}</p>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
