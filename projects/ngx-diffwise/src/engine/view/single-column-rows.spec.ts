import enLongAfter from '../../../../../test-data/en/long/after.html?raw';
import enLongBefore from '../../../../../test-data/en/long/before.html?raw';
import plLongAfter from '../../../../../test-data/pl/long/after.html?raw';
import plLongBefore from '../../../../../test-data/pl/long/before.html?raw';
import { diffHtml } from '../diff-html';
import { diffText } from '../diff-text';
import {
  DEFAULT_DIFF_OPTIONS,
  DocumentVersion,
  LineChangeKind,
  type SingleColumnRow,
  type ViewLine,
  type ViewRow,
} from '../model';
import { singleColumnRows } from './single-column-rows';

const ID_PREFIX = 'diff';
const TEMPLATE_TAG = 'template';
const COLUMN_SIZERS_SELECTOR = '[data-diffwise-column-sizers]';
const OLD = DocumentVersion.Old;
const NEW = DocumentVersion.New;
const STACKED_LINES = { showsMergedLines: false };
const MERGED_LINES = { showsMergedLines: true };

/** The long samples from `test-data/`, as `[name, before, after]`. */
const LONG_SAMPLES: [string, string, string][] = [
  ['en/long', enLongBefore, enLongAfter],
  ['pl/long', plLongBefore, plLongAfter],
];

const PLANS_HTML =
  '<table><tr><th>Plan</th></tr><tr><td>Free</td></tr><tr><td>Team</td></tr></table>';

/** Rows of the side-by-side view of two documents. */
function sideBySideRows(oldHtml: string, newHtml: string): readonly ViewRow[] {
  const settings = {
    options: DEFAULT_DIFF_OPTIONS,
    idPrefix: ID_PREFIX,
    mergesChangedLines: true,
    marksAllWhitespace: false,
  };
  return diffHtml(oldHtml, newHtml, settings).rows;
}

/** Rows of the single column of two documents, with each changed pair as two lines. */
function compare(oldHtml: string, newHtml: string): SingleColumnRow[] {
  return singleColumnRows(sideBySideRows(oldHtml, newHtml), STACKED_LINES);
}

/** Rows of the single column of two documents, with merged lines. */
function compareMerged(oldHtml: string, newHtml: string): SingleColumnRow[] {
  return singleColumnRows(sideBySideRows(oldHtml, newHtml), MERGED_LINES);
}

/** Text of a line as a reader sees it, without the hidden copies of the rows of its table. */
function textOf(line: ViewLine): string {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = line.html;
  template.content.querySelector(COLUMN_SIZERS_SELECTOR)?.remove();

  return template.content.textContent?.trim() ?? '';
}

/** A row as `[kind, version, old number, new number, text]`. */
function rowSummary({ kind, version, oldNumber, newNumber, line }: SingleColumnRow) {
  return [kind, version, oldNumber, newNumber, textOf(line)];
}

/** A table line as `[text, table, below a line, below a row, above a line]`; `null` outside tables. */
function tablePlaceSummary({ line, tablePlace }: SingleColumnRow) {
  if (tablePlace === null) {
    return null;
  }

  const { table, belowTableLine, belowTableRow, aboveTableLine } = tablePlace;

  return [textOf(line), table, belowTableLine, belowTableRow, aboveTableLine];
}

function linesOfVersion(rows: readonly SingleColumnRow[], version: DocumentVersion): ViewLine[] {
  return rows.filter((row) => row.version === version).map((row) => row.line);
}

function isChanged(row: ViewRow): boolean {
  return row.kind !== LineChangeKind.Unchanged;
}

function isChangedPair({ kind }: ViewRow): boolean {
  return kind === LineChangeKind.Changed;
}

function isLine(line: ViewLine | null): line is ViewLine {
  return line !== null;
}

function numbersOf(numbers: readonly (number | null)[]): number[] {
  return numbers.filter((number) => number !== null);
}

describe('singleColumnRows', () => {
  it('shows an unchanged line once, from the new version, under both of its numbers', () => {
    const rows = compare(
      '<p>Old intro.</p><p>Terms of use.</p>',
      '<p>Terms of use.</p><p>New outro.</p>',
    );

    expect(rows.map(rowSummary)).toEqual([
      [LineChangeKind.Removed, OLD, 1, null, 'Old intro.'],
      [LineChangeKind.Unchanged, NEW, 2, 1, 'Terms of use.'],
      [LineChangeKind.Added, NEW, null, 2, 'New outro.'],
    ]);
    expect(rows[1].line.html).toBe('<p>Terms of use.</p>');
  });

  it('shows an unchanged line of one version alone under its number, such as an ignored blank line', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreBlankLines: true };
    const settings = {
      options,
      idPrefix: ID_PREFIX,
      mergesChangedLines: true,
      marksAllWhitespace: false,
    };
    const { rows } = diffText('first\n\nlast', 'first\nlast', settings);
    const expected = [
      [LineChangeKind.Unchanged, NEW, 1, 1, 'first'],
      [LineChangeKind.Unchanged, OLD, 2, null, ''],
      [LineChangeKind.Unchanged, NEW, 3, 2, 'last'],
    ];

    expect(singleColumnRows(rows, STACKED_LINES).map(rowSummary)).toEqual(expected);
    expect(singleColumnRows(rows, MERGED_LINES).map(rowSummary)).toEqual(expected);
  });

  it('shows a changed pair as its old line above its new line, each under its own number', () => {
    const rows = compare(
      '<p>Intro.</p><p>Reply within 24 hours.</p>',
      '<p>Reply within 48 hours.</p>',
    );

    expect(rows.map(rowSummary)).toEqual([
      [LineChangeKind.Removed, OLD, 1, null, 'Intro.'],
      [LineChangeKind.Changed, OLD, 2, null, 'Reply within 24 hours.'],
      [LineChangeKind.Changed, NEW, null, 1, 'Reply within 48 hours.'],
    ]);
  });

  it('keeps the marked changes of each line of a changed pair', () => {
    const sourceRows = sideBySideRows(
      '<p>Reply within 24 hours.</p>',
      '<p>Reply within 48 hours.</p>',
    );
    const [oldRow, newRow] = singleColumnRows(sourceRows, STACKED_LINES);

    expect(oldRow.line).toBe(sourceRows[0].oldLine);
    expect(newRow.line).toBe(sourceRows[0].newLine);
  });

  it('gives both lines of a changed pair the position and the change details of their row', () => {
    const rows = compare(
      '<p>Intro.</p><p><i>Important:</i> back up your notes.</p>',
      '<p>Intro.</p><p><b>Important:</b> back up your notes.</p>',
    );
    const [, oldRow, newRow] = rows;

    expect(rows.map((row) => row.sourceRow)).toEqual([0, 1, 1]);
    expect(oldRow.changeDetails).toHaveLength(1);
    expect(newRow.changeDetails).toBe(oldRow.changeDetails);
    expect(rows[0].changeDetails).toEqual([]);
  });

  it('shows a changed pair as its merged line under both of its numbers, when asked', () => {
    const rows = compareMerged(
      '<p>Intro.</p><p>Reply within 24 hours.</p>',
      '<p>Reply within 48 hours.</p><p>Outro.</p>',
    );

    expect(rows.map(rowSummary)).toEqual([
      [LineChangeKind.Removed, OLD, 1, null, 'Intro.'],
      [LineChangeKind.Changed, NEW, 2, 1, 'Reply within 24 48 hours.'],
      [LineChangeKind.Added, NEW, null, 2, 'Outro.'],
    ]);
    expect(rows.map((row) => row.isMerged)).toEqual([false, true, false]);
  });

  it('gives a merged line the merged line, the position and the change details of its row', () => {
    const sourceRows = sideBySideRows(
      '<p>Intro.</p><p><i>Important:</i> back up your notes.</p>',
      '<p>Intro.</p><p><b>Important:</b> back up your notes.</p>',
    );
    const [, mergedRow] = singleColumnRows(sourceRows, MERGED_LINES);

    expect(mergedRow.line).toBe(sourceRows[1].mergedLine);
    expect(mergedRow.sourceRow).toBe(1);
    expect(mergedRow.changeDetails).toBe(sourceRows[1].changeDetails);
    expect(mergedRow.tablePlace).toBeNull();
  });

  it('shows a changed pair without a merged line as two lines among merged lines', () => {
    const rows = compareMerged(
      '<p>Reply within 24 hours.</p><figure><img src="a.png" alt="A"><figcaption>Old caption</figcaption></figure>',
      '<p>Reply within 48 hours.</p><figure><img src="b.png" alt="A"><figcaption>New caption</figcaption></figure>',
    );

    expect(rows.map(rowSummary)).toEqual([
      [LineChangeKind.Changed, NEW, 1, 1, 'Reply within 24 48 hours.'],
      [LineChangeKind.Changed, OLD, 2, null, 'Old caption'],
      [LineChangeKind.Changed, NEW, null, 2, 'New caption'],
    ]);
    expect(rows.map((row) => row.isMerged)).toEqual([true, false, false]);
  });

  it('shows each line of a merged table once, the changed ones merged, as lines of one table', () => {
    const rows = compareMerged(
      '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Pro</td><td>49 USD</td></tr><tr><td>Trial</td><td>0 USD</td></tr></table>',
      '<table><tr><th>Plan</th><th>Price</th><th>Users</th></tr><tr><td>Pro</td><td>59 USD</td><td>5</td></tr><tr><td>Company</td><td>149 USD</td><td>25</td></tr></table>',
    );

    expect(rows.map(rowSummary)).toEqual([
      [LineChangeKind.Changed, NEW, 1, 1, 'PlanPriceUsers'],
      [LineChangeKind.Changed, NEW, 2, 2, 'Pro49 59 USD5'],
      [LineChangeKind.Removed, OLD, 3, null, 'Trial0 USD'],
      [LineChangeKind.Added, NEW, null, 3, 'Company149 USD25'],
    ]);
    expect(rows.map((row) => row.isMerged)).toEqual([true, true, false, false]);
    expect(rows.map(tablePlaceSummary)).toEqual([
      ['PlanPriceUsers', 0, false, false, true],
      ['Pro49 59 USD5', 0, true, true, true],
      ['Trial0 USD', 0, true, true, true],
      ['Company149 USD25', 0, true, true, false],
    ]);
  });

  it('gives no rows for no rows', () => {
    expect(singleColumnRows([], MERGED_LINES)).toEqual([]);
  });

  it('counts the old and the new version of a table as one table', () => {
    const rows = compare(
      `<p>Plans</p>${PLANS_HTML}<table><tr><td>Search</td></tr></table>`,
      `<table><tr><td>New table</td></tr></table><p>Plans</p>${PLANS_HTML}`,
    );

    expect(rows.map(tablePlaceSummary)).toEqual([
      ['New table', 0, false, false, false],
      null,
      ['Plan', 1, false, false, true],
      ['Free', 1, true, true, true],
      ['Team', 1, true, true, false],
      ['Search', 2, false, false, false],
    ]);
  });

  it('places a line that is the first or the last one only in its version inside the table', () => {
    const rows = compare(
      '<table><tr><th>Plan</th></tr><tr><td>Free</td></tr><tr><td>Team of five</td></tr></table>',
      '<table><tr><th>Plans</th></tr><tr><td>Free</td></tr><tr><td>Team of eight</td></tr></table>',
    );

    expect(rows.map(tablePlaceSummary)).toEqual([
      ['Plan', 0, false, false, true],
      ['Plans', 0, true, true, true],
      ['Free', 0, true, true, true],
      ['Team of five', 0, true, true, true],
      ['Team of eight', 0, true, true, false],
    ]);
  });

  it('places the first row of a table under its caption, but under no row', () => {
    const rows = compare(
      '<table><caption>Plans</caption><tr><td>Free</td></tr></table>',
      '<table><caption>Plans</caption><tr><td>Free</td></tr><tr><td>Team</td></tr></table>',
    );

    expect(rows.map(tablePlaceSummary)).toEqual([
      ['Plans', 0, false, false, true],
      ['Free', 0, true, false, true],
      ['Team', 0, true, true, false],
    ]);
  });

  it('keeps the table of removed rows that stand above the first pair of the table', () => {
    const rows = compare(
      '<table><tr><td>Archive</td></tr><tr><td>Free</td></tr></table>',
      '<table><tr><td>Free</td></tr></table>',
    );

    expect(rows.map(tablePlaceSummary)).toEqual([
      ['Archive', 0, false, false, true],
      ['Free', 0, true, true, false],
    ]);
  });

  it.each(LONG_SAMPLES)(
    'shows every line of %s that the side-by-side view shows, in the same order',
    (_, before, after) => {
      const sourceRows = sideBySideRows(before, after);
      const rows = singleColumnRows(sourceRows, STACKED_LINES);
      const changedOldLines = sourceRows.filter(isChanged).map((row) => row.oldLine);
      const newLines = sourceRows.map((row) => row.newLine);
      const oldNumbers = numbersOf(rows.map((row) => row.oldNumber));
      const allOldNumbers = numbersOf(sourceRows.map((row) => row.oldLine?.number ?? null));

      expect(linesOfVersion(rows, OLD)).toEqual(changedOldLines.filter(isLine));
      expect(linesOfVersion(rows, NEW)).toEqual(newLines.filter(isLine));
      expect(oldNumbers).toEqual(allOldNumbers);
    },
  );

  it.each(LONG_SAMPLES)(
    'merges every changed pair of %s into one line under both numbers, also in tables',
    (_, before, after) => {
      const sourceRows = sideBySideRows(before, after);
      const rows = singleColumnRows(sourceRows, MERGED_LINES);
      const changedPairs = sourceRows.filter(isChangedPair);
      const mergedRows = rows.filter((row) => row.isMerged);
      const oldNumbers = numbersOf(rows.map((row) => row.oldNumber));
      const allOldNumbers = numbersOf(sourceRows.map((row) => row.oldLine?.number ?? null));

      expect(changedPairs.some((row) => row.newLine?.table !== null)).toBe(true);
      expect(mergedRows.map((row) => row.line)).toEqual(changedPairs.map((row) => row.mergedLine));
      expect(mergedRows.every((row) => row.oldNumber !== null && row.newNumber !== null)).toBe(
        true,
      );
      expect(oldNumbers).toEqual(allOldNumbers);
    },
  );
});
