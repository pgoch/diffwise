import { comparisonImage } from './comparison-image';
import { comparisonText } from './comparison-text';
import { listItemsDiffer } from './diff-list-markers';
import { LIST_ITEM_TAG, PARAGRAPH_TAG } from '../html/html-tags';
import {
  type DiffOptions,
  type DiffStats,
  type Line,
  type LineChange,
  LineChangeKind,
  type LineDiff,
  LineKind,
  type TableCell,
  type TextFormat,
} from '../model';
import { EditKind, myersDiff } from './myers';
import { pairSimilarLines } from './pair-similar-lines';
import { slideChanges } from './slide-changes';

const WHITESPACE = /\s/g;
const NO_TEXT = '';

/** Characters next to each other with one compared format. */
interface FormatRun {
  /** Characters other than whitespace. */
  length: number;
  readonly format: string;
}

/**
 * Matches the lines of both versions as unchanged, changed, added or removed, in reading order.
 * Changes slide over equal lines to meet the changes of the other version, so that a removed and
 * an added line split apart by an equal line, such as a blank line, can pair up as changed.
 */
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

  const oldKeys = oldLines.map((line) => lineKey(line, options));
  const newKeys = newLines.map((line) => lineKey(line, options));
  const edits = slideChanges(myersDiff(oldKeys, newKeys), oldKeys, newKeys);

  for (const edit of edits) {
    if (edit.kind === EditKind.Delete) {
      removed.push(oldLines[edit.oldIndex]);
    } else if (edit.kind === EditKind.Insert) {
      added.push(newLines[edit.newIndex]);
    } else {
      addBlockOfChanges();
      changes.push(matchedPair(oldLines[edit.oldIndex], newLines[edit.newIndex], options));
    }
  }

  addBlockOfChanges();

  return { changes, stats: countChanges(changes) };
}

/** Lines with equal keys: unchanged, or changed when the list items they start differ. */
function matchedPair(oldLine: Line, newLine: Line, options: DiffOptions): LineChange {
  const itemChanged = listItemsDiffer(oldLine, newLine, options);
  const kind = itemChanged ? LineChangeKind.Changed : LineChangeKind.Unchanged;

  return { kind, oldLine, newLine };
}

/**
 * Lines are equal when their structures, compared texts, formats and images are. Rows are equal
 * when their cells are too, so text moved to another cell changes a row. List markers are compared
 * after matching, so an item with another marker stays the same line.
 */
function lineKey(line: Line, options: DiffOptions): string {
  const text = comparisonText(line.text, options);
  const images = line.images.map((image) => comparisonImage(image.properties, options));
  const cells = line.cells.map((cell) => cellKey(line, cell, options));

  return JSON.stringify([structureTag(line), text, formatRuns(line, options), images, cells]);
}

/** The columns of a cell and its compared text. */
function cellKey(
  line: Line,
  { start, end, column, columnSpan }: TableCell,
  options: DiffOptions,
): (number | string)[] {
  const text = comparisonText(line.text.slice(start, end), options);
  return [column, columnSpan, text];
}

/**
 * Tag of the line's structure. A heading counts as a paragraph, as its level is formatting, and so
 * does an `li` item, as `<li>…</li>` reads the same as `<li><p>…</p></li>`.
 */
function structureTag(line: Line): string | null {
  const readsAsParagraph = line.kind === LineKind.Heading || line.tag === LIST_ITEM_TAG;
  return readsAsParagraph ? PARAGRAPH_TAG : line.tag;
}

/** Compared formats of the line's text; whitespace and its formatting do not count. */
function formatRuns(line: Line, options: DiffOptions): FormatRun[] {
  const runs: FormatRun[] = [];

  for (const { start, end, format } of line.formats) {
    const length = line.text.slice(start, end).replace(WHITESPACE, NO_TEXT).length;

    if (length === 0) {
      continue;
    }

    const comparedFormat = comparisonFormat(format, options);
    const previous = runs.at(-1);

    if (previous?.format === comparedFormat) {
      previous.length += length;
    } else {
      runs.push({ length, format: comparedFormat });
    }
  }

  return runs;
}

/** A format in the form it is compared in: without formatting or link, if the options say so. */
function comparisonFormat({ styles, values, link }: TextFormat, options: DiffOptions): string {
  const formatting = options.ignoreFormatting ? null : { styles, values };
  const comparedLink = options.ignoreLinkChanges ? null : link;

  return JSON.stringify([formatting, comparedLink]);
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
