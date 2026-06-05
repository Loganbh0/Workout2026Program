import Breathing from '../components/Breathing.jsx';
import TopNav from '../components/TopNav.jsx';

const WEEKDAY_TITLES = {
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function RestDay({ weekday }) {
  return (
    <>
      <TopNav title="Rest Day" />
      <div
        className="screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '70vh',
        }}
      >
        <Breathing />
        <h1 className="heading" style={{ fontSize: 34, marginTop: 24 }}>
          Rest Day
        </h1>
        <p className="subtitle" style={{ maxWidth: 280 }}>
          {WEEKDAY_TITLES[weekday] || 'Today'} is for recovery. Breathe, refuel, and
          come back strong.
        </p>
      </div>
    </>
  );
}
