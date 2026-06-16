import { parseSetCount, emptySets, resolveLoggingMode } from './setCount.js';

export function normalizeVariantOptions(exercise) {
  const raw = exercise?.variant_options ?? exercise?.variantOptions;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function initExerciseValue(exercise) {
  const setCount = parseSetCount(exercise.target_sets ?? exercise.targetSets);
  const variantOptions = normalizeVariantOptions(exercise);
  const variantKey =
    exercise.prefill?.variantKey ||
    (exercise.logging_mode === 'variant' ? variantOptions[0]?.key ?? null : null);
  const mode = resolveLoggingMode(exercise, variantKey);
  const showSets = mode !== 'completion_only';

  let sets = emptySets(setCount);
  if (showSets && exercise.prefill?.sets?.length) {
    sets = emptySets(setCount).map((row, i) => ({
      ...row,
      ...(exercise.prefill.sets[i] || {}),
      setNumber: i + 1,
    }));
  }

  return {
    completed: false,
    variantKey,
    sets: showSets ? sets : [],
  };
}

export function inferLoggingModeFromSets(sets) {
  if (!sets?.length) return 'completion_only';
  if (sets.some((s) => s.weightLbs != null)) return 'weighted_sets';
  if (sets.some((s) => s.reps != null)) return 'bodyweight_sets';
  return 'completion_only';
}

export function exerciseFromLog(log, templateEx) {
  const setCount = Math.max(1, log.sets?.length || 1);
  const loggingMode =
    templateEx?.logging_mode ||
    templateEx?.loggingMode ||
    inferLoggingModeFromSets(log.sets);

  return {
    id: templateEx?.id ?? `log-${log.id ?? log.exerciseName}`,
    name: log.exercise_name ?? log.exerciseName,
    sort_order: log.sort_order ?? log.sortOrder ?? 0,
    target_sets: String(setCount),
    target_reps: null,
    logging_mode: loggingMode,
    tracks_weight: loggingMode === 'weighted_sets',
    variant_options: templateEx?.variant_options ?? templateEx?.variantOptions,
    is_priority: false,
    isAdHoc: !templateEx,
  };
}

export function valueFromLog(log) {
  const sets = (log.sets || []).map((s) => ({
    setNumber: s.setNumber ?? s.set_number,
    weightLbs: s.weightLbs ?? (s.weight_lbs != null ? Number(s.weight_lbs) : null),
    reps: s.reps != null ? Number(s.reps) : null,
    assistedBand: Boolean(s.assistedBand ?? s.assisted_band),
  }));
  return {
    completed: Boolean(log.completed),
    variantKey: log.variant_key ?? log.variantKey ?? null,
    sets,
  };
}

export function createAdHocExercise(tempId) {
  return {
    id: tempId,
    name: '',
    sort_order: 0,
    target_sets: '3',
    target_reps: '8-12',
    logging_mode: 'weighted_sets',
    tracks_weight: true,
    isAdHoc: true,
  };
}

export function buildLogsFromRows(rows) {
  return rows.map((row, index) => {
    const { exercise, value } = row;
    const mode = resolveLoggingMode(exercise, value.variantKey);
    return {
      exerciseName: exercise.name,
      sortOrder: exercise.sort_order ?? index + 1,
      completed: value.completed ?? false,
      variantKey: value.variantKey ?? null,
      sets:
        mode === 'completion_only'
          ? []
          : (value.sets || []).map((s) => ({
              setNumber: s.setNumber,
              weightLbs: s.weightLbs ?? null,
              reps: s.reps ?? null,
              assistedBand: s.assistedBand ?? false,
            })),
    };
  });
}

export function formatStartLabel(startDate) {
  const d = new Date(`${startDate}T12:00:00`);
  return `Starts ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
}
