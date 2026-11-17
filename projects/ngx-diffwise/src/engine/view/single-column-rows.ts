import {
  DocumentVersion,
  LineChangeKind,
  LineKind,
  type SingleColumnRow,
  type SingleColumnSettings,
  type SingleColumnTablePlace,
  type ViewLine,
  type ViewRow,
} from '../model';

/** A row of the single column before its table line knows the lines around it. */
type PlacedRow = Omit<SingleColumnRow, 'tablePlace'> & {
  /** Position of the line's table among the tables of the single column; `null` outside tables. */
  readonly table: number | null;
};

/** What stands above a table line in its table. */
interface LinesAbove {
  readonly hasLine: boolean;
  readonly hasRow: boolean;
}

const NO_LINES_ABOVE: LinesAbove = { hasLine: false, hasRow: false };

/**
 * Turns the rows of the side-by-side view into the rows of the single column. An unchanged line
 * shows once, under both of its numbers, or under its number when only one version has it. A changed pair shows as its merged line, when the
 * settings ask for merged lines and the pair has one, or else as its old line above its new one.
 */
export function singleColumnRows(
  rows: readonly ViewRow[],
  settings: SingleColumnSettings,
): SingleColumnRow[] {
  const tables = new SingleColumnTables(rows);
  const rowsOfRow = settings.showsMergedLines ? rowsWithMergedLine : rowsOfLines;
  const placedRows = rows.flatMap((row, sourceRow) => rowsOfRow(row, sourceRow, tables));

  return withTablePlaces(placedRows);
}

/** Rows of one side-by-side row: the row of its merged line, or else a row for each line. */
function rowsWithMergedLine(
  row: ViewRow,
  sourceRow: number,
  tables: SingleColumnTables,
): PlacedRow[] {
  if (row.mergedLine === null) {
    return rowsOfLines(row, sourceRow, tables);
  }

  return [mergedRow(row, row.mergedLine, sourceRow, tables)];
}

/** The row of a merged line, under the numbers of both lines of its pair. */
function mergedRow(
  { kind, oldLine, newLine, changeDetails }: ViewRow,
  mergedLine: ViewLine,
  sourceRow: number,
  tables: SingleColumnTables,
): PlacedRow {
  const version = newLine === null ? DocumentVersion.Old : DocumentVersion.New;
  const versionLine = newLine ?? oldLine;

  return {
    kind,
    version,
    isMerged: kind === LineChangeKind.Changed,
    line: mergedLine,
    oldNumber: numberOf(oldLine),
    newNumber: numberOf(newLine),
    sourceRow,
    changeDetails,
    table: versionLine === null ? null : tables.positionOf(versionLine, version),
  };
}

/**
 * Numbers the tables of the single column in the order they appear. The old and the new version
 * of a table are one table there, which a pair of their lines shows.
 */
class SingleColumnTables {
  /** The new table of each old table that has a line paired with a line of the new one. */
  private readonly newTablesOfOld = new Map<number, number>();
  private readonly positionsOfNewTables = new Map<number, number>();

  /** Positions of the old tables without a new table, such as a removed table. */
  private readonly positionsOfOldTables = new Map<number, number>();
  private tableCount = 0;

  constructor(rows: readonly ViewRow[]) {
    for (const { oldLine, newLine } of rows) {
      const oldTable = oldLine?.table ?? null;
      const newTable = newLine?.table ?? null;
      const pairsTables = oldTable !== null && newTable !== null;

      if (pairsTables && !this.newTablesOfOld.has(oldTable)) {
        this.newTablesOfOld.set(oldTable, newTable);
      }
    }
  }

  /** Position of the line's table among the tables of the single column; `null` outside tables. */
  positionOf(line: ViewLine, version: DocumentVersion): number | null {
    if (line.table === null) {
      return null;
    }

    if (version === DocumentVersion.New) {
      return this.positionIn(this.positionsOfNewTables, line.table);
    }

    const newTable = this.newTablesOfOld.get(line.table);

    if (newTable === undefined) {
      return this.positionIn(this.positionsOfOldTables, line.table);
    }

    return this.positionIn(this.positionsOfNewTables, newTable);
  }

  /** The position a table has among the positions, or the next free one, which it then keeps. */
  private positionIn(positions: Map<number, number>, table: number): number {
    const knownPosition = positions.get(table);

    if (knownPosition !== undefined) {
      return knownPosition;
    }

    const position = this.tableCount;

    positions.set(table, position);
    this.tableCount++;

    return position;
  }
}

/** Rows of one side-by-side row with a row for each of its lines: two for a changed pair. */
function rowsOfLines(row: ViewRow, sourceRow: number, tables: SingleColumnTables): PlacedRow[] {
  const { kind, oldLine, newLine, changeDetails } = row;
  const placedRows: PlacedRow[] = [];
  const isUnchanged = kind === LineChangeKind.Unchanged;
  const newLineShowsBoth = isUnchanged && newLine !== null;

  if (oldLine !== null && !newLineShowsBoth) {
    placedRows.push({
      kind,
      version: DocumentVersion.Old,
      isMerged: false,
      line: oldLine,
      oldNumber: oldLine.number,
      newNumber: null,
      sourceRow,
      changeDetails,
      table: tables.positionOf(oldLine, DocumentVersion.Old),
    });
  }

  if (newLine !== null) {
    placedRows.push({
      kind,
      version: DocumentVersion.New,
      isMerged: false,
      line: newLine,
      oldNumber: isUnchanged ? numberOf(oldLine) : null,
      newNumber: newLine.number,
      sourceRow,
      changeDetails,
      table: tables.positionOf(newLine, DocumentVersion.New),
    });
  }

  return placedRows;
}

/** The number of the line; `null` without a line. */
function numberOf(line: ViewLine | null): number | null {
  return line?.number ?? null;
}

/** The rows with the place of each table line among the lines of its table. */
function withTablePlaces(rows: readonly PlacedRow[]): SingleColumnRow[] {
  const lastLinesOfTables = lastLinePositionsOfTables(rows);
  const linesAboveInTables = new Map<number, LinesAbove>();
  const rowsWithPlaces: SingleColumnRow[] = [];

  for (const [position, { table, ...row }] of rows.entries()) {
    if (table === null) {
      rowsWithPlaces.push({ ...row, tablePlace: null });
      continue;
    }

    const linesAbove = linesAboveInTables.get(table) ?? NO_LINES_ABOVE;
    const isLastLine = lastLinesOfTables.get(table) === position;
    const isTableRow = row.line.kind === LineKind.TableRow;
    const tablePlace: SingleColumnTablePlace = {
      table,
      belowTableLine: linesAbove.hasLine,
      belowTableRow: linesAbove.hasRow,
      aboveTableLine: !isLastLine,
    };

    rowsWithPlaces.push({ ...row, tablePlace });
    linesAboveInTables.set(table, { hasLine: true, hasRow: linesAbove.hasRow || isTableRow });
  }

  return rowsWithPlaces;
}

/** Position of the last line of each table among the rows, by the position of the table. */
function lastLinePositionsOfTables(rows: readonly PlacedRow[]): Map<number, number> {
  const lastLines = new Map<number, number>();

  for (const [position, { table }] of rows.entries()) {
    if (table !== null) {
      lastLines.set(table, position);
    }
  }

  return lastLines;
}
