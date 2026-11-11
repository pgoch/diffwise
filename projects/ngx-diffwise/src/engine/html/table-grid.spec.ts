import { parseHtml } from './parse-html';
import { mapReaderText } from './reader-text';
import { type GridCell, type GridRow, rowCells, tableGrid } from './table-grid';

const TABLE_SELECTOR = 'table';

/** Rows of the first table of a document. */
function gridOf(html: string): GridRow[] {
  const table = parseHtml(html).querySelector(TABLE_SELECTOR);
  return table === null ? [] : tableGrid(table);
}

/** A cell as `[text, column, column span, row span]`. */
function cellShape({ element, column, columnSpan, rowSpan }: GridCell) {
  return [element.textContent, column, columnSpan, rowSpan];
}

/** Each row as its cells, and the texts of cells from rows above that span it. */
function gridShape(html: string) {
  return gridOf(html).map(({ cells, spanningCells }) => ({
    cells: cells.map(cellShape),
    spannedBy: spanningCells.map(({ element }) => element.textContent),
  }));
}

/** Texts of the rows of a table, in the order of the grid. */
function rowTexts(html: string): (string | null)[] {
  return gridOf(html).map(({ element }) => element.textContent);
}

describe('tableGrid', () => {
  it('gives each cell the column it starts in, after the places of cells from rows above', () => {
    const html = `
      <table>
        <tr><td>Plan</td><td rowspan="2" colspan="2">Unlimited</td></tr>
        <tr><td>Personal</td></tr>
        <tr><td>Team</td><td>5</td><td>6</td></tr>
      </table>`;

    expect(gridShape(html)).toEqual([
      {
        cells: [
          ['Plan', 0, 1, 1],
          ['Unlimited', 1, 2, 2],
        ],
        spannedBy: [],
      },
      { cells: [['Personal', 0, 1, 1]], spannedBy: ['Unlimited'] },
      {
        cells: [
          ['Team', 0, 1, 1],
          ['5', 1, 1, 1],
          ['6', 2, 1, 1],
        ],
        spannedBy: [],
      },
    ]);
  });

  it('moves a cell past the place of a cell from above in the first column', () => {
    const html =
      '<table><tr><td rowspan="2">Free</td><td>0</td></tr><tr><td>1 GB</td></tr></table>';

    expect(gridShape(html)[1]).toEqual({ cells: [['1 GB', 1, 1, 1]], spannedBy: ['Free'] });
  });

  it('ends a cell that spans rows at the end of its row group', () => {
    const html = `
      <table>
        <tbody><tr><td rowspan="5">Unlimited</td></tr><tr><td>Family</td></tr></tbody>
        <tfoot><tr><td>Prices include VAT.</td></tr></tfoot>
      </table>`;

    expect(gridShape(html)).toEqual([
      { cells: [['Unlimited', 0, 1, 2]], spannedBy: [] },
      { cells: [['Family', 1, 1, 1]], spannedBy: ['Unlimited'] },
      { cells: [['Prices include VAT.', 0, 1, 1]], spannedBy: [] },
    ]);
  });

  it('spans a cell with a row span of 0 to the end of its row group', () => {
    const html =
      '<table><tr><td rowspan="0">A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr></table>';

    expect(gridShape(html)[0].cells).toEqual([['A', 0, 1, 3]]);
  });

  it('counts a cell with a wrong or a zero column span as one column', () => {
    const html =
      '<table><tr><td colspan="wide">A</td><td colspan="0">B</td><td>C</td></tr></table>';

    expect(gridShape(html)[0].cells).toEqual([
      ['A', 0, 1, 1],
      ['B', 1, 1, 1],
      ['C', 2, 1, 1],
    ]);
  });

  it('orders the rows as a browser shows them: the first head first and the first foot last', () => {
    const html = `
      <table>
        <tfoot><tr><td>Foot</td></tr></tfoot>
        <tbody><tr><td>Body 1</td></tr></tbody>
        <thead><tr><td>Head</td></tr></thead>
        <thead><tr><td>Second head</td></tr></thead>
        <tbody><tr><td>Body 2</td></tr></tbody>
      </table>`;

    expect(rowTexts(html)).toEqual(['Head', 'Body 1', 'Second head', 'Body 2', 'Foot']);
  });

  it('gives each row its row group', () => {
    const html =
      '<table><thead><tr><th>Plan</th></tr></thead><tbody><tr><td>Free</td></tr></tbody></table>';

    expect(gridOf(html).map(({ group }) => group.localName)).toEqual(['thead', 'tbody']);
  });
});

describe('rowCells', () => {
  it('gives each cell its part of the row text, and an empty cell an empty part', () => {
    const [row] = gridOf(
      '<table><tr><td>Plan</td><td></td><td><img src="a.svg"> Free</td></tr></table>',
    );
    const { pieces } = mapReaderText([row.element]);

    expect(rowCells(row, pieces)).toEqual([
      { start: 0, end: 4, column: 0, columnSpan: 1 },
      { start: 4, end: 4, column: 1, columnSpan: 1 },
      { start: 5, end: 11, column: 2, columnSpan: 1 },
    ]);
  });
});
