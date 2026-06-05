import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import FolderCard from '../components/FolderCard.jsx';

export default function HomePage() {
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

  return (
    <>
      <TopNav title="Home" />
      <div className="screen">
        <h1 className="heading" style={{ marginTop: 12 }}>Programs</h1>
        <p className="subtitle">Your workout plans and folders.</p>

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
