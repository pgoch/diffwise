import enLongAfter from '../../../../test-data/en/long/after.html?raw';
import enLongBefore from '../../../../test-data/en/long/before.html?raw';
import plLongAfter from '../../../../test-data/pl/long/after.html?raw';
import plLongBefore from '../../../../test-data/pl/long/before.html?raw';
import { diffHtml } from './diff-html';
import { DEFAULT_DIFF_OPTIONS, LineChangeKind, type ViewLine, type ViewRow } from './model';

const ID_PREFIX = 'diff';
const TEMPLATE_TAG = 'template';
const COLUMN_SIZERS_SELECTOR = '[data-diffwise-column-sizers]';
const SIZER_ROWS_SELECTOR = `${COLUMN_SIZERS_SELECTOR} > tr`;
const ROW_SELECTOR = '[data-diffwise-table-copy] > :not([data-diffwise-column-sizers]) > tr';
const CAPTION_SELECTOR = 'caption';
const COLUMN_GROUP_SELECTOR = '[data-diffwise-table-copy] > colgroup';
const REMOVED_TEXT_SELECTOR = 'del.diffwise-html-diff__highlight--removed';
const ADDED_TEXT_SELECTOR = 'ins.diffwise-html-diff__highlight--added';
const GAP_CELL_CLASS = 'diffwise-html-diff__gap--cell';
const WHOLE_CELL_CLASS = 'diffwise-html-diff__highlight--cell';
const REMOVED_CLASS = 'diffwise-html-diff__highlight--removed';
const CONTINUED_CELL_ATTRIBUTE = 'data-diffwise-continued-cell';
const UNKNOWN_SAMPLE = 'No sample has the name ';

/** Stands for a gap cell in the summary of a row. */
const GAP = '[gap]';

/** Stands for the empty copy of a cell from a row above. */
const CONTINUED = '[continued]';

/** A cell over several columns ends with the number of columns, such as `Total (2 columns)`. */
const COLUMNS_START = ' (';
const COLUMNS_END = ' columns)';

/** A whole added cell starts with `+`, a whole removed cell with `-`. */
const ADDED_CELL = '+';
const REMOVED_CELL = '-';

/** Removed text in a cell shows as `[-text]`, added text as `[+text]`. */
const REMOVED_TEXT_START = '[-';
const ADDED_TEXT_START = '[+';
const CHANGED_TEXT_END = ']';
const CAPTION_START = 'caption: ';

const PRICES_BEFORE =
  '<table><thead><tr><th>Plan</th><th>Price</th></tr></thead><tbody><tr><td>Start</td><td>19 USD</td></tr><tr><td>Pro</td><td>49 USD</td></tr><tr><td>Trial</td><td>0 USD</td></tr></tbody></table>';
const PRICES_AFTER =
  '<table><thead><tr><th>Plan</th><th>Price</th><th>Users</th></tr></thead><tbody><tr><td>Start</td><td>19 USD</td><td>1</td></tr><tr><td>Pro</td><td>59 USD</td><td>5</td></tr><tr><td>Company</td><td>149 USD</td><td>25</td></tr></tbody></table>';

/** The long samples from `test-data/`, as `[name, before, after]`. */
const LONG_SAMPLES: [string, string, string][] = [
  ['en/long', enLongBefore, enLongAfter],
  ['pl/long', plLongBefore, plLongAfter],
];

/** Rows of two documents compared, with merged lines unless asked otherwise. */
function compare(oldHtml: string, newHtml: string, mergesChangedLines = true): ViewRow[] {
  const settings = { options: DEFAULT_DIFF_OPTIONS, idPrefix: ID_PREFIX, mergesChangedLines };
  return [...diffHtml(oldHtml, newHtml, settings).rows];
}

/** For each row, its kind and the summary of its merged line; `null` without a merged line. */
function mergedTableOf(oldHtml: string, newHtml: string) {
  return compare(oldHtml, newHtml).map((row) => [row.kind, summaryOf(row.mergedLine)]);
}

/** The summaries of the merged lines of a sample's rows, without the kinds of the rows. */
function mergedLinesOfSample(before: string, after: string) {
  return compare(before, after).map((row) => summaryOf(row.mergedLine));
}

function sampleOf(name: string): [string, string] {
  const sample = LONG_SAMPLES.find(([sampleName]) => sampleName === name);

  if (sample === undefined) {
    throw new Error(UNKNOWN_SAMPLE + name);
  }

  return [sample[1], sample[2]];
}

function fragmentOf(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content;
}

/**
 * A merged table line as the texts of its cells, such as `['Pro', '[-49] [+59] USD', '+5']`, or
 * its caption; `null` for a line that is no table line, and for no line.
 */
function summaryOf(line: ViewLine | null): string[] | null {
  if (line === null || line.table === null) {
    return null;
  }

  const content = fragmentOf(line.html);
  const caption = content.querySelector(CAPTION_SELECTOR);
  const row = content.querySelector(ROW_SELECTOR);

  if (caption !== null) {
    return [CAPTION_START + changedTextOf(caption)];
  }

  return row === null ? [] : Array.from(row.children, cellSummary);
}

function cellSummary(cell: Element): string {
  const columnSpan = (cell as HTMLTableCellElement).colSpan;
  const columns = columnSpan > 1 ? COLUMNS_START + columnSpan + COLUMNS_END : '';

  if (cell.classList.contains(GAP_CELL_CLASS)) {
    return GAP + columns;
  }

  if (cell.hasAttribute(CONTINUED_CELL_ATTRIBUTE)) {
    return CONTINUED + columns;
  }

  return wholeCellMark(cell) + changedTextOf(cell) + columns;
}

function wholeCellMark(cell: Element): string {
  if (!cell.classList.contains(WHOLE_CELL_CLASS)) {
    return '';
  }

  return cell.classList.contains(REMOVED_CLASS) ? REMOVED_CELL : ADDED_CELL;
}

/** Text of an element with removed and added text shown as `[-text]` and `[+text]`. */
function changedTextOf(element: Element): string {
  const copy = element.cloneNode(true) as Element;

  for (const removed of copy.querySelectorAll(REMOVED_TEXT_SELECTOR)) {
    removed.replaceWith(REMOVED_TEXT_START + removed.textContent + CHANGED_TEXT_END);
  }

  for (const added of copy.querySelectorAll(ADDED_TEXT_SELECTOR)) {
    added.replaceWith(ADDED_TEXT_START + added.textContent + CHANGED_TEXT_END);
  }

  return copy.textContent ?? '';
}

/** The number of cells and of hidden copies of rows in a table line. */
function sizersOf(line: ViewLine | null) {
  const content = fragmentOf(line?.html ?? '');
  const copiedRows = Array.from(content.querySelectorAll(SIZER_ROWS_SELECTOR));

  return copiedRows.map((row) => row.children.length);
}

describe('diffHtml with merged tables', () => {
  it('shows an added column, a changed cell, a removed row and an added row as one table', () => {
    expect(mergedTableOf(PRICES_BEFORE, PRICES_AFTER)).toEqual([
      [LineChangeKind.Changed, ['Plan', 'Price', '+Users']],
      [LineChangeKind.Changed, ['Start', '19 USD', '+1']],
      [LineChangeKind.Changed, ['Pro', '[-49] [+59] USD', '+5']],
      [LineChangeKind.Removed, ['-Trial', '-0 USD', GAP]],
      [LineChangeKind.Added, ['+Company', '+149 USD', '+25']],
    ]);
  });

  it('puts a removed column where it stood, and leaves a gap for it in an added row', () => {
    expect(
      mergedTableOf(
        '<table><tr><th>Plan</th><th>Seats</th><th>Price</th></tr><tr><td>Start</td><td>1</td><td>19</td></tr><tr><td>Pro</td><td>5</td><td>49</td></tr></table>',
        '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Start</td><td>19</td></tr><tr><td>Pro</td><td>49</td></tr><tr><td>Max</td><td>99</td></tr></table>',
      ),
    ).toEqual([
      [LineChangeKind.Changed, ['Plan', '-Seats', 'Price']],
      [LineChangeKind.Changed, ['Start', '-1', '19']],
      [LineChangeKind.Changed, ['Pro', '-5', '49']],
      [LineChangeKind.Added, ['+Max', GAP, '+99']],
    ]);
  });

  it('puts an added column in its place in every row', () => {
    expect(
      mergedTableOf(
        '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Start</td><td>19</td></tr><tr><td>Pro</td><td>49</td></tr></table>',
        '<table><tr><th>Plan</th><th>Seats</th><th>Price</th></tr><tr><td>Start</td><td>1</td><td>19</td></tr><tr><td>Pro</td><td></td><td>49</td></tr></table>',
      ),
    ).toEqual([
      [LineChangeKind.Changed, ['Plan', '+Seats', 'Price']],
      [LineChangeKind.Changed, ['Start', '+1', '19']],
      [LineChangeKind.Changed, ['Pro', ADDED_CELL, '49']],
    ]);
  });

  it('keeps a cell over two columns over the same columns', () => {
    expect(
      mergedTableOf(
        '<table><tr><th>Plan</th><th>Price</th><th>Storage</th></tr><tr><td>Team</td><td colspan="2">Ask us</td></tr></table>',
        '<table><tr><th>Plan</th><th>Price</th><th>Storage</th><th>Users</th></tr><tr><td>Team</td><td colspan="2">Ask us</td><td>50</td></tr></table>',
      ),
    ).toEqual([
      [LineChangeKind.Changed, ['Plan', 'Price', 'Storage', '+Users']],
      [LineChangeKind.Changed, ['Team', 'Ask us (2 columns)', '+50']],
    ]);
  });

  it('keeps the empty copy of a cell over two rows in the row below it', () => {
    expect(
      mergedTableOf(
        '<table><tr><td>Plan</td><td>Price</td></tr><tr><td>Start</td><td>19</td></tr><tr><td>Pro</td><td>49</td></tr></table>',
        '<table><tr><td>Plan</td><td>Price</td><td>Note</td></tr><tr><td>Start</td><td>19</td><td rowspan="2">Both</td></tr><tr><td>Pro</td><td>49</td></tr></table>',
      ),
    ).toEqual([
      [LineChangeKind.Changed, ['Plan', 'Price', '+Note']],
      [LineChangeKind.Changed, ['Start', '19', '+Both']],
      [LineChangeKind.Unchanged, ['Pro', '49', CONTINUED]],
    ]);
  });

  it('leaves a table as it is when a cell spans a column that only the other version has', () => {
    const rows = compare(
      '<table><tr><td>Plan</td><td>Seats</td><td>Price</td></tr><tr><td>Start</td><td>1</td><td>19</td></tr></table>',
      '<table><tr><td colspan="2">Plan and price</td></tr><tr><td>Start</td><td>19</td></tr></table>',
    );

    expect(rows.map((row) => row.mergedLine)).toEqual(rows.map(() => null));
  });

  it('merges a changed caption like text', () => {
    expect(
      mergedTableOf(
        '<table><caption>Prices of the old plans</caption><tr><td>Plan</td><td>Price</td></tr></table>',
        '<table><caption>Prices of the new plans</caption><tr><td>Plan</td><td>Price</td></tr></table>',
      ),
    ).toEqual([
      [LineChangeKind.Changed, ['caption: Prices of the [-old] [+new] plans']],
      [LineChangeKind.Unchanged, ['Plan', 'Price']],
    ]);
  });

  it('puts removed text into its own cell, also at the end of a cell and into an emptied cell', () => {
    expect(
      mergedTableOf(
        '<table><tr><td>Personal plan</td><td>4 USD a month</td><td>20 GB</td><td>Unlimited</td></tr></table>',
        '<table><tr><td>Personal</td><td>4 USD a month</td><td>20 GB</td><td></td></tr></table>',
      ),
    ).toEqual([
      [LineChangeKind.Changed, ['Personal [-plan]', '4 USD a month', '20 GB', '[-Unlimited]']],
    ]);
  });

  it('gives every line of a table with the same columns the column groups of the new table', () => {
    const rows = compare(
      '<table><colgroup><col style="width: 30%"><col></colgroup><tr><td>Plan</td><td>Price</td></tr><tr><td>Trial</td><td>0</td></tr></table>',
      '<table><colgroup><col style="width: 40%"><col></colgroup><tr><td>Plan</td><td>Price</td></tr><tr><td>Start</td><td>29</td></tr></table>',
    );
    const columnGroups = rows.map(
      (row) =>
        fragmentOf(row.mergedLine?.html ?? '').querySelector(COLUMN_GROUP_SELECTOR)?.outerHTML,
    );

    expect(rows.map((row) => row.kind)).toEqual([
      LineChangeKind.Unchanged,
      LineChangeKind.Removed,
      LineChangeKind.Added,
    ]);
    expect(new Set(columnGroups)).toEqual(
      new Set(['<colgroup><col style="width: 40%;"><col></colgroup>']),
    );
  });

  it('gives no column groups to a table whose versions have other columns', () => {
    const [row] = compare(
      '<table><colgroup><col><col></colgroup><tr><td>Plan</td><td>Price</td></tr></table>',
      '<table><colgroup><col><col><col></colgroup><tr><td>Plan</td><td>Price</td><td>Users</td></tr></table>',
    );

    expect(fragmentOf(row.mergedLine?.html ?? '').querySelector(COLUMN_GROUP_SELECTOR)).toBeNull();
  });

  it('gives every line of a merged table hidden copies of the merged rows', () => {
    const rows = compare(PRICES_BEFORE, PRICES_AFTER);

    expect(rows.map((row) => sizersOf(row.mergedLine))).toEqual(rows.map(() => [3, 3, 3, 3, 3]));
    expect(rows.map((row) => row.mergedLine?.table)).toEqual(rows.map(() => 0));
  });

  it('leaves tables as they are when the rows of one table pair with the rows of two tables', () => {
    const rows = compare(
      '<table><tr><td>Plan Start</td><td>19 USD</td></tr><tr><td>Plan Pro</td><td>49 USD</td></tr></table>',
      '<table><tr><td>Plan Start</td><td>29 USD</td></tr></table><p>More plans:</p><table><tr><td>Plan Pro</td><td>59 USD</td></tr></table>',
    );

    expect(rows.filter((row) => row.kind === LineChangeKind.Changed)).toHaveLength(2);
    expect(rows.map((row) => row.mergedLine)).toEqual(rows.map(() => null));
  });

  it('merges no tables unless the settings ask for it', () => {
    const rows = compare(PRICES_BEFORE, PRICES_AFTER, false);

    expect(rows.map((row) => row.mergedLine)).toEqual(rows.map(() => null));
  });

  it.each(LONG_SAMPLES)('shows each table of %s as one table', (_, before, after) => {
    const tableRows = compare(before, after).filter(
      (row) => (row.newLine ?? row.oldLine)?.table !== null,
    );
    const columnCounts = tableRows.map((row) => sizersOf(row.mergedLine).at(0));

    expect(tableRows.length).toBeGreaterThan(0);
    expect(tableRows.every((row) => row.mergedLine !== null)).toBe(true);
    expect(new Set(columnCounts)).toEqual(new Set([4, 5, 3]));
  });

  it('merges the tables of the Polish long sample like those of the English one', () => {
    const englishLines = mergedLinesOfSample(...sampleOf('en/long'));
    const polishLines = mergedLinesOfSample(...sampleOf('pl/long'));
    const shapeOf = (lines: (string[] | null)[]) => lines.map((line) => line?.length ?? null);

    expect(shapeOf(polishLines)).toEqual(shapeOf(englishLines));
  });
});
