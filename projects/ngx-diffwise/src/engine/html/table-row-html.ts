import {
  COLUMN_GROUP_TAG,
  TABLE_CELL_TAGS,
  TABLE_ROW_GROUP_TAGS,
  TABLE_ROW_TAG,
} from './html-tags';
import {
  CONTINUED_CELL_ATTRIBUTE,
  DIFFWISE_DATA_ATTRIBUTE_START,
  TABLE_COPY_ATTRIBUTE,
} from '../model';
import type { GridRow } from './table-grid';

const ID_ATTRIBUTE = 'id';
const ROW_SPAN_ATTRIBUTE = 'rowspan';
const ELEMENTS_WITH_ID_SELECTOR = `[${ID_ATTRIBUTE}]`;

/** Marks the table copy in the first line of a table: its caption, or else its first row. */
const FIRST_TABLE_LINE_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}first-table-line`;

/** Marks the table copy that holds the first row of a table, which closes the table above. */
const FIRST_TABLE_ROW_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}first-table-row`;

/** Marks the table copy that holds the last row of a table, which closes the table below. */
const LAST_TABLE_ROW_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}last-table-row`;

/** Finds the copy of the row in a table copy, inside the copy of its row group. */
const ROW_COPY_SELECTOR = `:scope > * > ${TABLE_ROW_TAG}`;

/**
 * Screen readers read a table copy as a line of text, cell by cell. As a table it would be a table
 * of one row in every line.
 */
const ROLE_ATTRIBUTE = 'role';
const PRESENTATION_ROLE = 'presentation';

/** Where a table line stands in its table. */
export interface TableLinePlace {
  /** The first line of the table: its caption, or else its first row. */
  readonly isFirstLine: boolean;
  readonly isFirstRow: boolean;
  readonly isLastRow: boolean;
}

/** The part of a table that a line shows: its caption, or one of its rows. */
export interface TablePart {
  readonly table: Element;
  /** Position of the table among the tables of its version, from 0. */
  readonly number: number;
  /** The row the line shows; `null` in the line of the caption. */
  readonly row: GridRow | null;
  readonly place: TableLinePlace;
}

/**
 * Completes the copy of a table in a line: marks it and its place, adds the column groups of the
 * table, which can set column widths, and makes the copy of its row show the row alone. Only the
 * first line of the table keeps the ids of the column groups.
 */
export function completeTableCopy(copy: Element, part: TablePart, keepsIds: boolean): void {
  const { table, row, place } = part;
  const firstRowGroup = Array.from(copy.children).find(isRowGroup) ?? null;
  const rowCopy = copy.querySelector(ROW_COPY_SELECTOR);

  copy.toggleAttribute(TABLE_COPY_ATTRIBUTE, true);
  copy.setAttribute(ROLE_ATTRIBUTE, PRESENTATION_ROLE);
  copy.toggleAttribute(FIRST_TABLE_LINE_ATTRIBUTE, place.isFirstLine);
  copy.toggleAttribute(FIRST_TABLE_ROW_ATTRIBUTE, place.isFirstRow);
  copy.toggleAttribute(LAST_TABLE_ROW_ATTRIBUTE, place.isLastRow);

  for (const columnGroup of Array.from(table.children).filter(isColumnGroup)) {
    copy.insertBefore(columnGroupCopy(columnGroup, keepsIds), firstRowGroup);
  }

  if (row !== null && rowCopy !== null) {
    completeRowCopy(rowCopy, row);
  }
}

/**
 * Makes the copy of a row show it alone. A cell that spans more rows ends in it; a cell from a row
 * above keeps its place, as a copy without content.
 */
function completeRowCopy(copy: Element, row: GridRow): void {
  const copiedCells = Array.from(copy.children).filter(isCell);

  for (const copiedCell of copiedCells) {
    copiedCell.removeAttribute(ROW_SPAN_ATTRIBUTE);
  }

  for (const spanningCell of row.spanningCells) {
    const cellAfter = copiedCells.find((_, index) => row.cells[index].column > spanningCell.column);

    copy.insertBefore(continuedCell(spanningCell.element), cellAfter ?? null);
  }
}

/** A copy of a cell from a row above, without content, which keeps its look and its columns. */
function continuedCell(cell: Element): Element {
  const copy = cell.cloneNode(false) as Element;

  copy.removeAttribute(ID_ATTRIBUTE);
  copy.removeAttribute(ROW_SPAN_ATTRIBUTE);
  copy.toggleAttribute(CONTINUED_CELL_ATTRIBUTE, true);

  return copy;
}

function columnGroupCopy(columnGroup: Element, keepsIds: boolean): Element {
  const copy = columnGroup.cloneNode(true) as Element;

  if (!keepsIds) {
    removeIds(copy);
  }

  return copy;
}

function removeIds(element: Element): void {
  element.removeAttribute(ID_ATTRIBUTE);

  for (const child of element.querySelectorAll(ELEMENTS_WITH_ID_SELECTOR)) {
    child.removeAttribute(ID_ATTRIBUTE);
  }
}

function isRowGroup(element: Element): boolean {
  return TABLE_ROW_GROUP_TAGS.has(element.localName);
}

function isColumnGroup(element: Element): boolean {
  return element.localName === COLUMN_GROUP_TAG;
}

function isCell(element: Element): boolean {
  return TABLE_CELL_TAGS.has(element.localName);
}
