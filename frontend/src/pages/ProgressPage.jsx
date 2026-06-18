import { useState } from 'react';
import TopNav from '../components/TopNav.jsx';
import ScopeToggle from '../components/ScopeToggle.jsx';
import WorkoutCalendar from '../components/WorkoutCalendar.jsx';
import DayWorkoutPanel from '../components/DayWorkoutPanel.jsx';

export default function ProgressPage() {
  const [scope, setScope] = useState('active');
  const [selectedDate, setSelectedDate] = useState(null);

  function handleScopeChange(next) {
    setScope(next);
    setSelectedDate(null);
  }

  return (
    <>
      <TopNav title="Progress" />
      <div className="screen">
        <h1 className="heading" style={{ marginTop: 12 }}>Progress</h1>
        <p className="subtitle">Your workout calendar and logged sessions.</p>
        <ScopeToggle value={scope} onChange={handleScopeChange} />

        <WorkoutCalendar
          scope={scope}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {selectedDate && (
          <DayWorkoutPanel date={selectedDate} scope={scope} />
        )}
      </div>
    </>
  );
}
