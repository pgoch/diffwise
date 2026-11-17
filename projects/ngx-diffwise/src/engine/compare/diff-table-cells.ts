import type { ColumnMatch } from './align-table-columns';
import { columnsOf, takesColumn } from './cell-columns';
import { diffWords } from './diff-words';
import type {
  ChangedText,
  DiffOptions,
  Line,
  LineContent,
  LineImage,
  RemovedRange,
  TableCell,
  TextRange,
  WordChanges,
} from '../model';

/** Changes of a changed row pair, compared cell by cell. */
export interface CellChanges {
  /** Changed text inside cells that both rows have, which markers wrap. */
  readonly wordChanges: WordChanges;
  /** Positions among the old row's cells of the cells that have no place in the new row. */
  readonly removedCells: readonly number[];
  /** Positions among the new row's cells of the cells that have no place in the old row. */
  readonly addedCells: readonly number[];
}

/** Cells of both rows that take the same columns, by their positions among the cells of a row. */
interface CellGroup {
  readonly oldCells: number[];
  readonly newCells: number[];
}

/**
 * Compares a changed row pair cell by cell, in the matched columns of their tables, so no change
 * crosses from one cell to the next. Cells merged into one are compared as one. A cell with no
 * place in the other row, such as a cell of an added column, is removed or added whole.
 */
export function diffTableCells(
  oldLine: Line,
  newLine: Line,
  columns: ColumnMatch,
  options: DiffOptions,
): CellChanges {
  const removed: RemovedRange[] = [];
  const added: TextRange[] = [];
  const removedCells: number[] = [];
  const addedCells: number[] = [];

  for (const { oldCells, newCells } of cellGroups(oldLine.cells, newLine.cells, columns)) {
    if (newCells.length === 0) {
      removedCells.push(...oldCells);
      continue;
    }

    if (oldCells.length === 0) {
      addedCells.push(...newCells);
      continue;
    }

    const oldRange = rangeOfCells(oldLine.cells, oldCells);
    const newRange = rangeOfCells(newLine.cells, newCells);
    const { removed: removedWords, added: addedWords } = diffWords(
      contentOf(oldLine, oldRange),
      contentOf(newLine, newRange),
      options,
    );

    removed.push(...shiftedRemoved(removedWords, oldRange.start, newRange.start));
    added.push(...shifted(addedWords, newRange.start));
  }

  return { wordChanges: { removed, added }, removedCells, addedCells };
}

/**
 * All text that a row pair changed: the changed words and the text of whole removed and added
 * cells, in reading order. Unchanged text pairs up in the rest.
 */
export function allChangedText(
  oldLine: Line,
  newLine: Line,
  { wordChanges, removedCells, addedCells }: CellChanges,
): ChangedText {
  const removedCellTexts = textsOfCells(oldLine.cells, removedCells);
  const addedCellTexts = textsOfCells(newLine.cells, addedCells);

  return {
    removed: [...wordChanges.removed, ...removedCellTexts].sort(byStart),
    added: [...wordChanges.added, ...addedCellTexts].sort(byStart),
  };
}

/**
 * Cells of both rows grouped by the columns they share: one cell on each side in most rows,
 * several where cells were merged or split, and a cell alone where the other row has no place for
 * it. Matched columns keep their order, so a cell can share columns only with the last group.
 */
function cellGroups(
  oldCells: readonly TableCell[],
  newCells: readonly TableCell[],
  { oldToNew }: ColumnMatch,
): CellGroup[] {
  const groups: CellGroup[] = [];
  const groupedNewCells = new Set<number>();

  for (const [position, cell] of oldCells.entries()) {
    const sharingNewCells = newCellsSharingColumns(cell, newCells, oldToNew);
    const lastGroup = groups.at(-1);
    const sharesLastGroup = lastGroup !== undefined && sharesAny(lastGroup, sharingNewCells);
    const group = sharesLastGroup ? lastGroup : emptyGroup();

    if (!sharesLastGroup) {
      groups.push(group);
    }

    group.oldCells.push(position);

    for (const newCell of sharingNewCells.filter((newCell) => !groupedNewCells.has(newCell))) {
      group.newCells.push(newCell);
      groupedNewCells.add(newCell);
    }
  }

  const ungroupedNewCells = newCells.flatMap((_, position) =>
    groupedNewCells.has(position) ? [] : [position],
  );
  const addedGroups = ungroupedNewCells.map((position) => ({ oldCells: [], newCells: [position] }));

  return [...groups, ...addedGroups];
}

/** A group of cells without any cell yet. */
function emptyGroup(): CellGroup {
  return { oldCells: [], newCells: [] };
}

/** True when the group already holds one of the new cells. */
function sharesAny(group: CellGroup, newCells: readonly number[]): boolean {
  return newCells.some((newCell) => group.newCells.includes(newCell));
}

/** Positions of the new cells that take a column the old cell's columns match. */
function newCellsSharingColumns(
  oldCell: TableCell,
  newCells: readonly TableCell[],
  oldToNew: ReadonlyMap<number, number>,
): number[] {
  const matchedColumns = columnsOf(oldCell).flatMap((column) => oldToNew.get(column) ?? []);

  return newCells.flatMap((newCell, position) => {
    const takesMatchedColumn = matchedColumns.some((column) => takesColumn(newCell, column));

    return takesMatchedColumn ? [position] : [];
  });
}

/** The part of the line's text from the first of the cells to the end of the last one. */
function rangeOfCells(cells: readonly TableCell[], positions: readonly number[]): TextRange {
  return { start: cells[positions[0]].start, end: cells[positions[positions.length - 1]].end };
}

/** The text and images of a part of a line, counted from the start of the part. */
function contentOf({ text, images }: Line, { start, end }: TextRange): LineContent {
  const imagesInside = images.filter(({ position }) => position >= start && position < end);
  const shiftedImages = imagesInside.map((image) => imageMovedBack(image, start));

  return { text: text.slice(start, end), images: shiftedImages };
}

/** The image with its position moved back by the number of characters. */
function imageMovedBack(image: LineImage, by: number): LineImage {
  return { ...image, position: image.position - by };
}

/** The ranges moved by the number of characters. */
function shifted(ranges: readonly TextRange[], by: number): TextRange[] {
  return ranges.map(({ start, end }) => ({ start: start + by, end: end + by }));
}

/** Removed ranges of a cell counted in the texts of the rows: each side moves by its cell start. */
function shiftedRemoved(
  ranges: readonly RemovedRange[],
  oldStart: number,
  newStart: number,
): RemovedRange[] {
  return ranges.map(({ start, end, newPosition }) => ({
    start: start + oldStart,
    end: end + oldStart,
    newPosition: newPosition + newStart,
  }));
}

/** Parts of the line's text in the cells, leaving out empty cells. */
function textsOfCells(cells: readonly TableCell[], positions: readonly number[]): TextRange[] {
  return positions
    .map((position) => cells[position])
    .filter(({ start, end }) => end > start)
    .map(({ start, end }) => ({ start, end }));
}

/** Orders ranges by their start. */
function byStart(first: TextRange, second: TextRange): number {
  return first.start - second.start;
}
