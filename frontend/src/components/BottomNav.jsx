import { NavLink } from 'react-router-dom';
import { HomeIcon, TodayIcon, HistoryIcon, ChartIcon } from './Icons.jsx';

const items = [
  { to: '/home', label: 'Plans', Icon: HomeIcon, end: true },
  { to: '/', label: 'Today', Icon: TodayIcon, end: true },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/progress', label: 'Progress', Icon: ChartIcon },
];

export default function BottomNav() {
  return (
    <nav className="bottomnav">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `bottomnav__item${isActive ? ' bottomnav__item--active' : ''}`
          }
        >
          <Icon width={22} height={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
