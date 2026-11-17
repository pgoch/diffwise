import {
  TABLE_FOOTER_TAG,
  TABLE_HEADER_TAG,
  TABLE_ROW_GROUP_TAGS,
  TABLE_ROW_TAG,
} from './html-tags';
import type { TableCell } from '../model';
import type { TextPiece } from './reader-text';
import { isCell } from './table-elements';

/** A cell of a table and the place it takes in the table's grid. */
export interface GridCell {
  readonly element: HTMLTableCellElement;
  /** Column the cell starts in, counted from 0. */
  readonly column: number;
  /** Columns the cell spans, at least 1. */
  readonly columnSpan: number;
  /** Rows the cell spans from its own row down, at least 1; it never leaves its row group. */
  readonly rowSpan: number;
}

/** A row of a table with its cells, and the cells of rows above that reach into it. */
export interface GridRow {
  readonly element: Element;
  /** The row group the row is in: `thead`, `tbody` or `tfoot`. */
  readonly group: Element;
  /** Cells of the row, in reading order. */
  readonly cells: readonly GridCell[];
  /** Cells of rows above that span this row too, in the order of their columns. */
  readonly spanningCells: readonly GridCell[];
}

/** Cells that take places in a row, by column. */
type TakenPlaces = Map<number, GridCell>;

/**
 * Rows of a table in the order a browser shows them: the header rows, the body, then the footer
 * rows. Cells take their columns as the HTML table model places them.
 */
export function tableGrid(table: Element): GridRow[] {
  return rowGroupsInShownOrder(table).flatMap(gridOfRowGroup);
}

/**
 * Cells of a row as parts of the line's text, which the row's pieces of text give. An empty cell
 * has an empty part where the cell before it ends.
 */
export function rowCells(row: GridRow, pieces: readonly TextPiece[]): TableCell[] {
  const cells: TableCell[] = [];
  let nextPiece = 0;
  let previousEnd = 0;

  for (const { element, column, columnSpan } of row.cells) {
    const firstPiece = nextPiece;

    while (nextPiece < pieces.length && element.contains(pieces[nextPiece].node)) {
      nextPiece++;
    }

    const cellPieces = pieces.slice(firstPiece, nextPiece);
    const start = cellPieces.at(0)?.start ?? previousEnd;
    const end = cellPieces.at(-1)?.end ?? previousEnd;

    cells.push({ start, end, column, columnSpan });
    previousEnd = end;
  }

  return cells;
}

/**
 * Row groups in the order a browser shows them. Only the first header and the first footer move;
 * the others stay in place, as the CSS table model says.
 */
function rowGroupsInShownOrder(table: Element): Element[] {
  const groups = Array.from(table.children).filter((child) =>
    TABLE_ROW_GROUP_TAGS.has(child.localName),
  );
  const header = groups.find((group) => group.localName === TABLE_HEADER_TAG);
  const footer = groups.find((group) => group.localName === TABLE_FOOTER_TAG);
  const middle = groups.filter((group) => group !== header && group !== footer);

  return [header, ...middle, footer].filter((group) => group !== undefined);
}

/** Rows of one group with the columns of their cells; a cell skips places taken from above. */
function gridOfRowGroup(group: Element): GridRow[] {
  const rowElements = Array.from(group.children).filter(isRow);
  const takenPlaces: TakenPlaces[] = rowElements.map(() => new Map());
  const rows: GridRow[] = [];

  for (const [rowIndex, element] of rowElements.entries()) {
    const taken = takenPlaces[rowIndex];
    const spanningCells = sortedByColumn(new Set(taken.values()));
    const rowsLeft = rowElements.length - rowIndex;
    const cells: GridCell[] = [];
    let column = 0;

    for (const cellElement of Array.from(element.children).filter(isCell)) {
      while (taken.has(column)) {
        column++;
      }

      const cell = gridCell(cellElement, column, rowsLeft);

      takePlacesBelow(takenPlaces, rowIndex, cell);
      cells.push(cell);
      column += cell.columnSpan;
    }

    rows.push({ element, group, cells, spanningCells });
  }

  return rows;
}

/** A cell at its column. A row span of 0 reaches the end of the group, as in HTML. */
function gridCell(element: HTMLTableCellElement, column: number, rowsLeft: number): GridCell {
  const spansToGroupEnd = element.rowSpan === 0;
  const rowSpan = spansToGroupEnd ? rowsLeft : Math.min(element.rowSpan, rowsLeft);

  return { element, column, columnSpan: element.colSpan, rowSpan };
}

/** Takes the places of a cell in the rows below its own that it spans. */
function takePlacesBelow(takenPlaces: readonly TakenPlaces[], rowIndex: number, cell: GridCell) {
  for (let row = rowIndex + 1; row < rowIndex + cell.rowSpan; row++) {
    for (let column = cell.column; column < cell.column + cell.columnSpan; column++) {
      takenPlaces[row].set(column, cell);
    }
  }
}

/** The cells in the order of their columns. */
function sortedByColumn(cells: Iterable<GridCell>): GridCell[] {
  return [...cells].sort((first, second) => first.column - second.column);
}

/** True when the element is a table row. */
function isRow(element: Element): boolean {
  return element.localName === TABLE_ROW_TAG;
}
