import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card } from './Cards.jsx';
import { formatDuration } from '../workoutHelpers.js';

const axisStyle = { fontSize: 11, fill: '#6e6e73' };

function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChartTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tooltip__value">
          {p.name}: {formatValue ? formatValue(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

function Chart({ title, data, dataKey, name, domain, formatValue, tickFormatter }) {
  return (
    <Card className="chart-card">
      <p className="chart-card__title">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#2a2a2c" vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            domain={domain || ['auto', 'auto']}
            width={42}
            tickFormatter={tickFormatter}
          />
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
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

export default function ExerciseProgressCharts({ exerciseName, loggingMode, series, loading }) {
  const chartData = useMemo(
    () =>
      (series || []).map((r) => ({
        date: formatDate(r.workout_date),
        weight: r.weight_lbs != null ? Number(r.weight_lbs) : null,
        reps: r.reps != null ? Number(r.reps) : null,
        duration: r.duration_seconds != null ? Number(r.duration_seconds) : null,
        distance: r.distance_yd != null ? Number(r.distance_yd) : null,
        exertion: r.exertion != null ? Number(r.exertion) : null,
      })),
    [series]
  );

  const showWeightChart = useMemo(() => {
    if (!chartData.length) return false;
    if (loggingMode === 'bodyweight_sets') return false;
    if (loggingMode === 'bodyweight_time_sets' || loggingMode === 'bodyweight_distance_sets') {
      return false;
    }
    if (loggingMode === 'weighted_sets') return true;
    return chartData.some((r) => r.weight != null);
  }, [chartData, loggingMode]);

  const showRepsChart = useMemo(() => {
    if (!chartData.length) return false;
    if (loggingMode === 'bodyweight_time_sets' || loggingMode === 'bodyweight_distance_sets') {
      return false;
    }
    if (loggingMode === 'bodyweight_sets' || loggingMode === 'weighted_sets') return true;
    return chartData.some((r) => r.reps != null);
  }, [chartData, loggingMode]);

  const showTimeChart = loggingMode === 'bodyweight_time_sets' && chartData.length > 0;
  const showDistanceChart = loggingMode === 'bodyweight_distance_sets' && chartData.length > 0;

  if (!exerciseName) return null;
  if (loading) return <div className="spinner" />;
  if (!series) return null;
  if (series.length === 0) {
    return <div className="empty">No entries for {exerciseName} yet.</div>;
  }

  return (
    <div className="exercise-progress-charts">
      {showWeightChart && (
        <Chart title="Weight (lbs)" data={chartData} dataKey="weight" name="Weight" />
      )}
      {showRepsChart && (
        <Chart title="Reps" data={chartData} dataKey="reps" name="Reps" />
      )}
      {showTimeChart && (
        <Chart
          title="Best time"
          data={chartData}
          dataKey="duration"
          name="Time"
          formatValue={(v) => formatDuration(v) ?? '—'}
          tickFormatter={(v) => formatDuration(v) ?? v}
        />
      )}
      {showDistanceChart && (
        <Chart
          title="Best distance (yd)"
          data={chartData}
          dataKey="distance"
          name="Distance"
          formatValue={(v) => (v != null ? `${v} yd` : '—')}
        />
      )}
      <Chart title="Effort (1–5)" data={chartData} dataKey="exertion" name="Effort" domain={[0, 5]} />
    </div>
  );
}
