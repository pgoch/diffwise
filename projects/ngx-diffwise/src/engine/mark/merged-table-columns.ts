import type { ColumnMatch } from '../compare/align-table-columns';
import { COLUMN_GROUP_TAG, TABLE_ROW_GROUP_TAGS, TABLE_ROW_TAG } from '../html/html-tags';
import { CONTINUED_CELL_ATTRIBUTE, DocumentVersion, TABLE_COPY_ATTRIBUTE } from '../model';

const CELL_TAG = 'td';
const ID_ATTRIBUTE = 'id';
const COLUMN_SPAN_ATTRIBUTE = 'colspan';
const ELEMENTS_WITH_ID_SELECTOR = `[${ID_ATTRIBUTE}]`;
const TABLE_COPY_SELECTOR = `[${TABLE_COPY_ATTRIBUTE}]`;

/** Finds the copy of the row in a table copy, inside the copy of its row group. */
const ROW_COPY_SELECTOR = `:scope > * > ${TABLE_ROW_TAG}`;

/** Classes of the place of a column that the version of a row does not have. */
const GAP_CELL_CLASSES = ['diffwise-html-diff__gap', 'diffwise-html-diff__gap--cell'];

/** The columns a row of a merged table shows: those of one version, or of both. */
export const RowColumns = {
  Old: DocumentVersion.Old,
  New: DocumentVersion.New,
  /** A changed row merged into one, whose cells come from both versions. */
  Both: 'both',
} as const;

export type RowColumns = (typeof RowColumns)[keyof typeof RowColumns];

/** A column of a merged table: the column of each version it stands for, or `null` for none. */
interface MergedColumn {
  readonly old: number | null;
  readonly new: number | null;
}

/** A cell of a row copy and the columns of its version that it takes, from the first one. */
export interface RowCell {
  readonly element: Element;
  readonly column: number;
  readonly columnSpan: number;
  /** True for the empty copy of a cell from a row above that spans the row. */
  readonly isContinued: boolean;
}

/** A cell and the columns of the merged table that it takes. */
export interface PlacedCell {
  readonly element: Element;
  readonly start: number;
  readonly span: number;
}

/** Kinds of empty places in a row of a merged table. */
const EmptyPlace = {
  /** A column that the version of the row does not have. */
  Gap: 'gap',
  /** A column of the row's version where the row has no cell, before a cell in a later column. */
  Filler: 'filler',
} as const;

type EmptyPlace = (typeof EmptyPlace)[keyof typeof EmptyPlace];

/**
 * The columns of a table whose old and new version show as one table: the matched columns once,
 * and before each of them the columns that only the old version has, then those that only the new
 * one has, as removed text stands before added text.
 */
export class MergedColumns {
  private constructor(
    private readonly columns: readonly MergedColumn[],
    private readonly oldPositions: readonly number[],
    private readonly newPositions: readonly number[],
  ) {}

  /**
   * The merged columns of tables with the given numbers of columns; `null` when the matched
   * columns do not keep their order, which no single table can show.
   */
  static of(match: ColumnMatch, oldCount: number, newCount: number): MergedColumns | null {
    const columnPairs = [...match.oldToNew]
      .filter(([oldColumn, newColumn]) => oldColumn < oldCount && newColumn < newCount)
      .sort(([firstOld], [secondOld]) => firstOld - secondOld);
    const columns: MergedColumn[] = [];
    let nextOld = 0;
    let nextNew = 0;

    for (const [oldColumn, newColumn] of columnPairs) {
      if (newColumn < nextNew) {
        return null;
      }

      columns.push(...onlyOldColumns(nextOld, oldColumn), ...onlyNewColumns(nextNew, newColumn));
      columns.push({ old: oldColumn, new: newColumn });
      nextOld = oldColumn + 1;
      nextNew = newColumn + 1;
    }

    columns.push(...onlyOldColumns(nextOld, oldCount), ...onlyNewColumns(nextNew, newCount));

    return new MergedColumns(
      columns,
      positionsOf(columns, oldCount, ({ old }) => old),
      positionsOf(columns, newCount, (column) => column.new),
    );
  }

  get count(): number {
    return this.columns.length;
  }

  /** True when both versions have the same columns, so the table keeps them. */
  get keepsColumns(): boolean {
    return this.columns.every((column) => column.old !== null && column.new !== null);
  }

  /**
   * The cells in the merged columns; `null` when a cell spans a column that only the other version
   * has, which would split it.
   */
  placeCells(cells: readonly RowCell[], version: DocumentVersion): PlacedCell[] | null {
    const placedCells: PlacedCell[] = [];

    for (const { element, column, columnSpan } of cells) {
      const positions = version === DocumentVersion.Old ? this.oldPositions : this.newPositions;
      const start = positions.at(column);
      const end = positions.at(column + columnSpan - 1);
      const staysWhole = start !== undefined && end !== undefined && end - start === columnSpan - 1;

      if (!staysWhole) {
        return null;
      }

      placedCells.push({ element, start, span: columnSpan });
    }

    return placedCells;
  }

  /**
   * Lays the row out in the merged columns: its cells in the order of their columns, a gap where
   * the row's version has no column, and an empty cell where a later cell would otherwise move.
   * Returns false when two cells take the same column.
   */
  layOutRow(row: Element, cells: readonly PlacedCell[], rowColumns: RowColumns): boolean {
    const children: Element[] = [];
    let nextPosition = 0;

    for (const { element, start, span } of [...cells].sort(byStart)) {
      if (start < nextPosition) {
        return false;
      }

      children.push(...this.emptyCells(row, nextPosition, start, rowColumns), element);
      nextPosition = start + span;
    }

    const endPlaces = this.emptyPlaces(nextPosition, this.count, rowColumns);
    const lastGap = endPlaces.lastIndexOf(EmptyPlace.Gap);
    const placesUpToLastGap = endPlaces.slice(0, lastGap + 1);

    children.push(...emptyCellsOf(row, placesUpToLastGap));
    row.replaceChildren(...children);

    return true;
  }

  /** Empty cells for the columns from \`start\` up to \`end\`. */
  private emptyCells(row: Element, start: number, end: number, rowColumns: RowColumns): Element[] {
    return emptyCellsOf(row, this.emptyPlaces(start, end, rowColumns));
  }

  /** What stands in each column from \`start\` up to \`end\`, where the row has no cell. */
  private emptyPlaces(start: number, end: number, rowColumns: RowColumns): EmptyPlace[] {
    return this.columns
      .slice(start, end)
      .map((column) => (isMissingIn(column, rowColumns) ? EmptyPlace.Gap : EmptyPlace.Filler));
  }
}

/** Cells of the row in a row copy, with the columns each takes: it starts where the last ends. */
export function rowCells(row: Element): RowCell[] {
  const cells: RowCell[] = [];
  let column = 0;

  for (const element of Array.from(row.children)) {
    if (!(element instanceof HTMLTableCellElement)) {
      continue;
    }

    const isContinued = element.hasAttribute(CONTINUED_CELL_ATTRIBUTE);

    cells.push({ element, column, columnSpan: element.colSpan, isContinued });
    column += element.colSpan;
  }

  return cells;
}

/** Columns the row of a row copy takes: up to the end of its last cell. */
export function columnCountOf(row: Element): number {
  const lastCell = rowCells(row).at(-1);
  return lastCell === undefined ? 0 : lastCell.column + lastCell.columnSpan;
}

/** The copy of the table in the content of a table line. */
export function tableCopyIn(content: ParentNode): Element | null {
  return content.querySelector(TABLE_COPY_SELECTOR);
}

/** The copy of the row in the content of a table line; \`null\` in the line of a caption. */
export function rowCopyIn(content: ParentNode): Element | null {
  return tableCopyIn(content)?.querySelector(ROW_COPY_SELECTOR) ?? null;
}

/** Copies of the column groups of a table copy, without ids. */
export function columnGroupsOf(tableCopy: Element): Element[] {
  const groups = Array.from(tableCopy.children).filter(isColumnGroup);
  const copies = groups.map((group) => group.cloneNode(true) as Element);

  copies.forEach(removeIds);

  return copies;
}

/** Gives the table copy copies of the column groups instead of its own. */
export function replaceColumnGroups(tableCopy: Element, groups: readonly Element[]): void {
  const firstRowGroup = Array.from(tableCopy.children).find(isRowGroup) ?? null;

  for (const group of Array.from(tableCopy.children).filter(isColumnGroup)) {
    group.remove();
  }

  for (const group of groups) {
    tableCopy.insertBefore(group.cloneNode(true), firstRowGroup);
  }
}

/** Removes the ids of an element and of everything inside it. */
export function removeIds(element: Element): void {
  element.removeAttribute(ID_ATTRIBUTE);

  for (const inner of element.querySelectorAll(ELEMENTS_WITH_ID_SELECTOR)) {
    inner.removeAttribute(ID_ATTRIBUTE);
  }
}

function onlyOldColumns(start: number, end: number): MergedColumn[] {
  return Array.from({ length: end - start }, (_, offset) => ({ old: start + offset, new: null }));
}

function onlyNewColumns(start: number, end: number): MergedColumn[] {
  return Array.from({ length: end - start }, (_, offset) => ({ old: null, new: start + offset }));
}

/** The merged position of each column of a version, by the column. */
function positionsOf(
  columns: readonly MergedColumn[],
  count: number,
  columnOf: (column: MergedColumn) => number | null,
): number[] {
  const positions = new Array<number>(count);

  for (const [position, column] of columns.entries()) {
    const versionColumn = columnOf(column);

    if (versionColumn !== null) {
      positions[versionColumn] = position;
    }
  }

  return positions;
}

/** True when the row shows the columns of one version, and only the other version has the column. */
function isMissingIn(column: MergedColumn, rowColumns: RowColumns): boolean {
  switch (rowColumns) {
    case RowColumns.Old:
      return column.old === null;
    case RowColumns.New:
      return column.new === null;
    case RowColumns.Both:
      return false;
  }
}

/** Empty cells for the places: one cell for each run of the same kind of place. */
function emptyCellsOf(row: Element, places: readonly EmptyPlace[]): Element[] {
  const cells: Element[] = [];
  let runStart = 0;

  for (let index = 1; index <= places.length; index++) {
    const runEnds = index === places.length || places[index] !== places[runStart];

    if (runEnds) {
      cells.push(emptyCell(row, places[runStart], index - runStart));
      runStart = index;
    }
  }

  return cells;
}

/** An empty cell over the given number of columns; a gap has the look of a gap. */
function emptyCell(row: Element, place: EmptyPlace, columnSpan: number): Element {
  const cell = row.ownerDocument.createElement(CELL_TAG);

  if (place === EmptyPlace.Gap) {
    cell.classList.add(...GAP_CELL_CLASSES);
  }

  if (columnSpan > 1) {
    cell.setAttribute(COLUMN_SPAN_ATTRIBUTE, String(columnSpan));
  }

  return cell;
}

function byStart(first: PlacedCell, second: PlacedCell): number {
  return first.start - second.start;
}

function isColumnGroup(element: Element): boolean {
  return element.localName === COLUMN_GROUP_TAG;
}

function isRowGroup(element: Element): boolean {
  return TABLE_ROW_GROUP_TAGS.has(element.localName);
}
