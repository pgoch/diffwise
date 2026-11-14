import { diffHtml } from '../diff-html';
import { DEFAULT_DIFF_OPTIONS, LineChangeKind, type ViewRow } from '../model';
import { type CollapsibleRow, HiddenLines, collapseRows } from './collapse-rows';
import { singleColumnRows } from './single-column-rows';

const ID_PREFIX = 'diff';
const PARAGRAPH_COUNT = 60;
const DEFAULT_CONTEXT_LINES = 3;
const NO_SHOWN_GROUPS: ReadonlySet<number> = new Set();
const HIDDEN = 'hidden';

const UNCHANGED = LineChangeKind.Unchanged;
const CHANGED = LineChangeKind.Changed;
const ADDED = LineChangeKind.Added;
const REMOVED = LineChangeKind.Removed;

/** Sixty paragraphs, numbered from 1, with another word in the paragraphs of the given numbers. */
function paragraphs(changedNumbers: readonly number[]): string {
  return Array.from({ length: PARAGRAPH_COUNT }, (_, index) => {
    const number = index + 1;
    const word = changedNumbers.includes(number) ? 'changed' : 'sample';

    return `<p>Paragraph ${number} of the ${word} document.</p>`;
  }).join('');
}

/** Rows of the side-by-side view of two documents, with merged lines. */
function compare(oldHtml: string, newHtml: string): readonly ViewRow[] {
  const settings = { options: DEFAULT_DIFF_OPTIONS, idPrefix: ID_PREFIX, mergesChangedLines: true };
  return diffHtml(oldHtml, newHtml, settings).rows;
}

/** The rows of the side-by-side view as rows of a view, each from its own position. */
function sideBySide(rows: readonly ViewRow[]): CollapsibleRow[] {
  return rows.map(({ kind }, sourceRow) => ({ kind, sourceRow }));
}

/** Rows of the given kinds, each from its own position. */
function rowsOfKinds(kinds: readonly LineChangeKind[]): CollapsibleRow[] {
  return kinds.map((kind, sourceRow) => ({ kind, sourceRow }));
}

/** Kinds of `count` unchanged rows. */
function unchanged(count: number): LineChangeKind[] {
  return Array.from({ length: count }, () => UNCHANGED);
}

/** A shown row as the position of its compared row, and hidden lines as `['hidden', first, count]`. */
function summary(item: CollapsibleRow | HiddenLines) {
  return item instanceof HiddenLines ? [HIDDEN, item.firstRow, item.count] : item.sourceRow;
}

function collapse(
  rows: readonly CollapsibleRow[],
  contextLines = DEFAULT_CONTEXT_LINES,
  shownGroups = NO_SHOWN_GROUPS,
) {
  return collapseRows(rows, { contextLines, shownGroups }).map(summary);
}

/** Positions from `start` up to `end`, without `end`. */
function positions(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, index) => start + index);
}

describe('collapseRows', () => {
  it('hides unchanged lines far from changes, around 3 lines of context', () => {
    const rows = compare(paragraphs([]), paragraphs([5, 6, 30, 55]));

    expect(collapse(sideBySide(rows))).toEqual([
      ...positions(0, 9),
      [HIDDEN, 9, 17],
      ...positions(26, 33),
      [HIDDEN, 33, 18],
      ...positions(51, 58),
      [HIDDEN, 58, 2],
    ]);
  });

  it('keeps a single unchanged line far from changes, in place of a bar of one line', () => {
    const rows = rowsOfKinds([UNCHANGED, UNCHANGED, CHANGED, UNCHANGED, UNCHANGED]);

    expect(collapse(rows, 1)).toEqual([0, 1, 2, 3, 4]);
  });

  it('shows the lines between two changes whose contexts meet', () => {
    const rows = rowsOfKinds([CHANGED, ...unchanged(6), ADDED, ...unchanged(8), REMOVED]);

    expect(collapse(rows)).toEqual([...positions(0, 11), [HIDDEN, 11, 2], ...positions(13, 17)]);
  });

  it('keeps the given number of context lines', () => {
    const rows = rowsOfKinds([...unchanged(5), CHANGED, ...unchanged(5)]);

    expect(collapse(rows, 1)).toEqual([[HIDDEN, 0, 4], 4, 5, 6, [HIDDEN, 7, 4]]);
  });

  it('hides nothing before a change in the first line or after one in the last line', () => {
    const rows = rowsOfKinds([ADDED, ...unchanged(10), REMOVED]);

    expect(collapse(rows)).toEqual([0, 1, 2, 3, [HIDDEN, 4, 4], 8, 9, 10, 11]);
  });

  it('hides every line of a document without changes behind one bar', () => {
    const rows = compare(paragraphs([]), paragraphs([]));

    expect(collapse(sideBySide(rows))).toEqual([[HIDDEN, 0, PARAGRAPH_COUNT]]);
  });

  it('hides nothing when the context reaches every line', () => {
    const rows = rowsOfKinds([...unchanged(4), CHANGED, ...unchanged(4)]);

    expect(collapse(rows, 4)).toEqual(positions(0, 9));
  });

  it('shows the groups that the user has shown, and keeps the others hidden', () => {
    const rows = rowsOfKinds([...unchanged(5), CHANGED, ...unchanged(5)]);

    expect(collapse(rows, 1, new Set([7]))).toEqual([[HIDDEN, 0, 4], ...positions(4, 11)]);
  });

  it('gives no rows for no rows', () => {
    expect(collapse([])).toEqual([]);
  });

  it('gives hidden lines the position of their first row among the rows of the view', () => {
    const rows = rowsOfKinds([...unchanged(5), CHANGED, ...unchanged(5)]);
    const [first, , , , last] = collapseRows(rows, {
      contextLines: 1,
      shownGroups: NO_SHOWN_GROUPS,
    });

    expect([first, last]).toEqual([new HiddenLines(0, 0, 4), new HiddenLines(7, 7, 4)]);
  });

  it('hides the same lines in the single column, and names their groups the same way', () => {
    const oldHtml = paragraphs([]);
    const newHtml = paragraphs([5, 6, 30, 55]).replace(
      '<p>Paragraph 40 of the sample document.</p>',
      '',
    );
    const rows = compare(oldHtml, newHtml);
    const sideBySideGroups = collapseRows(sideBySide(rows), {
      contextLines: DEFAULT_CONTEXT_LINES,
      shownGroups: NO_SHOWN_GROUPS,
    })
      .filter((item) => item instanceof HiddenLines)
      .map(summary);

    for (const showsMergedLines of [true, false]) {
      const singleColumn = singleColumnRows(rows, { showsMergedLines });
      const groups = collapseRows(singleColumn, {
        contextLines: DEFAULT_CONTEXT_LINES,
        shownGroups: NO_SHOWN_GROUPS,
      })
        .filter((item) => item instanceof HiddenLines)
        .map(summary);

      expect(groups).toEqual(sideBySideGroups);
    }

    expect(sideBySideGroups).toEqual([
      [HIDDEN, 9, 17],
      [HIDDEN, 33, 3],
      [HIDDEN, 43, 8],
      [HIDDEN, 58, 2],
    ]);
  });

  it('keeps the rows themselves, so a view can tell them apart from hidden lines', () => {
    const rows = rowsOfKinds([...unchanged(5), CHANGED]);
    const [hiddenLines, ...shownRows] = collapseRows(rows, {
      contextLines: 1,
      shownGroups: NO_SHOWN_GROUPS,
    });

    expect(hiddenLines).toBeInstanceOf(HiddenLines);
    expect(shownRows).toEqual([rows[4], rows[5]]);
    expect(shownRows[0]).toBe(rows[4]);
  });
});
