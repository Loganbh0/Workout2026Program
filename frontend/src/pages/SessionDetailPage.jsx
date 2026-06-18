import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import SessionLogSummary from '../components/SessionLogSummary.jsx';
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
              <SessionLogSummary session={session} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
