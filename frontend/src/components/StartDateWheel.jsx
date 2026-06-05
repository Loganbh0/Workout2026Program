import { useEffect, useMemo, useRef, useState } from 'react';
import { localIsoDate } from '../api.js';
import './StartDateWheel.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 36;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2);

function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function clampDay(year, month, day) {
  return Math.min(day, daysInMonth(year, month));
}

function toIso(year, month, day) {
  const y = year;
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function WheelColumn({ items, value, onChange, label }) {
  const ref = useRef(null);
  const index = items.indexOf(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || index < 0) return;
    el.scrollTop = index * ITEM_HEIGHT;
  }, [index, items.length]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / ITEM_HEIGHT);
    const next = items[Math.max(0, Math.min(items.length - 1, i))];
    if (next !== value) onChange(next);
  };

  return (
    <div className="date-wheel__column">
      <span className="date-wheel__column-label">{label}</span>
      <div className="date-wheel__viewport">
        <div className="date-wheel__highlight" aria-hidden />
        <ul
          ref={ref}
          className="date-wheel__list"
          onScroll={handleScroll}
          style={{ paddingTop: PAD * ITEM_HEIGHT, paddingBottom: PAD * ITEM_HEIGHT }}
        >
          {items.map((item) => (
            <li
              key={item}
              className={`date-wheel__item${item === value ? ' date-wheel__item--active' : ''}`}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => onChange(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function StartDateWheel({ value, onChange }) {
  const initial = parseIso(value || localIsoDate());
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [year, setYear] = useState(initial.year);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => now - 1 + i);
  }, []);

  const monthNames = MONTHS;
  const maxDay = daysInMonth(year, month);
  const days = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay]
  );

  useEffect(() => {
    if (day > maxDay) {
      setDay(maxDay);
    }
  }, [day, maxDay]);

  useEffect(() => {
    onChange(toIso(year, month, day));
  }, [year, month, day, onChange]);

  return (
    <div className="date-wheel">
      <WheelColumn
        label="Month"
        items={monthNames}
        value={MONTHS[month]}
        onChange={(name) => setMonth(MONTHS.indexOf(name))}
      />
      <WheelColumn label="Day" items={days} value={day} onChange={setDay} />
      <WheelColumn label="Year" items={years} value={year} onChange={setYear} />
    </div>
  );
}
