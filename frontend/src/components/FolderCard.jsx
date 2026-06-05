import { Link } from 'react-router-dom';
import './FolderCard.css';

export default function FolderCard({ program }) {
  const dayLabel = program.dayCount === 1 ? '1 day' : `${program.dayCount} days`;

  return (
    <Link to={`/programs/${program.id}`} className="folder-card">
      <div className="folder-card__tab" aria-hidden />
      <div className="folder-card__body">
        <span className="folder-card__name">{program.displayName}</span>
        <span className="folder-card__meta">{dayLabel}</span>
        {program.isActive && <span className="folder-card__badge">Active</span>}
      </div>
    </Link>
  );
}
