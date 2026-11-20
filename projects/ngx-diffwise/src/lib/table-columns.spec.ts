import { sizeTableColumns } from './table-columns';

const TABLE_SELECTOR = 'table';
const CELL_SELECTOR = 'td';
const SIZERS_SELECTOR = '[data-diffwise-column-sizers]';
const FIXED_LAYOUT = 'fixed';
const NO_SIZERS = null;

/** Hidden copies of a row of two cells, as the engine makes them. */
const SIZERS_HTML =
  '<tbody data-diffwise-column-sizers="" aria-hidden="true"><tr><td><div>Plan</div></td><td><div>Price</div></td></tr></tbody>';

/** The edges of an element in the tests, by element; jsdom lays out nothing. */
const boxes = new WeakMap<Element, { readonly left: number; readonly width: number }>();

/** A table line with a key, a row of cells and, if given, hidden copies of rows. */
function tableLine(key: string, cells: string, sizers = ''): string {
  return `<div data-diffwise-columns="${key}"><table data-diffwise-table-copy=""><tbody><tr>${cells}</tr></tbody>${sizers}</table></div>`;
}

/** A host with the lines, the first table laid out with columns of 40 px and 60 px. */
function hostWith(...lines: string[]): HTMLElement {
  const host = document.createElement('div');

  host.innerHTML = lines.join('');

  const firstTable = host.querySelector(TABLE_SELECTOR);
  const [first, second] = Array.from(firstTable?.querySelectorAll(CELL_SELECTOR) ?? []);

  if (firstTable && first && second) {
    boxes.set(firstTable, { left: 0, width: 102 });
    boxes.set(first, { left: 1, width: 40 });
    boxes.set(second, { left: 41, width: 60 });
  }

  return host;
}

/** Widths of the cells of each table, with `fixed` for a table laid out with given widths. */
function widthsOf(host: HTMLElement) {
  return Array.from(host.querySelectorAll(TABLE_SELECTOR), (table) => [
    table.style.tableLayout === FIXED_LAYOUT ? table.style.width : null,
    Array.from(table.querySelectorAll(`:scope > :not(${SIZERS_SELECTOR}) > tr > td`), (cell) =>
      cell instanceof HTMLElement ? cell.style.width : null,
    ),
  ]);
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const { left, width } = boxes.get(this) ?? { left: 0, width: 0 };

    return DOMRect.fromRect({ x: left, y: 0, width, height: 0 });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sizeTableColumns', () => {
  it('gives the other lines of a table the widths of the columns of its line with copies of rows', () => {
    const host = hostWith(
      tableLine('new-0', '<td>Plan</td><td>Price</td>', SIZERS_HTML),
      tableLine('new-0', '<td>Free</td><td>0</td>'),
      tableLine('new-0', '<td colspan="2">Prices may change.</td>'),
    );

    sizeTableColumns(host, () => NO_SIZERS);

    expect(widthsOf(host)).toEqual([
      [null, ['', '']],
      ['102px', ['40px', '60px']],
      ['102px', ['100px']],
    ]);
  });

  it('gives the copies of rows to the first drawn line of a table without its line with copies', () => {
    const host = hostWith(
      tableLine('old-0', '<td>Free</td><td>0</td>'),
      tableLine('old-0', '<td>Family</td><td>9</td>'),
    );

    sizeTableColumns(host, (key) => (key === 'old-0' ? SIZERS_HTML : NO_SIZERS));

    const [first, second] = Array.from(host.querySelectorAll(TABLE_SELECTOR));

    expect(first.querySelector(SIZERS_SELECTOR)).not.toBeNull();
    expect(second.querySelector(SIZERS_SELECTOR)).toBeNull();
    expect(widthsOf(host)).toEqual([
      [null, ['', '']],
      ['102px', ['40px', '60px']],
    ]);
  });

  it('keeps the lines of other tables and versions apart', () => {
    const host = hostWith(
      tableLine('new-0', '<td>Plan</td><td>Price</td>', SIZERS_HTML),
      tableLine('old-0', '<td>Free</td><td>0</td>'),
    );

    sizeTableColumns(host, () => NO_SIZERS);

    expect(widthsOf(host)).toEqual([
      [null, ['', '']],
      [null, ['', '']],
    ]);
  });
});
