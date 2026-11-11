import type { ColumnMatch } from './align-table-columns';
import { allChangedText, diffTableCells } from './diff-table-cells';
import { parseHtml } from '../html/parse-html';
import { splitLines } from '../html/split-lines';
import { DEFAULT_DIFF_OPTIONS, type Line, type TableCell, type TextRange } from '../model';

const ID_PREFIX = 'diff-';
const NO_ROW_ERROR = 'The HTML has no table row.';

/** Columns of two tables with the same columns. */
const SAME_COLUMNS: ColumnMatch = {
  oldToNew: new Map([
    [0, 0],
    [1, 1],
    [2, 2],
  ]),
};

/** Columns of an old table with three columns and a new one with a column added as the second. */
const COLUMN_ADDED_SECOND: ColumnMatch = {
  oldToNew: new Map([
    [0, 0],
    [1, 2],
    [2, 3],
  ]),
};

/** The line of a table row with the given cells. */
function rowLine(cellsHtml: string): Line {
  const [line] = splitLines(parseHtml(`<table><tr>${cellsHtml}</tr></table>`), ID_PREFIX);

  if (line === undefined) {
    throw new Error(NO_ROW_ERROR);
  }

  return line;
}

/** Texts of the ranges of a line. */
function textsOf(line: Line, ranges: readonly TextRange[]): string[] {
  return ranges.map(({ start, end }) => line.text.slice(start, end));
}

/** Texts of the cells of a line at the positions. */
function cellTexts(line: Line, positions: readonly number[]): string[] {
  return positions.map((position) => textOfCell(line, line.cells[position]));
}

function textOfCell(line: Line, { start, end }: TableCell): string {
  return line.text.slice(start, end);
}

/** Changes of a row pair as `[removed words, added words, removed cells, added cells]`. */
function cellChangesSummary(oldCells: string, newCells: string, columns = SAME_COLUMNS) {
  const oldLine = rowLine(oldCells);
  const newLine = rowLine(newCells);
  const { wordChanges, removedCells, addedCells } = diffTableCells(
    oldLine,
    newLine,
    columns,
    DEFAULT_DIFF_OPTIONS,
  );

  return [
    textsOf(oldLine, wordChanges.removed),
    textsOf(newLine, wordChanges.added),
    cellTexts(oldLine, removedCells),
    cellTexts(newLine, addedCells),
  ];
}

describe('diffTableCells', () => {
  it('compares the cells of the same column word by word', () => {
    expect(
      cellChangesSummary(
        '<td>Personal</td><td>49 EUR</td><td>20 GB</td>',
        '<td>Personal</td><td>59 EUR</td><td>20 GB</td>',
      ),
    ).toEqual([['49'], ['59'], [], []]);
  });

  it('keeps a change in its cell, also when the same words stand in the next cell', () => {
    expect(
      cellChangesSummary(
        '<td>Version history</td><td>1 year</td><td>1 year</td>',
        '<td>Version history</td><td>1 year</td><td>Unlimited</td>',
      ),
    ).toEqual([['1 year'], ['Unlimited'], [], []]);
  });

  it('marks the cells of an added column whole, also an empty one', () => {
    expect(
      cellChangesSummary(
        '<td>Offline access</td><td>yes</td><td>yes</td>',
        '<td>Offline access</td><td>yes</td><td>yes</td><td>yes</td>',
        COLUMN_ADDED_SECOND,
      ),
    ).toEqual([[], [], [], ['yes']]);
    expect(
      cellChangesSummary(
        '<td>Offline access</td><td>yes</td><td>yes</td>',
        '<td>Offline access</td><td></td><td>yes</td><td>yes</td>',
        COLUMN_ADDED_SECOND,
      ),
    ).toEqual([[], [], [], ['']]);
  });

  it('marks the cells of a removed column whole', () => {
    const columns = { oldToNew: new Map([[0, 0]]) };

    expect(
      cellChangesSummary('<td>Offline access</td><td>yes</td>', '<td>Offline access</td>', columns),
    ).toEqual([[], [], ['yes'], []]);
  });

  it('shows text moved to the next cell as removed from one cell and added to the other', () => {
    expect(
      cellChangesSummary(
        '<td>Offline access</td><td>yes</td><td></td>',
        '<td>Offline access</td><td></td><td>yes</td>',
      ),
    ).toEqual([['yes'], ['yes'], [], []]);
  });

  it('compares cells merged into one, and a cell split into two, as one', () => {
    expect(
      cellChangesSummary(
        '<td>Business</td><td>1 TB</td><td>per user</td>',
        '<td>Business</td><td colspan="2">2 TB per user</td>',
      ),
    ).toEqual([['1'], ['2'], [], []]);
    expect(
      cellChangesSummary(
        '<td>Business</td><td colspan="2">1 TB per user</td>',
        '<td>Business</td><td>2 TB</td><td>per user</td>',
      ),
    ).toEqual([['1'], ['2'], [], []]);
  });

  it('compares a cell over two columns next to an added column with its own cell', () => {
    expect(
      cellChangesSummary(
        '<td>Business</td><td colspan="2">1 TB per user</td>',
        '<td>Business</td><td>new</td><td colspan="2">2 TB per user</td>',
        COLUMN_ADDED_SECOND,
      ),
    ).toEqual([['1'], ['2'], [], ['new']]);
  });

  it('marks a cell whose place the other row leaves empty whole', () => {
    expect(cellChangesSummary('<td>Search</td><td>Ctrl + F</td>', '<td>Search</td>')).toEqual([
      [],
      [],
      ['Ctrl + F'],
      [],
    ]);
  });
});

describe('allChangedText', () => {
  it('adds the text of whole cells to the changed words, in reading order', () => {
    const oldLine = rowLine('<td>Personal</td><td>4 EUR</td><td>yes</td>');
    const newLine = rowLine('<td>Personal</td><td>new</td><td>5 EUR</td><td>yes</td>');
    const changes = diffTableCells(oldLine, newLine, COLUMN_ADDED_SECOND, DEFAULT_DIFF_OPTIONS);
    const { removed, added } = allChangedText(oldLine, newLine, changes);

    expect(textsOf(oldLine, removed)).toEqual(['4']);
    expect(textsOf(newLine, added)).toEqual(['new', '5']);
  });
});
