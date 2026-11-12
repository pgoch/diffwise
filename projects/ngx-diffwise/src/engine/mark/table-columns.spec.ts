import { parseHtml } from '../html/parse-html';
import { readerText } from '../html/reader-text';
import { splitLines } from '../html/split-lines';
import type { ViewLine } from '../model';
import { addTableColumns } from './table-columns';

const ID_PREFIX = 'diff-';
const TEMPLATE_TAG = 'template';
const COLUMN_SIZERS_SELECTOR = '[data-diffwise-column-sizers]';
const SIZER_ROWS_SELECTOR = `${COLUMN_SIZERS_SELECTOR} > tr`;
const SIZER_CONTENT_SELECTOR = `${SIZER_ROWS_SELECTOR} > * > div`;
const ALL_ELEMENTS = '*';
const DIFFWISE_DATA_ATTRIBUTE_START = 'data-diffwise-';
const ARIA_HIDDEN_ATTRIBUTE = 'aria-hidden';
const ADDED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--added';

/** A table with more rows than the ones whose copies every line of a bigger table gets. */
const BIG_TABLE_ROW_COUNT = 40;

/** Lines of a document as the view shows them, numbered from 1. */
function viewLines(html: string): ViewLine[] {
  return splitLines(parseHtml(html), ID_PREFIX).map((line, index) => ({
    kind: line.kind,
    number: index + 1,
    html: line.html,
    table: line.table,
  }));
}

function fragmentOf(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content;
}

/** Texts of the copied rows of a line. */
function sizerTexts(line: ViewLine | null): string[] {
  const rows = fragmentOf(line?.html ?? '').querySelectorAll(SIZER_ROWS_SELECTOR);
  return Array.from(rows, (row) => readerText([row]));
}

/** Names of the attributes in the copied rows of a line. */
function sizerAttributeNames(line: ViewLine | null): string[] {
  const sizers = fragmentOf(line?.html ?? '').querySelector(COLUMN_SIZERS_SELECTOR);
  const elements = sizers?.querySelectorAll(ALL_ELEMENTS) ?? [];

  return Array.from(elements).flatMap((element) => element.getAttributeNames());
}

/** A table whose cells have the given texts; every row has two cells unless one spans both. */
function tableOf(rows: readonly (readonly string[])[]): string {
  const rowsHtml = rows.map((cells) => {
    const cellsHtml =
      cells.length === 1
        ? `<td colspan="2">${cells[0]}</td>`
        : cells.map((cell) => `<td>${cell}</td>`).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  return `<table>${rowsHtml.join('')}</table>`;
}

describe('addTableColumns', () => {
  it('gives each line of a table hidden copies of all rows of its table, the caption line too', () => {
    const lines = addTableColumns(
      viewLines(
        '<table><caption>Plans</caption><tr><th>Plan</th></tr><tr><td>Free</td></tr></table>',
      ),
    );

    expect(lines.map(sizerTexts)).toEqual([
      ['Plan', 'Free'],
      ['Plan', 'Free'],
      ['Plan', 'Free'],
    ]);
  });

  it('puts the copies at the end of the table copy, hidden from screen readers, with the content of each cell in a box', () => {
    const [line] = addTableColumns(viewLines('<table><tr><td>Free</td><td>0</td></tr></table>'));
    const fragment = fragmentOf(line?.html ?? '');
    const sizers = fragment.querySelector(COLUMN_SIZERS_SELECTOR);
    const boxes = fragment.querySelectorAll(SIZER_CONTENT_SELECTOR);

    expect(sizers?.parentElement?.lastElementChild).toBe(sizers);
    expect(sizers?.getAttribute(ARIA_HIDDEN_ATTRIBUTE)).toBe('true');
    expect(Array.from(boxes, (box) => box.textContent)).toEqual(['Free', '0']);
  });

  it('copies the marks of the rows, without the attributes of the originals', () => {
    const html = `
      <table>
        <tr><td id="free"><a name="plans">Free</a></td><td><video src="intro.mp4" autoplay></video></td></tr>
      </table>`;
    const [line] = viewLines(html);
    const markedHtml = line.html.replace(
      'Free',
      `<ins class="${ADDED_CLASSES}" data-diffwise-change-details="0">Free</ins>`,
    );
    const [markedLine] = addTableColumns([{ ...line, html: markedHtml }]);
    const sizersHtml = fragmentOf(markedLine?.html ?? '').querySelector(
      COLUMN_SIZERS_SELECTOR,
    )?.innerHTML;

    expect(sizersHtml).toContain(`<ins class="${ADDED_CLASSES}">Free</ins>`);
    expect(sizerAttributeNames(markedLine)).toEqual(['class', 'src']);
    expect(
      sizerAttributeNames(markedLine).some((name) =>
        name.startsWith(DIFFWISE_DATA_ATTRIBUTE_START),
      ),
    ).toBe(false);
  });

  it('gives each table its own copies and leaves gaps and other lines as they are', () => {
    const lines = viewLines(
      '<table><tr><td>Free</td></tr></table><p>Shortcuts</p><table><tr><td>Search</td></tr></table>',
    );
    const withGap = [lines[0], null, lines[1], lines[2]];
    const result = addTableColumns(withGap);

    expect(result.map(sizerTexts)).toEqual([['Free'], [], [], ['Search']]);
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(lines[1]);
  });

  it('copies in a bigger table only the rows with the longest text and the longest word of each place', () => {
    const rows = Array.from({ length: BIG_TABLE_ROW_COUNT }, (_, index) => [`row ${index}`, 'yes']);

    rows[7] = ['one two three four five', 'yes'];
    rows[12] = ['extraordinarily', 'yes'];
    rows[20] = ['notes and files in one cell'];

    const [firstLine] = addTableColumns(viewLines(tableOf(rows)));

    expect(sizerTexts(firstLine)).toEqual([
      'row 0 yes',
      'one two three four five yes',
      'extraordinarily yes',
      'notes and files in one cell',
    ]);
  });
});
