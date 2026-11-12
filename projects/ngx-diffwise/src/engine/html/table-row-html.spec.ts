import { parseHtml } from './parse-html';
import { tableGrid } from './table-grid';
import { type TableLinePlace, completeTableCopy } from './table-row-html';

const TABLE_SELECTOR = 'table';
const CAPTION_SELECTOR = 'caption';
const NO_TABLE_ERROR = 'The HTML has no table.';
const NO_CAPTION_ERROR = 'The table has no caption.';

const TABLE_COPY = 'data-diffwise-table-copy=""';
const FIRST_LINE = 'data-diffwise-first-table-line=""';
const FIRST_ROW = 'data-diffwise-first-table-row=""';
const LAST_ROW = 'data-diffwise-last-table-row=""';
const CONTINUED_CELL = 'data-diffwise-continued-cell=""';

/** A line in the middle of a table: neither its first line nor its first or last row. */
const MIDDLE: TableLinePlace = { isFirstLine: false, isFirstRow: false, isLastRow: false };

/** The first line of a table without a caption: its first row. */
const FIRST: TableLinePlace = { isFirstLine: true, isFirstRow: true, isLastRow: false };

const LAST: TableLinePlace = { ...MIDDLE, isLastRow: true };

/** Rows of a table about prices, where `Unlimited` spans two rows and two columns. */
const PRICES = `
  <table>
    <tr><td>Personal</td><td id="limit" rowspan="2" colspan="2" class="wide">Unlimited</td></tr>
    <tr><td>Family</td></tr>
    <tr><td rowspan="1">Team</td><td>5</td><td>6</td></tr>
  </table>`;

/** The completed table copy of a line that shows one row of the table. */
function rowLineHtml(
  tableHtml: string,
  rowIndex: number,
  place: TableLinePlace = MIDDLE,
  keepsIds = true,
): string {
  const table = firstTable(tableHtml);
  const row = tableGrid(table)[rowIndex];
  const copy = shallowCopy(table);

  copy.appendChild(shallowCopy(row.group)).append(row.element.cloneNode(true));
  completeTableCopy(copy, { table, number: 0, row, place }, keepsIds);

  return copy.outerHTML;
}

/** The completed table copy of the line of the table's caption. */
function captionLineHtml(tableHtml: string, keepsIds: boolean): string {
  const table = firstTable(tableHtml);
  const caption = table.querySelector(CAPTION_SELECTOR);
  const copy = shallowCopy(table);
  const place = { ...MIDDLE, isFirstLine: true };

  if (caption === null) {
    throw new Error(NO_CAPTION_ERROR);
  }

  copy.append(caption.cloneNode(true));
  completeTableCopy(copy, { table, number: 0, row: null, place }, keepsIds);

  return copy.outerHTML;
}

function firstTable(html: string): Element {
  const table = parseHtml(html).querySelector(TABLE_SELECTOR);

  if (table === null) {
    throw new Error(NO_TABLE_ERROR);
  }

  return table;
}

function shallowCopy(element: Element): Element {
  return element.cloneNode(false) as Element;
}

describe('completeTableCopy', () => {
  it('marks the copy of the table and the place of its line in the table', () => {
    const html = '<table class="plans"><tr><td>Free</td></tr><tr><td>Personal</td></tr></table>';

    expect(rowLineHtml(html, 0, FIRST)).toBe(
      `<table class="plans" ${TABLE_COPY} ${FIRST_LINE} ${FIRST_ROW}><tbody><tr><td>Free</td></tr></tbody></table>`,
    );
    expect(rowLineHtml(html, 1, LAST)).toBe(
      `<table class="plans" ${TABLE_COPY} ${LAST_ROW}><tbody><tr><td>Personal</td></tr></tbody></table>`,
    );
  });

  it('ends a cell that spans rows in its own row and drops every row span', () => {
    expect(rowLineHtml(PRICES, 0)).toBe(
      `<table ${TABLE_COPY}><tbody><tr><td>Personal</td><td id="limit" colspan="2" class="wide">Unlimited</td></tr></tbody></table>`,
    );
    expect(rowLineHtml(PRICES, 2)).toBe(
      `<table ${TABLE_COPY}><tbody><tr><td>Team</td><td>5</td><td>6</td></tr></tbody></table>`,
    );
  });

  it('keeps the place of a cell from a row above as a copy without content, id or row span', () => {
    expect(rowLineHtml(PRICES, 1)).toBe(
      `<table ${TABLE_COPY}><tbody><tr><td>Family</td><td colspan="2" class="wide" ${CONTINUED_CELL}></td></tr></tbody></table>`,
    );
  });

  it('puts the place of a cell from a row above in its column, before the cells after it', () => {
    const html =
      '<table><tr><th rowspan="2">Free</th><td>0</td></tr><tr><td>1 GB</td></tr></table>';

    expect(rowLineHtml(html, 1)).toBe(
      `<table ${TABLE_COPY}><tbody><tr><th ${CONTINUED_CELL}></th><td>1 GB</td></tr></tbody></table>`,
    );
  });

  it('adds the column groups of the table before its rows, with ids only when the line keeps them', () => {
    const html =
      '<table><colgroup id="widths"><col id="first" span="2"></colgroup><tr><td>Free</td></tr></table>';

    expect(rowLineHtml(html, 0, MIDDLE, true)).toBe(
      `<table ${TABLE_COPY}><colgroup id="widths"><col id="first" span="2"></colgroup><tbody><tr><td>Free</td></tr></tbody></table>`,
    );
    expect(rowLineHtml(html, 0, MIDDLE, false)).toBe(
      `<table ${TABLE_COPY}><colgroup><col span="2"></colgroup><tbody><tr><td>Free</td></tr></tbody></table>`,
    );
  });

  it('adds the column groups after the caption in the line of the caption', () => {
    const html =
      '<table><caption>Plans</caption><colgroup><col span="2"></colgroup><tr><td>Free</td></tr></table>';

    expect(captionLineHtml(html, true)).toBe(
      `<table ${TABLE_COPY} ${FIRST_LINE}><caption>Plans</caption><colgroup><col span="2"></colgroup></table>`,
    );
  });
});
