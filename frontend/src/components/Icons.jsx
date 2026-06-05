// Minimal monochrome line/solid icons (currentColor).

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function DumbbellIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
    </svg>
  );
}

export function TodayIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
    </svg>
  );
}

export function HistoryIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function ChartIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.1 14.3l-3.6-3.6 1.4-1.4 2.2 2.2 4.9-4.9 1.4 1.4-6.3 6.3z" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function FlameIcon(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M12 2c1.2 3-1.5 4.5-1.5 7A2.5 2.5 0 0013 11c.3-1 .2-1.8-.2-2.6 2 1 3.7 3 3.7 5.6a4.5 4.5 0 11-9 0c0-3 2-4.5 2-7 0-2 1.2-4 2.5-5z" />
    </svg>
  );
}

export function MoonIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z" />
    </svg>
  );
}
