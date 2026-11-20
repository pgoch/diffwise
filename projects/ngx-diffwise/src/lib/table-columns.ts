/**
 * Marks the lines of a table that share its columns, such as `old-0`: the lines of one version of
 * the table, or its merged lines.
 */
const COLUMNS_ATTRIBUTE = 'data-diffwise-columns';
const COLUMNS_LINE_SELECTOR = `[${COLUMNS_ATTRIBUTE}]`;
const TABLE_COPY_SELECTOR = 'table[data-diffwise-table-copy]';

/** The hidden copies of rows that give a table line the columns of its table. */
const COLUMN_SIZERS_SELECTOR = ':scope > [data-diffwise-column-sizers]';

/** The row of a table line, besides the hidden copies. */
const OWN_ROW_SELECTOR = ':scope > :not([data-diffwise-column-sizers]) > tr';

/** Holds the widths a table line has been given, so the same widths are not given again. */
const GIVEN_WIDTHS_ATTRIBUTE = 'data-diffwise-column-widths';

const AT_END: InsertPosition = 'beforeend';
const FIXED_LAYOUT = 'fixed';
const BORDER_BOX = 'border-box';
const PIXELS = 'px';
const WIDTHS_SEPARATOR = ' ';
const TABLE_LAYOUT_PROPERTY = 'table-layout';
const WIDTH_PROPERTY = 'width';
const BOX_SIZING_PROPERTY = 'box-sizing';

const COLUMN_SIZERS_ATTRIBUTE = 'data-diffwise-column-sizers';
const TEMPLATE_TAG = 'template';

/** The widths of the columns of a table line, and of its whole table, in pixels. */
interface TableWidths {
  readonly columns: readonly number[];
  readonly table: number;
}

/**
 * Gives the lines of each table the columns of the whole table. Only the first line of a table
 * with a row holds hidden copies of the rows of the table, which make the browser lay out its row
 * like the whole table; each other line gets the widths of its columns. When that line is not
 * drawn, such as behind hidden lines, the first drawn line of the table with a row gets the copies
 * from `sizersOf`. Reads the layout once for all tables, then writes.
 */
export function sizeTableColumns(
  host: HTMLElement,
  sizersOf: (key: string) => string | null,
): void {
  const tablesByKey = tableCopiesByKey(host);
  const sources = new Map<string, HTMLTableElement>();

  for (const [key, tables] of tablesByKey) {
    const source = sizedTableOf(tables) ?? withSizers(tables.find(hasOwnRow), sizersOf(key));

    if (source !== null) {
      sources.set(key, source);
    }
  }

  const widthsByKey = new Map([...sources].map(([key, table]) => [key, widthsOf(table)]));

  for (const [key, widths] of widthsByKey) {
    const tables = tablesByKey.get(key) ?? [];

    if (widths === null) {
      continue;
    }

    for (const table of tables.filter((each) => !hasSizers(each))) {
      giveWidths(table, widths);
    }
  }
}

/** The HTML of the hidden copies of rows in the HTML of a table line; `null` when it has none. */
export function columnSizersHtmlOf(lineHtml: string): string | null {
  if (!lineHtml.includes(COLUMN_SIZERS_ATTRIBUTE)) {
    return null;
  }

  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = lineHtml;

  return template.content.querySelector(`[${COLUMN_SIZERS_ATTRIBUTE}]`)?.outerHTML ?? null;
}

/** The table copies of the drawn table lines, by the key of the lines that share their columns. */
function tableCopiesByKey(host: HTMLElement): Map<string, HTMLTableElement[]> {
  const tablesByKey = new Map<string, HTMLTableElement[]>();

  for (const line of host.querySelectorAll(COLUMNS_LINE_SELECTOR)) {
    const key = line.getAttribute(COLUMNS_ATTRIBUTE);
    const table = line.querySelector<HTMLTableElement>(TABLE_COPY_SELECTOR);

    if (key === null || table === null) {
      continue;
    }

    const tables = tablesByKey.get(key) ?? [];

    tables.push(table);
    tablesByKey.set(key, tables);
  }

  return tablesByKey;
}

/** The first table copy with a row and the hidden copies of the rows of its table, if any. */
function sizedTableOf(tables: readonly HTMLTableElement[]): HTMLTableElement | null {
  return tables.find((table) => hasOwnRow(table) && hasSizers(table)) ?? null;
}

/**
 * The table copy with the hidden copies of rows added at its end; `null` without a table or
 * copies. Widths it was given before go, since the copies lay it out now.
 */
function withSizers(
  table: HTMLTableElement | undefined,
  sizersHtml: string | null,
): HTMLTableElement | null {
  if (table === undefined || sizersHtml === null) {
    return null;
  }

  takeWidthsBack(table);
  table.insertAdjacentHTML(AT_END, sizersHtml);

  return table;
}

function hasOwnRow(table: HTMLTableElement): boolean {
  return table.querySelector(OWN_ROW_SELECTOR) !== null;
}

function hasSizers(table: HTMLTableElement): boolean {
  return table.querySelector(COLUMN_SIZERS_SELECTOR) !== null;
}

/**
 * The widths of the columns of a table copy, by the cells that take one column each; `null` when
 * a column has no such cell.
 */
function widthsOf(table: HTMLTableElement): TableWidths | null {
  const columnEdges: (readonly [number, number])[] = [];

  for (const row of Array.from(table.rows)) {
    let column = 0;

    for (const cell of Array.from(row.cells)) {
      const isMeasured = columnEdges[column] !== undefined;

      if (cell.colSpan === 1 && !isMeasured) {
        const { left, right } = cell.getBoundingClientRect();

        columnEdges[column] = [left, right];
      }

      column += cell.colSpan;
    }
  }

  const hasEveryColumn = Array.from(columnEdges, (edges) => edges !== undefined).every(Boolean);

  if (!hasEveryColumn) {
    return null;
  }

  const columns = columnEdges.map(([left, right]) => right - left);

  return { columns, table: table.getBoundingClientRect().width };
}

/**
 * Lays out a table copy with the given widths: its columns and the whole table, as the line with
 * the copies of rows has them.
 */
function giveWidths(table: HTMLTableElement, widths: TableWidths): void {
  const signature = [widths.table, ...widths.columns].join(WIDTHS_SEPARATOR);

  if (table.getAttribute(GIVEN_WIDTHS_ATTRIBUTE) === signature) {
    return;
  }

  table.setAttribute(GIVEN_WIDTHS_ATTRIBUTE, signature);
  table.style.setProperty(TABLE_LAYOUT_PROPERTY, FIXED_LAYOUT);
  table.style.setProperty(WIDTH_PROPERTY, widths.table + PIXELS);

  for (const row of Array.from(table.rows)) {
    let column = 0;

    for (const cell of Array.from(row.cells)) {
      const spanned = widths.columns.slice(column, column + cell.colSpan);
      const width = spanned.reduce((sum, each) => sum + each, 0);

      cell.style.setProperty(BOX_SIZING_PROPERTY, BORDER_BOX);
      cell.style.setProperty(WIDTH_PROPERTY, width + PIXELS);
      column += cell.colSpan;
    }
  }
}

/** Takes back the widths given to a table copy, so it lays out by its own rows again. */
function takeWidthsBack(table: HTMLTableElement): void {
  if (!table.hasAttribute(GIVEN_WIDTHS_ATTRIBUTE)) {
    return;
  }

  table.removeAttribute(GIVEN_WIDTHS_ATTRIBUTE);
  table.style.removeProperty(TABLE_LAYOUT_PROPERTY);
  table.style.removeProperty(WIDTH_PROPERTY);

  for (const row of Array.from(table.rows)) {
    for (const cell of Array.from(row.cells)) {
      cell.style.removeProperty(BOX_SIZING_PROPERTY);
      cell.style.removeProperty(WIDTH_PROPERTY);
    }
  }
}
