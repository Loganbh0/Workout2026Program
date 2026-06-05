import Breathing from './Breathing.jsx';
import TopNav from './TopNav.jsx';
import { ProgressCard, StatsCard } from './Cards.jsx';

const WEEKDAY_TITLES = {
  saturday: 'Saturday',
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

function formatStartLabel(startDate) {
  const d = new Date(`${startDate}T12:00:00`);
  return `Starts ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
}

export default function DayCompleteView({ mode, weekday, stats }) {
  const isRest = mode === 'rest';
  const title = isRest ? 'Rest Day' : 'Workout Complete';
  const weekdayLabel = WEEKDAY_TITLES[weekday] || 'Today';
  const subtitle = isRest
    ? `${weekdayLabel} is for recovery. Breathe, refuel, and come back strong.`
    : `Nice work today. Breathe, recover, and come back strong tomorrow.`;

  const checkIns = stats?.checkIns ?? 0;
  const totalWorkouts = stats?.totalWorkouts ?? 40;
  const completion = stats?.completion ?? 0;

  const progressLabel =
    stats?.programStatus === 'pending' && stats?.startDate
      ? formatStartLabel(stats.startDate)
      : stats?.currentWeek
      ? `Week ${stats.currentWeek} of ${stats.durationWeeks}`
      : 'Progress';

  return (
    <>
      <TopNav title="Today" />
      <div className="screen">
        <div className="day-complete">
          <Breathing />
          <h1 className="heading day-complete__title">{title}</h1>
          <p className="subtitle day-complete__subtitle">{subtitle}</p>
        </div>

        <div className="section">
          <ProgressCard
            label={progressLabel}
            count={`${checkIns}/${totalWorkouts} workouts`}
            value={completion}
          />
        </div>

        <div className="section">
          <StatsCard
            stats={[
              { label: 'Streak', value: stats?.streak ?? 0 },
              { label: 'Check-Ins', value: checkIns },
              { label: 'Completion', value: `${completion}%` },
            ]}
          />
        </div>
      </div>
    </>
  );
}
