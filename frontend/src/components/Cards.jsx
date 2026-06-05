export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function ProgressCard({ label = 'Progress', count, value = 0 }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <Card className="progress-card">
      <div className="progress-card__head">
        <span className="progress-card__label">{label}</span>
        {count && <span className="progress-card__count">{count}</span>}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </Card>
  );
}

export function StatsCard({ stats }) {
  return (
    <Card className="stats-card">
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <div className="stat__value">{s.value}</div>
          <div className="stat__label">{s.label}</div>
        </div>
      ))}
    </Card>
  );
}

export function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{value}</span>
    </div>
  );
}
