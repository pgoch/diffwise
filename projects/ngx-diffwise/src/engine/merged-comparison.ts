import type { Comparison, DiffStats, ViewRow } from './model';

/** A comparison whose rows have their merged lines; asked for them again, it gives itself. */
export function comparisonWithMergedLines(rows: readonly ViewRow[], stats: DiffStats): Comparison {
  const comparison: Comparison = { rows, stats, withMergedLines: () => comparison };

  return comparison;
}
