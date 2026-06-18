import { Link } from 'react-router-dom';
import Breathing from './Breathing.jsx';
import TopNav from './TopNav.jsx';
import { ProgressCard } from './Cards.jsx';
import { formatStartLabel } from '../workoutHelpers.js';

const WEEKDAY_TITLES = {
  saturday: 'Saturday',
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export default function DayCompleteView({
  mode,
  weekday,
  stats,
  showAdhocLink,
  showAddAnother,
  onAddAnother,
  showProgress = true,
}) {
  const isRest = mode === 'rest';
  const title = isRest ? 'Rest Day' : 'Workout Complete';
  const weekdayLabel = WEEKDAY_TITLES[weekday] || 'Today';
  const subtitle = isRest
    ? `${weekdayLabel} is for recovery. Breathe, refuel, and come back strong.`
    : 'Nice work today. Breathe, recover, and come back strong.';

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

        {showProgress && stats && (
          <div className="section">
            <ProgressCard
              label={progressLabel}
              count={`${checkIns}/${totalWorkouts} workouts`}
              value={completion}
            />
          </div>
        )}

        {showAddAnother && onAddAnother && (
          <button type="button" className="adhoc-link" onClick={onAddAnother}>
            Add another workout
          </button>
        )}

        {showAdhocLink && !showAddAnother && (
          <Link to="/session/new" className="adhoc-link">
            Log one-off workout
          </Link>
        )}
      </div>
    </>
  );
}
