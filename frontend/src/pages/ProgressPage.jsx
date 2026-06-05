import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import ScopeToggle from '../components/ScopeToggle.jsx';
import { Card } from '../components/Cards.jsx';

function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const axisStyle = { fontSize: 11, fill: '#6e6e73' };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#1c1c1e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '8px 10px',
        fontSize: 12,
      }}
    >
      <div style={{ color: '#a1a1a6', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: '#fff' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  const [scope, setScope] = useState('active');
  const [exercises, setExercises] = useState(null);
  const [selected, setSelected] = useState('');
  const [series, setSeries] = useState(null);
  const [error, setError] = useState(null);

  const selectedMeta = useMemo(
    () => exercises?.find((e) => e.name === selected),
    [exercises, selected]
  );

  const showWeightChart = useMemo(() => {
    if (!selectedMeta || !series?.length) return false;
    if (selectedMeta.loggingMode === 'bodyweight_sets') return false;
    if (selectedMeta.loggingMode === 'weighted_sets') return true;
    return series.some((r) => r.weight != null);
  }, [selectedMeta, series]);

  useEffect(() => {
    let active = true;
    setExercises(null);
    setSelected('');
    api
      .exercises(scope)
      .then((list) => {
        if (!active) return;
        setExercises(list);
        if (list.length) setSelected(list[0].name);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [scope]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setSeries(null);
    api
      .exerciseProgress(selected, scope)
      .then((rows) => {
        if (!active) return;
        setSeries(
          rows.map((r) => ({
            date: formatDate(r.workout_date),
            weight: r.weight_lbs != null ? Number(r.weight_lbs) : null,
            reps: r.reps != null ? Number(r.reps) : null,
            exertion: r.exertion != null ? Number(r.exertion) : null,
          }))
        );
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [selected, scope]);

  return (
    <>
      <TopNav title="Progress" />
      <div className="screen">
        <h1 className="heading" style={{ marginTop: 12 }}>Progress</h1>
        <p className="subtitle">Track your trends over time.</p>
        <ScopeToggle value={scope} onChange={setScope} />

        {error && <div className="empty">{error}</div>}

        {exercises && exercises.length === 0 && (
          <div className="empty">No data yet.<br />Log a few workouts to see your trends.</div>
        )}

        {exercises && exercises.length > 0 && (
          <>
            <div className="section">
              <select
                className="select"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {exercises.map((ex) => (
                  <option key={ex.name} value={ex.name}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            {!series && <div className="spinner" />}

            {series && series.length === 0 && (
              <div className="empty">No entries for this exercise yet.</div>
            )}

            {series && series.length > 0 && (
              <>
                {showWeightChart && (
                  <Chart title="Weight (lbs)" data={series} dataKey="weight" name="Weight" />
                )}
                <Chart title="Reps" data={series} dataKey="reps" name="Reps" />
                <Chart title="Effort (1–5)" data={series} dataKey="exertion" name="Effort" domain={[0, 5]} />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Chart({ title, data, dataKey, name, domain }) {
  return (
    <Card className="chart-card">
      <p className="chart-card__title">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#2a2a2c" vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={domain || ['auto', 'auto']} width={42} />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke="#ffffff"
            strokeWidth={2}
            dot={{ r: 3, fill: '#ffffff' }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
