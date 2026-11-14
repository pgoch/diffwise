import type { DiffStats } from '../engine';

/** Numbers of the lines that differ between the two versions, as `(diffStatsComputed)` gives them. */
export interface DiffwiseDiffStats {
  /** Lines that only the new version has. */
  readonly addedLines: number;
  /** Lines that only the old version has. */
  readonly removedLines: number;
  /** Lines of both versions that differ, such as in a word or in formatting; a pair counts once. */
  readonly changedLines: number;
  /** False when the versions are the same, as far as the options of the comparison see them. */
  readonly hasChanges: boolean;
}

/** The numbers of a comparison, and whether it found any change. */
export function diffwiseDiffStats({
  addedLines,
  removedLines,
  changedLines,
}: DiffStats): DiffwiseDiffStats {
  const hasChanges = addedLines + removedLines + changedLines > 0;
  return { addedLines, removedLines, changedLines, hasChanges };
}
