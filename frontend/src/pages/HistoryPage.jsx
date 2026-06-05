import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import { ChevronRightIcon } from '../components/Icons.jsx';

function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .sessions()
      .then((s) => active && setSessions(s))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <TopNav title="History" />
      <div className="screen">
        <h1 className="heading" style={{ marginTop: 12 }}>History</h1>
        <p className="subtitle">Every session you’ve logged.</p>

        <div className="section">
          {error && <div className="empty">{error}</div>}
          {!sessions && !error && <div className="spinner" />}
          {sessions && sessions.length === 0 && (
            <div className="empty">No workouts logged yet.<br />Your first session will show up here.</div>
          )}
          {sessions && sessions.length > 0 && (
            <div className="stack">
              {sessions.map((s) => (
                <Link key={s.id} to={`/history/${s.id}`} className="history-row">
                  <div>
                    <div className="history-row__title">{s.title || `Day ${s.day_number}`}</div>
                    <div className="history-row__meta">
                      {formatDate(s.workout_date)} · {s.exercise_count} exercises
                      {s.exertion ? ` · Effort ${s.exertion}/5` : ''}
                    </div>
                  </div>
                  <ChevronRightIcon width={20} height={20} className="dim" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
