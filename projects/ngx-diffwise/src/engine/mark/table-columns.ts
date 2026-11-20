import { TABLE_ROW_TAG } from '../html/html-tags';
import { readerText } from '../html/reader-text';
import { isCell } from '../html/table-elements';
import { DIFFWISE_DATA_ATTRIBUTE_START, TABLE_COPY_ATTRIBUTE, type ViewLine } from '../model';

const TEMPLATE_TAG = 'template';
const ROW_GROUP_TAG = 'tbody';
const CELL_CONTENT_TAG = 'div';
const ALL_ELEMENTS = '*';
const ARIA_HIDDEN_ATTRIBUTE = 'aria-hidden';
const ARIA_HIDDEN_VALUE = 'true';
const AT_END: InsertPosition = 'beforeend';
const TABLE_COPY_SELECTOR = `[${TABLE_COPY_ATTRIBUTE}]`;
const ROW_COPY_SELECTOR = `:scope > * > ${TABLE_ROW_TAG}`;
const WHITESPACE = /\s+/;

/** Marks the hidden copies of the rows of a table, which give a table line the table's columns. */
const COLUMN_SIZERS_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}column-sizers`;

/** Left out of copies: ids and anchor names, which links would find, and media that plays itself. */
const ORIGINAL_ONLY_ATTRIBUTES: ReadonlySet<string> = new Set(['autoplay', 'id', 'name']);

/** A bigger table gives its lines copies of only the rows that need the most room in a column. */
const MAX_ROWS_COPIED_WHOLE = 30;

/** A line of a table. */
type TableLine = ViewLine & { readonly table: number };

/** The hidden copies of rows of each table, and the lines that carry them. */
interface ColumnSizers {
  readonly sizersOfTables: ReadonlyMap<number, string>;
  readonly sizedLines: ReadonlySet<TableLine>;
}

/** A row and the length of some text of it. */
interface MeasuredRow {
  readonly row: Element;
  readonly length: number;
}

/**
 * Gives the lines of each table the columns of the whole table. Hidden copies of the rows of the
 * table on the same side, with their marks, make the browser lay out a line's row like the whole
 * table. The first line of each table with a row gets them, and the view gives the other lines of
 * the table the widths of its columns; each line of a caption gets them too, since the columns
 * widen a caption like the table. Takes the lines of one version in order, with `null` for gaps.
 */
export function addTableColumns(lines: readonly (ViewLine | null)[]): (ViewLine | null)[] {
  const { sizersOfTables, sizedLines } = columnSizersOfTables(lines.filter(isTableLine));

  return lines.map((line) =>
    isTableLine(line) && sizedLines.has(line) ? withColumnSizers(line, sizersOfTables) : line,
  );
}

/**
 * HTML of the hidden copies of rows for each table, by the position of the table, and the lines
 * that carry them: the first line with a row of each table, and every line of a caption.
 */
function columnSizersOfTables(lines: readonly TableLine[]): ColumnSizers {
  const rowsOfTables = new Map<number, Element[]>();
  const sizedLines = new Set<TableLine>();

  for (const line of lines) {
    const row = rowOf(line.html);
    const rows = rowsOfTables.get(line.table) ?? [];

    if (row === null) {
      sizedLines.add(line);
      continue;
    }

    if (rows.length === 0) {
      sizedLines.add(line);
    }

    rows.push(row);
    rowsOfTables.set(line.table, rows);
  }

  const sizersOfTables = new Map(
    [...rowsOfTables].map(([table, rows]) => [table, columnSizersHtml(rows)]),
  );

  return { sizersOfTables, sizedLines };
}

/** The line with the copies of its table's rows at the end of its table copy. */
function withColumnSizers(
  line: ViewLine | null,
  sizersOfTables: ReadonlyMap<number, string>,
): ViewLine | null {
  if (!isTableLine(line)) {
    return line;
  }

  const sizersHtml = sizersOfTables.get(line.table);

  if (sizersHtml === undefined) {
    return line;
  }

  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = line.html;
  template.content.querySelector(TABLE_COPY_SELECTOR)?.insertAdjacentHTML(AT_END, sizersHtml);

  return { ...line, html: template.innerHTML };
}

/** The row in the HTML of a table line; `null` in the line of a caption. */
function rowOf(html: string): Element | null {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  const tableCopy = template.content.querySelector(TABLE_COPY_SELECTOR);

  return tableCopy?.querySelector(ROW_COPY_SELECTOR) ?? null;
}

/** A hidden row group with copies of the rows that set the widths of the columns. */
function columnSizersHtml(rows: readonly Element[]): string {
  const template = document.createElement(TEMPLATE_TAG);
  const group = template.content.ownerDocument.createElement(ROW_GROUP_TAG);

  group.toggleAttribute(COLUMN_SIZERS_ATTRIBUTE, true);
  group.setAttribute(ARIA_HIDDEN_ATTRIBUTE, ARIA_HIDDEN_VALUE);
  group.append(...rowsSettingColumns(rows).map(sizerRow));
  template.content.append(group);

  return template.innerHTML;
}

/**
 * A copy of a row without the attributes of the original. Its cells hold their content in a box,
 * which the styles give no height.
 */
function sizerRow(row: Element): Element {
  const copy = row.cloneNode(true) as Element;

  for (const element of [copy, ...copy.querySelectorAll(ALL_ELEMENTS)]) {
    removeOriginalOnlyAttributes(element);
  }

  for (const cell of Array.from(copy.children)) {
    const box = copy.ownerDocument.createElement(CELL_CONTENT_TAG);

    box.append(...cell.childNodes);
    cell.append(box);
  }

  return copy;
}

/** Removes the attributes that only the original line may have, such as ids. */
function removeOriginalOnlyAttributes(element: Element): void {
  for (const name of element.getAttributeNames()) {
    const isOriginalOnly =
      name.startsWith(DIFFWISE_DATA_ATTRIBUTE_START) || ORIGINAL_ONLY_ATTRIBUTES.has(name);

    if (isOriginalOnly) {
      element.removeAttribute(name);
    }
  }
}

/**
 * Rows that set the widths of the columns: all rows of a smaller table. In a bigger one, for each
 * place of cells, a column or the columns of one cell, the rows with the longest text there and
 * with the longest word.
 */
function rowsSettingColumns(rows: readonly Element[]): readonly Element[] {
  if (rows.length <= MAX_ROWS_COPIED_WHOLE) {
    return rows;
  }

  const longestTexts = new Map<string, MeasuredRow>();
  const longestWords = new Map<string, MeasuredRow>();

  for (const row of rows) {
    let column = 0;

    for (const cell of Array.from(row.children).filter(isCell)) {
      const place = JSON.stringify([column, cell.colSpan]);
      const text = readerText([cell]);

      keepLonger(longestTexts, place, { row, length: text.length });
      keepLonger(longestWords, place, { row, length: longestWordLength(text) });
      column += cell.colSpan;
    }
  }

  const measuredRows = [...longestTexts.values(), ...longestWords.values()];
  const chosenRows = new Set(measuredRows.map(({ row }) => row));

  return rows.filter((row) => chosenRows.has(row));
}

/** Keeps the row as the longest at its place, unless an earlier row is as long. */
function keepLonger(longest: Map<string, MeasuredRow>, place: string, measured: MeasuredRow): void {
  const longestSoFar = longest.get(place)?.length ?? -1;

  if (measured.length > longestSoFar) {
    longest.set(place, measured);
  }
}

/** Length of the longest word of the text. */
function longestWordLength(text: string): number {
  return Math.max(0, ...text.split(WHITESPACE).map((word) => word.length));
}

/** True when the line is there and belongs to a table. */
function isTableLine(line: ViewLine | null): line is TableLine {
  return line !== null && line.table !== null;
}
