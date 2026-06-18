import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import ExerciseProgressCharts from './ExerciseProgressCharts.jsx';
import './ExerciseProgressSearch.css';

const MAX_SUGGESTIONS = 8;

export default function ExerciseProgressSearch({ scope }) {
  const [exercises, setExercises] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [series, setSeries] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoadingList(true);
    setExercises([]);
    setSelectedExercise(null);
    setSelectedMeta(null);
    setSeries(null);
    setQuery('');
    api
      .exercises(scope)
      .then((list) => active && setExercises(list))
      .catch(() => active && setExercises([]))
      .finally(() => active && setLoadingList(false));
    return () => {
      active = false;
    };
  }, [scope]);

  useEffect(() => {
    if (!selectedExercise) {
      setSeries(null);
      return;
    }
    let active = true;
    setLoadingSeries(true);
    setSeries(null);
    api
      .exerciseProgress(selectedExercise, scope)
      .then((rows) => active && setSeries(rows))
      .catch(() => active && setSeries([]))
      .finally(() => active && setLoadingSeries(false));
    return () => {
      active = false;
    };
  }, [selectedExercise, scope]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises.slice(0, MAX_SUGGESTIONS);
    return exercises
      .filter((ex) => ex.name.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [exercises, query]);

  function pickExercise(ex) {
    setSelectedExercise(ex.name);
    setSelectedMeta(ex);
    setQuery(ex.name);
    setOpen(false);
    setHighlight(0);
  }

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickExercise(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="exercise-progress-search" ref={wrapRef}>
      <p className="section-label">Exercise Progress</p>
      <div className="exercise-progress-search__field">
        <input
          className="select exercise-progress-search__input"
          type="text"
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedExercise(null);
            setSelectedMeta(null);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
          disabled={loadingList}
        />
        {open && suggestions.length > 0 && (
          <ul className="exercise-progress-search__list" role="listbox">
            {suggestions.map((ex, i) => (
              <li key={ex.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  className={`exercise-progress-search__option${
                    i === highlight ? ' exercise-progress-search__option--on' : ''
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickExercise(ex)}
                  onMouseEnter={() => setHighlight(i)}
                >
                  {ex.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loadingList && exercises.length === 0 && (
        <p className="exercise-progress-search__hint">Log workouts to track exercise progress.</p>
      )}

      {selectedExercise && (
        <ExerciseProgressCharts
          exerciseName={selectedExercise}
          loggingMode={selectedMeta?.loggingMode}
          series={series}
          loading={loadingSeries}
        />
      )}
    </div>
  );
}
