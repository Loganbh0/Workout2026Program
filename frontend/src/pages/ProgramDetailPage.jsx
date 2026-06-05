import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import { Card } from '../components/Cards.jsx';
import { ChevronLeftIcon, PencilIcon } from '../components/Icons.jsx';

const WEEKDAY_LABEL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export default function ProgramDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [error, setError] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .program(id)
      .then((p) => {
        if (!active) return;
        setProgram(p);
        setNameDraft(p.displayName);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id]);

  const back = (
    <button
      type="button"
      onClick={() => navigate('/')}
      aria-label="Back"
      style={{ display: 'flex', color: 'var(--text-secondary)' }}
    >
      <ChevronLeftIcon width={24} height={24} />
    </button>
  );

  async function handleRename() {
    if (!nameDraft.trim() || nameDraft === program.displayName) {
      setRenaming(false);
      return;
    }
    try {
      const updated = await api.updateProgram(id, { displayName: nameDraft.trim() });
      setProgram((prev) => ({ ...prev, ...updated }));
      setRenaming(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleActivate() {
    setActivating(true);
    setError(null);
    try {
      const updated = await api.activateProgram(id);
      setProgram(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setActivating(false);
    }
  }

  const pencil = (
    <button
      type="button"
      onClick={() => setRenaming(true)}
      aria-label="Rename program"
      style={{ display: 'flex', color: 'var(--text-secondary)' }}
    >
      <PencilIcon width={20} height={20} />
    </button>
  );

  return (
    <>
      <TopNav title="Program" left={back} right={pencil} />
      <div className="screen">
        {error && <div className="empty">{error}</div>}
        {!program && !error && <div className="spinner" />}

        {program && (
          <>
            {renaming ? (
              <div className="section" style={{ marginTop: 12 }}>
                <input
                  className="select"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="button" className="btn" onClick={handleRename}>
                    Save name
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => {
                      setNameDraft(program.displayName);
                      setRenaming(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <h1 className="heading" style={{ marginTop: 12 }}>{program.displayName}</h1>
            )}

            <p className="subtitle">
              {program.durationWeeks} weeks · {program.sessionsPerWeek} sessions/week
            </p>

            <div className="section">
              <button
                type="button"
                className={`btn${program.isActive ? ' btn--muted' : ''}`}
                disabled={program.isActive || activating}
                onClick={handleActivate}
              >
                {program.isActive ? 'ACTIVE' : activating ? 'Activating…' : 'ACTIVATE'}
              </button>
            </div>

            <div className="section">
              <p className="section-label">Weekly plan</p>
              <Card>
                {program.days.map((day) => (
                  <div className="detail-row detail-row--stacked" key={day.id}>
                    <span className="detail-row__label">
                      {WEEKDAY_LABEL[day.weekday] || day.weekday} · Day {day.dayNumber}
                    </span>
                    <span className="detail-row__value">
                      {day.title}
                      {day.subtitle ? ` — ${day.subtitle}` : ''}
                      {day.exerciseCount ? ` (${day.exerciseCount} exercises)` : ''}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
