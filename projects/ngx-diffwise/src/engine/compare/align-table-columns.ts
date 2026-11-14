import { comparisonText } from './comparison-text';
import {
  type DiffOptions,
  type Line,
  type LineChange,
  LineChangeKind,
  LineKind,
  type TableCell,
} from '../model';
import { type ItemPair, highestScoringPairs } from './pair-similar-lines';

/** Columns of an old table and a new table that are the same column. */
export interface ColumnMatch {
  /** The new column of each old column that the new table keeps, by their positions from 0. */
  readonly oldToNew: ReadonlyMap<number, number>;
}

/** An old table and a new table whose rows are paired, and their matched columns. */
export interface TablePair {
  /** Position of the old table among the tables of the old version. */
  readonly oldTable: number;
  /** Position of the new table among the tables of the new version. */
  readonly newTable: number;
  readonly columns: ColumnMatch;
}

/** A row of a table. */
type TableRowLine = Line & { readonly table: number };

/** An old and a new row paired as unchanged or changed. */
interface RowPair {
  readonly oldRow: TableRowLine;
  readonly newRow: TableRowLine;
}

/** Text of a cell that spans one column, and its column. */
interface ColumnText {
  readonly column: number;
  readonly text: string;
}

/** Matched columns of each pair of tables whose rows are paired. */
export class ColumnMatches {
  constructor(private readonly matches: ReadonlyMap<string, TablePair>) {}

  /** Columns of the tables of two paired lines; `null` unless both are rows of matched tables. */
  of(oldLine: Line, newLine: Line): ColumnMatch | null {
    const match = this.matches.get(tablePairKey(oldLine, newLine));
    const isMatched = isTableRow(oldLine) && isTableRow(newLine) && match !== undefined;

    return isMatched ? match.columns : null;
  }

  /** Each pair of tables whose rows are paired, with their matched columns. */
  tablePairs(): TablePair[] {
    return [...this.matches.values()];
  }
}

/**
 * Matches the columns of each pair of tables whose rows were paired. A column of the old table and
 * a column of the new one match by the equal cells they have in all paired rows, in the same order
 * on both sides, so an added column is the same column in every row, even where values repeat.
 * Columns that no equal cells tell apart pair up by position between matched ones.
 */
export function alignTableColumns(
  changes: readonly LineChange[],
  options: DiffOptions,
): ColumnMatches {
  const rowPairsOfTables = new Map<string, RowPair[]>();

  for (const change of changes) {
    const isRowPair =
      change.kind !== LineChangeKind.Added
      && change.kind !== LineChangeKind.Removed
      && isTableRow(change.oldLine)
      && isTableRow(change.newLine);

    if (isRowPair) {
      const key = tablePairKey(change.oldLine, change.newLine);
      const rowPairs = rowPairsOfTables.get(key) ?? [];

      rowPairs.push({ oldRow: change.oldLine, newRow: change.newLine });
      rowPairsOfTables.set(key, rowPairs);
    }
  }

  const matches = new Map<string, TablePair>();

  for (const [key, rowPairs] of rowPairsOfTables) {
    const [{ oldRow, newRow }] = rowPairs;
    const columns = matchColumns(rowPairs, options);

    matches.set(key, { oldTable: oldRow.table, newTable: newRow.table, columns });
  }

  return new ColumnMatches(matches);
}

/** Columns of two tables matched by the equal cells of their paired rows. */
function matchColumns(rowPairs: readonly RowPair[], options: DiffOptions): ColumnMatch {
  const oldCount = Math.max(...rowPairs.map(({ oldRow }) => columnCount(oldRow.cells)));
  const newCount = Math.max(...rowPairs.map(({ newRow }) => columnCount(newRow.cells)));
  const scores = columnScores(rowPairs, oldCount, newCount, options);
  const pairs = highestScoringPairs(scores, oldCount, newCount);
  const allPairs = withGapsPairedByPosition(pairs, oldCount, newCount);

  return { oldToNew: new Map(allPairs.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])) };
}

/** `scores[i][j]`: in how many paired rows old column `i` and new column `j` hold the same text. */
function columnScores(
  rowPairs: readonly RowPair[],
  oldCount: number,
  newCount: number,
  options: DiffOptions,
): number[][] {
  const scores = Array.from({ length: oldCount }, () => new Array<number>(newCount).fill(0));

  for (const { oldRow, newRow } of rowPairs) {
    const newTexts = columnTexts(newRow, options);

    for (const oldText of columnTexts(oldRow, options)) {
      for (const newText of newTexts) {
        if (oldText.text === newText.text) {
          scores[oldText.column][newText.column]++;
        }
      }
    }
  }

  return scores;
}

/**
 * Compared texts of the cells of a row that span one column and are not empty. Empty cells and
 * cells over several columns tell no column apart.
 */
function columnTexts(row: Line, options: DiffOptions): ColumnText[] {
  return row.cells
    .filter(({ start, end, columnSpan }) => columnSpan === 1 && end > start)
    .map(({ start, end, column }) => ({
      column,
      text: comparisonText(row.text.slice(start, end), options),
    }));
}

/**
 * The pairs, with the columns between two pairs, or before the first and after the last, paired
 * by position when both tables have as many of them.
 */
function withGapsPairedByPosition(
  pairs: readonly ItemPair[],
  oldCount: number,
  newCount: number,
): ItemPair[] {
  const end = { oldIndex: oldCount, newIndex: newCount };
  const allPairs: ItemPair[] = [];
  let previous = { oldIndex: -1, newIndex: -1 };

  for (const pair of [...pairs, end]) {
    const oldGap = pair.oldIndex - previous.oldIndex - 1;
    const newGap = pair.newIndex - previous.newIndex - 1;

    if (oldGap === newGap) {
      allPairs.push(...positionPairs(previous, oldGap));
    }

    if (pair !== end) {
      allPairs.push(pair);
    }

    previous = pair;
  }

  return allPairs;
}

/** Pairs of the columns after the given pair, by position. */
function positionPairs(after: ItemPair, count: number): ItemPair[] {
  return Array.from({ length: count }, (_, offset) => ({
    oldIndex: after.oldIndex + offset + 1,
    newIndex: after.newIndex + offset + 1,
  }));
}

/** Columns a row takes: up to the end of its last cell. */
function columnCount(cells: readonly TableCell[]): number {
  return Math.max(0, ...cells.map(({ column, columnSpan }) => column + columnSpan));
}

function tablePairKey(oldLine: Line, newLine: Line): string {
  return JSON.stringify([oldLine.table, newLine.table]);
}

function isTableRow(line: Line): line is TableRowLine {
  return line.kind === LineKind.TableRow && line.table !== null;
}
