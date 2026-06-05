// Parse the number of set rows to render from a program target_sets string.
// "3" → 3, "2–3" → 2, "10 min" → 10 (EMOM), null → 1
export function parseSetCount(targetSets) {
  if (targetSets == null || targetSets === '') return 1;
  const s = String(targetSets).trim();
  const minMatch = s.match(/^(\d+)\s*min/i);
  if (minMatch) return Math.max(1, parseInt(minMatch[1], 10));
  const numMatch = s.match(/^(\d+)/);
  if (numMatch) return Math.max(1, parseInt(numMatch[1], 10));
  return 1;
}

export function emptySets(count) {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    weightLbs: null,
    reps: null,
    assistedBand: false,
  }));
}

export function resolveLoggingMode(exercise, variantKey) {
  if (exercise.logging_mode === 'variant' && variantKey) {
    const opt = (exercise.variant_options || []).find((o) => o.key === variantKey);
    return opt?.mode || 'weighted_sets';
  }
  return exercise.logging_mode || (exercise.tracks_weight ? 'weighted_sets' : 'completion_only');
}
