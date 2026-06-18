import { useEffect, useState } from 'react';
import { api } from '../api.js';
import SessionLogSummary from './SessionLogSummary.jsx';
import './DayWorkoutPanel.css';

function formatDayHeading(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DayWorkoutPanel({ date, scope }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date) return;
    let active = true;
    setData(null);
    setError(null);
    api
      .activityDay(date, scope)
      .then((res) => active && setData(res))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [date, scope]);

  if (!date) return null;

  return (
    <div className="day-workout-panel">
      <p className="section-label">{formatDayHeading(date)}</p>
      {error && <div className="empty">{error}</div>}
      {!data && !error && <div className="spinner" />}
      {data && data.sessions.length === 0 && (
        <div className="empty">No workouts found for this day.</div>
      )}
      {data?.sessions.map((session) => (
        <SessionLogSummary key={session.id} session={session} showEdit compact />
      ))}
    </div>
  );
}
