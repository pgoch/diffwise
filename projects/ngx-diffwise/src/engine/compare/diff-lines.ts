import { comparisonText } from './comparison-text';
import {
  type DiffOptions,
  type DiffStats,
  type Line,
  type LineChange,
  LineChangeKind,
  type LineDiff,
} from '../model';
import { EditKind, myersDiff } from './myers';
import { pairSimilarLines } from './pair-similar-lines';

/** Matches the lines of both versions as unchanged, changed, added or removed, in reading order. */
export function diffLines(
  oldLines: readonly Line[],
  newLines: readonly Line[],
  options: DiffOptions,
): LineDiff {
  const changes: LineChange[] = [];
  let removed: Line[] = [];
  let added: Line[] = [];

  const addBlockOfChanges = (): void => {
    changes.push(...pairSimilarLines(removed, added, options));
    removed = [];
    added = [];
  };

  const edits = myersDiff(
    oldLines.map((line) => lineKey(line, options)),
    newLines.map((line) => lineKey(line, options)),
  );

  for (const edit of edits) {
    if (edit.kind === EditKind.Delete) {
      removed.push(oldLines[edit.oldIndex]);
    } else if (edit.kind === EditKind.Insert) {
      added.push(newLines[edit.newIndex]);
    } else {
      addBlockOfChanges();
      changes.push({
        kind: LineChangeKind.Unchanged,
        oldLine: oldLines[edit.oldIndex],
        newLine: newLines[edit.newIndex],
      });
    }
  }

  addBlockOfChanges();

  return { changes, stats: countChanges(changes) };
}

/** Lines are equal when their tags and their compared texts are. */
function lineKey(line: Line, options: DiffOptions): string {
  return JSON.stringify([line.tag, comparisonText(line.text, options)]);
}

function countChanges(changes: readonly LineChange[]): DiffStats {
  return {
    addedLines: countKind(changes, LineChangeKind.Added),
    removedLines: countKind(changes, LineChangeKind.Removed),
    changedLines: countKind(changes, LineChangeKind.Changed),
  };
}

function countKind(changes: readonly LineChange[], kind: LineChangeKind): number {
  return changes.filter((change) => change.kind === kind).length;
}
