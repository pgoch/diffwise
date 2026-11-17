import type { ColumnMatch, TablePair } from '../compare/align-table-columns';
import { columnsOf, takesColumn } from '../compare/cell-columns';
import { mapReaderText } from '../html/reader-text';
import {
  DocumentVersion,
  LineChangeKind,
  LineKind,
  type TableCell,
  type ViewLine,
  type ViewRow,
} from '../model';
import { REMOVED_TEXT_MARKER, markWholeCell } from './mark-changes';
import {
  type ChangedPair,
  type CopiedPart,
  type OldPart,
  copyOldParts,
  inInsertionOrder,
  insertCopiedPart,
  insertionPoint,
  mergeLines,
  parsedContent,
  serialized,
} from './merge-lines';
import {
  MergedColumns,
  type PlacedCell,
  RowColumns,
  columnCountOf,
  columnGroupsOf,
  removeIds,
  replaceColumnGroups,
  rowCells,
  rowCopyIn,
  tableCopyIn,
} from './merged-table-columns';

const NO_COLUMN_GROUPS: readonly Element[] = [];

/** A changed line of a table, and what merging it needs. */
export interface ChangedTableLine {
  readonly pair: ChangedPair;
  /** Positions among the old row's cells of the cells that have no place in the new row. */
  readonly removedCells: readonly number[];
}

/** A row of the view, and for a changed line of a table what merging it needs. */
export interface TableRowSource {
  readonly row: ViewRow;
  readonly changedLine: ChangedTableLine | null;
}

/** Changed parts of the old row that go into one cell of the new row. */
interface PartsOfCell {
  readonly cell: TableCell;
  readonly element: Element;
  readonly parts: CopiedPart[];
}

/** What every line of one merged table shares. */
interface MergedTable {
  readonly pair: TablePair;
  readonly columns: MergedColumns;
  /** Column groups of every line: the new table's when both versions have the same columns. */
  readonly columnGroups: readonly Element[];
}

/**
 * Rows with merged lines for the tables whose two versions show as one table in the single column:
 * a table whose rows pair only with the rows of one table of the other version. Every line of such
 * a table gets a merged line in the columns of both versions. A table with a line that does not
 * merge keeps its lines as they are.
 */
export function withMergedTables(
  sources: readonly TableRowSource[],
  tablePairs: readonly TablePair[],
): ViewRow[] {
  const rows = sources.map(({ row }) => row);

  for (const pair of tablesPairedOnce(tablePairs)) {
    const positions = sources.flatMap(({ row }, position) =>
      belongsTo(row, pair) ? [position] : [],
    );
    const mergedLines = mergedTableLines(
      positions.map((position) => sources[position]),
      pair,
    );

    if (mergedLines === null) {
      continue;
    }

    for (const [index, position] of positions.entries()) {
      rows[position] = { ...rows[position], mergedLine: mergedLines[index] };
    }
  }

  return rows;
}

/** Pairs of tables in which neither table pairs with another table too. */
function tablesPairedOnce(tablePairs: readonly TablePair[]): TablePair[] {
  const oldTables = tablePairs.map(({ oldTable }) => oldTable);
  const newTables = tablePairs.map(({ newTable }) => newTable);

  return tablePairs.filter(
    ({ oldTable, newTable }) =>
      countOf(oldTables, oldTable) === 1 && countOf(newTables, newTable) === 1,
  );
}

/** Number of times the wanted number stands among the numbers. */
function countOf(numbers: readonly number[], wanted: number): number {
  return numbers.filter((number) => number === wanted).length;
}

/** True when a line of the row is a line of one of the paired tables. */
function belongsTo({ oldLine, newLine }: ViewRow, { oldTable, newTable }: TablePair): boolean {
  return oldLine?.table === oldTable || newLine?.table === newTable;
}

/**
 * Merged lines of the rows of one pair of tables, in their order; \`null\` when a row pairs a line
 * of the table with a line outside it, or when a line does not merge.
 */
function mergedTableLines(sources: readonly TableRowSource[], pair: TablePair): ViewLine[] | null {
  const staysInTables = sources.every(({ row }) => staysInPair(row, pair));
  const table = staysInTables ? mergedTableOf(sources, pair) : null;

  if (table === null) {
    return null;
  }

  const mergedLines: ViewLine[] = [];

  for (const source of sources) {
    const mergedLine = mergedTableLine(source, table);

    if (mergedLine === null) {
      return null;
    }

    mergedLines.push(mergedLine);
  }

  return mergedLines;
}

/** True when each line of the row belongs to its version's table of the pair. */
function staysInPair({ oldLine, newLine }: ViewRow, { oldTable, newTable }: TablePair): boolean {
  const oldStays = oldLine === null || oldLine.table === oldTable;
  const newStays = newLine === null || newLine.table === newTable;

  return oldStays && newStays;
}

/** The merged columns of the pair of tables, which every row of each version fills. */
function mergedTableOf(sources: readonly TableRowSource[], pair: TablePair): MergedTable | null {
  const oldLines = sources.flatMap(({ row }) => (row.oldLine === null ? [] : [row.oldLine]));
  const newLines = sources.flatMap(({ row }) => (row.newLine === null ? [] : [row.newLine]));
  const oldCount = Math.max(0, ...oldLines.map(columnCountOfLine));
  const newCount = Math.max(0, ...newLines.map(columnCountOfLine));
  const columns = MergedColumns.of(pair.columns, oldCount, newCount);

  if (columns === null) {
    return null;
  }

  const firstNewLine = newLines.at(0);
  const firstNewTableCopy = firstNewLine === undefined ? null : tableCopyOfLine(firstNewLine);
  const sharesColumnGroups = columns.keepsColumns && firstNewTableCopy !== null;
  const columnGroups = sharesColumnGroups ? columnGroupsOf(firstNewTableCopy) : NO_COLUMN_GROUPS;

  return { pair, columns, columnGroups };
}

/** The copy of the table that a table line holds; `null` when it holds none. */
function tableCopyOfLine({ html }: ViewLine): Element | null {
  return tableCopyIn(parsedContent(html));
}

/** Number of columns of the row that a table line holds. */
function columnCountOfLine({ html }: ViewLine): number {
  const row = rowCopyIn(parsedContent(html));
  return row === null ? 0 : columnCountOf(row);
}

/**
 * The line of a row in the merged table: an unchanged or added line in the columns of the new
 * version, a removed line in those of the old version, a changed caption merged like text, and a
 * changed row merged cell by cell. Returns \`null\` when the line does not merge.
 */
function mergedTableLine(
  { row, changedLine }: TableRowSource,
  table: MergedTable,
): ViewLine | null {
  const { kind, oldLine, newLine } = row;

  if (kind === LineChangeKind.Changed) {
    return changedLine === null || newLine === null
      ? null
      : mergedChangedLine(changedLine, newLine, table);
  }

  const line = newLine ?? oldLine;

  if (line === null) {
    return null;
  }

  const version = newLine === null ? DocumentVersion.Old : DocumentVersion.New;
  const content = parsedContent(line.html);
  const isLaidOut = layOutLine(content, table, version, []);

  if (!isLaidOut) {
    return null;
  }

  return tableLine(line, serialized(content), table);
}

/** A changed caption merged like text, or a changed row merged cell by cell. */
function mergedChangedLine(
  changedLine: ChangedTableLine,
  newLine: ViewLine,
  table: MergedTable,
): ViewLine | null {
  const isCaption = newLine.kind === LineKind.TableCaption;
  const content = isCaption ? mergedCaption(changedLine, table) : mergedRow(changedLine, table);

  if (content === null) {
    return null;
  }

  return tableLine(newLine, serialized(content), table);
}

/** The line in the merged table: its position is that of the new table. */
function tableLine(line: ViewLine, html: string, { pair }: MergedTable): ViewLine {
  return { ...line, html, table: pair.newTable };
}

/** A changed caption merged like a line of text; `null` when it does not merge. */
function mergedCaption({ pair }: ChangedTableLine, table: MergedTable): DocumentFragment | null {
  const html = mergeLines(pair);

  if (html === null) {
    return null;
  }

  const content = parsedContent(html);

  return layOutLine(content, table, DocumentVersion.New, []) ? content : null;
}

/**
 * A changed row as one row: the new row with its changes marked, the removed text of each cell
 * in its place in the cell, and the cells that only the old row has, marked removed whole, in
 * their columns.
 */
function mergedRow(
  { pair, removedCells }: ChangedTableLine,
  table: MergedTable,
): DocumentFragment | null {
  const oldContent = parsedContent(pair.oldLine.html);
  const newContent = parsedContent(pair.markedNewHtml);
  const oldText = mapReaderText(oldContent.childNodes);
  const copiedParts =
    oldText.text === pair.oldLine.text ? copyOldParts(pair, oldText.pieces) : null;
  const newRow = rowCopyIn(newContent);

  if (copiedParts === null || newRow === null) {
    return null;
  }

  const partsOfCells = partsByCell(copiedParts, pair, newRow, table.pair.columns);
  const insertedAll =
    partsOfCells !== null && partsOfCells.every((parts) => insertParts(parts, pair));
  const oldCells = insertedAll ? oldCellsToKeep(pair, removedCells, newRow, table.columns) : null;

  if (oldCells === null) {
    return null;
  }

  return layOutLine(newContent, table, RowColumns.Both, oldCells) ? newContent : null;
}

/** The copied parts grouped by the cell of the new row they go into. */
function partsByCell(
  copiedParts: readonly CopiedPart[],
  pair: ChangedPair,
  newRow: Element,
  columns: ColumnMatch,
): PartsOfCell[] | null {
  const ownCells = rowCells(newRow).filter(({ isContinued }) => !isContinued);
  const partsOfCells = new Map<number, PartsOfCell>();

  if (ownCells.length !== pair.newLine.cells.length) {
    return null;
  }

  for (const copiedPart of copiedParts) {
    const position = targetCell(copiedPart.part, pair, columns);

    if (position === null) {
      return null;
    }

    const partsOfCell = partsOfCells.get(position) ?? {
      cell: pair.newLine.cells[position],
      element: ownCells[position].element,
      parts: [],
    };

    partsOfCell.parts.push(copiedPart);
    partsOfCells.set(position, partsOfCell);
  }

  return [...partsOfCells.values()];
}

/**
 * Position among the new row's cells of the cell an old part goes into: a cell in the columns of
 * the old cell the part comes from, the last one that starts before the part's place.
 */
function targetCell(
  part: OldPart,
  { oldLine, newLine }: ChangedPair,
  columns: ColumnMatch,
): number | null {
  const partStart = part.ranges[0].start;
  const oldCell = oldLine.cells.find(({ start, end }) => start <= partStart && partStart < end);

  if (oldCell === undefined) {
    return null;
  }

  const newColumns = columnsOf(oldCell).flatMap((column) => columns.oldToNew.get(column) ?? []);
  const candidates = newLine.cells.flatMap((cell, position) => {
    const takesNewColumn = newColumns.some((column) => takesColumn(cell, column));

    return takesNewColumn ? [position] : [];
  });
  const startedBefore = candidates.filter(
    (position) => newLine.cells[position].start <= part.newPosition,
  );

  return startedBefore.at(-1) ?? candidates.at(0) ?? null;
}

/**
 * Puts the parts into their cell, each at its place counted from the start of the cell. Returns
 * false when the cell reads differently from its part of the row's text.
 */
function insertParts({ cell, element, parts }: PartsOfCell, pair: ChangedPair): boolean {
  const cellText = mapReaderText(element.childNodes);
  const cellLength = cell.end - cell.start;

  if (cellText.text !== pair.newLine.text.slice(cell.start, cell.end)) {
    return false;
  }

  for (const copiedPart of inInsertionOrder(parts)) {
    const placeInCell = Math.min(Math.max(copiedPart.part.newPosition - cell.start, 0), cellLength);
    const point = insertionPoint(cellText.pieces, placeInCell, element);

    if (point === null) {
      return false;
    }

    insertCopiedPart(point, copiedPart, pair, cell);
  }

  return true;
}

/**
 * Copies of the cells of the old row in columns where the new row has none: the cells with no
 * place in the new row, marked removed whole, and copies of cells from rows above. \`null\` when
 * another cell of the old row has no place either.
 */
function oldCellsToKeep(
  { oldLine }: ChangedPair,
  removedCells: readonly number[],
  newRow: Element,
  columns: MergedColumns,
): PlacedCell[] | null {
  const oldRow = rowCopyIn(parsedContent(oldLine.html));
  const oldRowCells = oldRow === null ? [] : rowCells(oldRow);
  const newCells = columns.placeCells(rowCells(newRow), DocumentVersion.New);
  const oldCells = columns.placeCells(oldRowCells, DocumentVersion.Old);

  if (newCells === null || oldCells === null) {
    return null;
  }

  const ownOldCells = oldRowCells.filter(({ isContinued }) => !isContinued);
  const removedElements = removedCells.map((position) => ownOldCells[position]?.element);
  const continuedElements = oldRowCells
    .filter(({ isContinued }) => isContinued)
    .map(({ element }) => element);
  const keptCells = oldCells.filter((cell) => !newCells.some((newCell) => overlap(cell, newCell)));

  for (const { element } of keptCells) {
    const isRemoved = removedElements.includes(element);

    if (!isRemoved && !continuedElements.includes(element)) {
      return null;
    }

    removeIds(element);

    if (isRemoved) {
      markWholeCell(element, REMOVED_TEXT_MARKER);
    }
  }

  return keptCells;
}

/** True when the two placed cells share a column. */
function overlap(first: PlacedCell, second: PlacedCell): boolean {
  return first.start < second.start + second.span && second.start < first.start + first.span;
}

/**
 * Lays out the line's table copy in the merged table: the shared column groups, and the cells of
 * its row, with the given cells of the old row, in the merged columns.
 */
function layOutLine(
  content: DocumentFragment,
  { columns, columnGroups }: MergedTable,
  rowColumns: RowColumns,
  oldCells: readonly PlacedCell[],
): boolean {
  const tableCopy = tableCopyIn(content);
  const row = rowCopyIn(content);

  if (tableCopy === null) {
    return false;
  }

  replaceColumnGroups(tableCopy, columnGroups);

  if (row === null) {
    return true;
  }

  const rowVersion = rowColumns === RowColumns.Old ? DocumentVersion.Old : DocumentVersion.New;
  const cells = columns.placeCells(rowCells(row), rowVersion);

  return cells !== null && columns.layOutRow(row, [...cells, ...oldCells], rowColumns);
}
