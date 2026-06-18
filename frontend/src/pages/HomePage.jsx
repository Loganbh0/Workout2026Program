import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import { PlusIcon } from '../components/Icons.jsx';
import FolderCard from '../components/FolderCard.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .programs()
      .then((list) => active && setPrograms(list))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  const addButton = (
    <button
      type="button"
      onClick={() => navigate('/programs/new')}
      aria-label="Create program"
      style={{ display: 'flex', color: 'var(--text-secondary)' }}
    >
      <PlusIcon width={22} height={22} />
    </button>
  );

  return (
    <>
      <TopNav title="Plans" right={addButton} />
      <div className="screen">
        <h1 className="heading" style={{ marginTop: 12 }}>Plans</h1>
        <p className="subtitle">Optional workout programs — Today works without one.</p>

        {error && <div className="empty">{error}</div>}
        {!programs && !error && <div className="spinner" />}

        {programs && (
          <div className="section">
            <div className="folder-grid">
              {programs.map((p) => (
                <FolderCard key={p.id} program={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
