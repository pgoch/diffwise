import { type ColumnMatches, alignTableColumns } from './compare/align-table-columns';
import { diffFormats } from './compare/diff-formats';
import { diffImages } from './compare/diff-images';
import { diffLines } from './compare/diff-lines';
import { checkboxChanged, listMarkerChanged } from './compare/diff-list-markers';
import { type CellChanges, allChangedText, diffTableCells } from './compare/diff-table-cells';
import { diffWords } from './compare/diff-words';
import { parseHtml } from './html/parse-html';
import { sanitizeHtmlPieces } from './html/sanitize-html';
import { splitLines } from './html/split-lines';
import {
  ADDED_TEXT_MARKER,
  type ChangeMarker,
  type ListItemMarks,
  REMOVED_TEXT_MARKER,
  markChanges,
  markWholeCells,
  markWholeTableLine,
} from './mark/mark-changes';
import { type ChangedPair, mergeLines } from './mark/merge-lines';
import {
  type ChangedTableLine,
  type TableRowSource,
  withMergedTables,
} from './mark/merge-table-rows';
import { addTableColumns } from './mark/table-columns';
import { comparisonWithMergedLines } from './merged-comparison';
import {
  type ChangeDetail,
  type Comparison,
  type ComparisonSettings,
  type DescribedChanges,
  type DiffOptions,
  type Line,
  type LineChange,
  LineChangeKind,
  type MarkedRange,
  type ViewLine,
  type ViewRow,
} from './model';

const ID_PART_SEPARATOR = '-';
const OLD_VERSION_ID_PART = 'old';
const NEW_VERSION_ID_PART = 'new';

const NO_CHANGE_DETAILS: readonly ChangeDetail[] = [];

/** Whole cells of a pair that is not a pair of table rows. */
const NO_CELLS: readonly number[] = [];

/**
 * Compares two HTML documents and returns the rows of the side-by-side view with change counts.
 * Table lines get the columns of their tables after marking, since marks widen cells. The
 * comparison keeps what merging needs, so it can add the merged lines of the single-column view
 * later: each changed pair becomes one merged line, and so does every line of a table whose two
 * versions show as one table there. When the settings ask for them, they come at once.
 */
export function diffHtml(
  oldHtml: string,
  newHtml: string,
  settings: ComparisonSettings,
): Comparison {
  const oldLines = versionLines(oldHtml, settings.idPrefix, OLD_VERSION_ID_PART);
  const newLines = versionLines(newHtml, settings.idPrefix, NEW_VERSION_ID_PART);
  const { changes, stats } = diffLines(oldLines, newLines, settings.options);
  const columns = alignTableColumns(changes, settings.options);
  const rowBuilder = new ViewRowBuilder(settings.options, columns);
  const markedRows = changes.map((change) => rowBuilder.toRow(change));
  const rows = sanitizedRows(withTableColumns(markedRows));
  const mergedComparison = () =>
    comparisonWithMergedLines(withMergedLines(rows, markedRows, rowBuilder, columns), stats);

  if (settings.mergesChangedLines) {
    return mergedComparison();
  }

  return { rows, stats, withMergedLines: mergedComparison };
}

/**
 * Lines of one version. Its ids get a prefix of their own, such as `diffwise-1-old-`, so links
 * such as footnotes work within each version.
 */
function versionLines(html: string, idPrefix: string, versionPart: string): Line[] {
  const versionIdPrefix = `${idPrefix}${ID_PART_SEPARATOR}${versionPart}${ID_PART_SEPARATOR}`;
  return splitLines(parseHtml(html), versionIdPrefix);
}

/**
 * Turns line changes into view rows and numbers the lines of each version from 1. It keeps what
 * merging needs for the rows of changed pairs, so merged lines can come later.
 */
class ViewRowBuilder {
  private oldLineCount = 0;
  private newLineCount = 0;

  /** What merging needs for each row of a changed pair outside tables. */
  private readonly changedPairs = new Map<ViewRow, ChangedPair>();

  /** What merging needs for each row of a changed line of a table. */
  private readonly changedTableLines = new Map<ViewRow, ChangedTableLine>();

  constructor(
    private readonly options: DiffOptions,
    private readonly columns: ColumnMatches,
  ) {}

  /** The row of the view for a change of lines. */
  toRow(change: LineChange): ViewRow {
    switch (change.kind) {
      case LineChangeKind.Unchanged:
        return this.unchangedRow(change.oldLine, change.newLine);
      case LineChangeKind.Changed:
        return this.changedRow(change.oldLine, change.newLine);
      case LineChangeKind.Removed:
        return this.removedRow(change.oldLine);
      case LineChangeKind.Added:
        return this.addedRow(change.newLine);
    }
  }

  /** The row of an unchanged line, shown in both versions. */
  private unchangedRow(oldLine: Line, newLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Unchanged,
      oldLine: this.nextOldLine(oldLine, oldLine.html),
      newLine: this.nextNewLine(newLine, newLine.html),
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  /**
   * A row of a changed pair. Removed text and described changes are marked in the old line, added
   * text and described changes in the new one; their markers point to the row's details. A changed
   * list marker and checkbox are marked without details. A cell with no place on the other side is
   * marked whole. What merging the pair needs is kept for the row.
   */
  private changedRow(oldLine: Line, newLine: Line): ViewRow {
    const cellChanges = this.cellChangesOf(oldLine, newLine);
    const changedText = allChangedText(oldLine, newLine, cellChanges);
    const formatChanges = diffFormats(oldLine, newLine, changedText, this.options);
    const imageChanges = diffImages(oldLine, newLine, changedText, this.options);
    const describedChanges = joinDescribedChanges(formatChanges, imageChanges);
    const itemMarks: ListItemMarks = {
      listMarkerChanged: listMarkerChanged(oldLine, newLine, this.options),
      checkboxChanged: checkboxChanged(oldLine, newLine),
    };
    const { wordChanges, removedCells, addedCells } = cellChanges;
    const oldRanges = [...wordChanges.removed, ...describedChanges.oldRanges];
    const newRanges = [...wordChanges.added, ...describedChanges.newRanges];
    const markedOldText = markChanges(oldLine, oldRanges, REMOVED_TEXT_MARKER, itemMarks);
    const markedNewText = markChanges(newLine, newRanges, ADDED_TEXT_MARKER, itemMarks);
    const markedOldHtml = markWholeCells(markedOldText, removedCells, REMOVED_TEXT_MARKER);
    const markedNewHtml = markWholeCells(markedNewText, addedCells, ADDED_TEXT_MARKER);
    const shownOldLine = this.nextOldLine(oldLine, markedOldHtml);
    const shownNewLine = this.nextNewLine(newLine, markedNewHtml);
    const pair = { oldLine, newLine, markedNewHtml, wordChanges, describedChanges, itemMarks };
    const isInTable = oldLine.table !== null || newLine.table !== null;
    const row: ViewRow = {
      kind: LineChangeKind.Changed,
      oldLine: shownOldLine,
      newLine: shownNewLine,
      changeDetails: describedChanges.details,
      mergedLine: null,
    };

    if (isInTable) {
      this.changedTableLines.set(row, { pair, removedCells });
    } else {
      this.changedPairs.set(row, pair);
    }

    return row;
  }

  /** The row with the merged line of its changed pair outside tables; other rows stay as they are. */
  withMergedPair(row: ViewRow): ViewRow {
    const pair = this.changedPairs.get(row);
    const mergedHtml = pair === undefined ? null : mergeLines(pair);

    if (mergedHtml === null || row.newLine === null) {
      return row;
    }

    return { ...row, mergedLine: { ...row.newLine, html: mergedHtml } };
  }

  /** The rows, each with what merging needs when it shows a changed line of a table. */
  tableRowSources(rows: readonly ViewRow[]): TableRowSource[] {
    return rows.map((row) => ({ row, changedLine: this.changedTableLines.get(row) ?? null }));
  }

  /** Changed text of a pair: cell by cell in rows of matched tables, word by word in other lines. */
  private cellChangesOf(oldLine: Line, newLine: Line): CellChanges {
    const columns = this.columns.of(oldLine, newLine);

    if (columns === null) {
      const wordChanges = diffWords(oldLine, newLine, this.options);
      return { wordChanges, removedCells: NO_CELLS, addedCells: NO_CELLS };
    }

    return diffTableCells(oldLine, newLine, columns, this.options);
  }

  /** The row of a removed line, marked whole. */
  private removedRow(oldLine: Line): ViewRow {
    const markedHtml = wholeLineHtml(oldLine, REMOVED_TEXT_MARKER);

    return {
      kind: LineChangeKind.Removed,
      oldLine: this.nextOldLine(oldLine, markedHtml),
      newLine: null,
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  /** The row of an added line, marked whole. */
  private addedRow(newLine: Line): ViewRow {
    const markedHtml = wholeLineHtml(newLine, ADDED_TEXT_MARKER);

    return {
      kind: LineChangeKind.Added,
      oldLine: null,
      newLine: this.nextNewLine(newLine, markedHtml),
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  /** The next line of the old version, with its number. */
  private nextOldLine(line: Line, html: string): ViewLine {
    this.oldLineCount++;
    return { kind: line.kind, number: this.oldLineCount, html, table: line.table };
  }

  /** The next line of the new version, with its number. */
  private nextNewLine(line: Line, html: string): ViewLine {
    this.newLineCount++;
    return { kind: line.kind, number: this.newLineCount, html, table: line.table };
  }
}

/**
 * HTML of an added or a removed line. A table line has its cells or its caption marked, since a
 * table line has no background of its own.
 */
function wholeLineHtml(line: Line, marker: ChangeMarker): string {
  return line.table === null ? line.html : markWholeTableLine(line, marker);
}

/**
 * Rows whose table lines hold the columns of their tables: each side its own tables, and the
 * merged lines of a table its columns of both versions.
 */
function withTableColumns(rows: readonly ViewRow[]): ViewRow[] {
  const oldLines = addTableColumns(rows.map((row) => row.oldLine));
  const newLines = addTableColumns(rows.map((row) => row.newLine));
  const mergedLines = addTableColumns(rows.map((row) => row.mergedLine));

  return rows.map((row, index) => ({
    ...row,
    oldLine: oldLines[index],
    newLine: newLines[index],
    mergedLine: mergedLines[index],
  }));
}

/**
 * The rows with the HTML of the lines that the diff edits sanitized again, because marking
 * changes, merging lines and adding columns edit it. An unchanged line outside tables is a part
 * of the sanitized version with prefixed ids only, so it keeps its HTML. The sanitizer cleans the
 * edited lines of all rows in one run.
 */
function sanitizedRows(rows: readonly ViewRow[]): ViewRow[] {
  const sanitizedHtml = sanitizedHtmlOf(rows.flatMap(editedLines));
  const sanitized = (line: ViewLine | null) => sanitizedLine(line, sanitizedHtml);

  return rows.map((row) => ({
    ...row,
    oldLine: sanitized(row.oldLine),
    newLine: sanitized(row.newLine),
    mergedLine: sanitized(row.mergedLine),
  }));
}

/**
 * The rows with their merged lines: a changed pair outside tables becomes one merged line, and so
 * does every line of a table whose two versions show as one table in the single column. The old
 * and new lines stay as they are, so only the merged lines get the columns of their tables and are
 * sanitized.
 */
function withMergedLines(
  rows: readonly ViewRow[],
  markedRows: readonly ViewRow[],
  rowBuilder: ViewRowBuilder,
  columns: ColumnMatches,
): ViewRow[] {
  const pairRows = markedRows.map((row) => rowBuilder.withMergedPair(row));
  const tableRows = withMergedTables(rowBuilder.tableRowSources(pairRows), columns.tablePairs());
  const mergedLines = sanitizedLines(addTableColumns(tableRows.map((row) => row.mergedLine)));

  return rows.map((row, index) => ({ ...row, mergedLine: mergedLines[index] }));
}

/** The lines with their HTML sanitized again in one run; `null` stays for no line. */
function sanitizedLines(lines: readonly (ViewLine | null)[]): (ViewLine | null)[] {
  const sanitizedHtml = sanitizedHtmlOf(lines.filter(isLine));

  return lines.map((line) => sanitizedLine(line, sanitizedHtml));
}

/** The HTML of each line, sanitized again; the sanitizer cleans them all in one run. */
function sanitizedHtmlOf(lines: readonly ViewLine[]): ReadonlyMap<ViewLine, string> {
  const sanitizedHtml = sanitizeHtmlPieces(lines.map((line) => line.html));

  return new Map(lines.map((line, position) => [line, sanitizedHtml[position]]));
}

/**
 * Lines of the row that the diff edits: every line of a changed, removed or added row, every
 * merged line and every line of a table, which gets the columns of its table.
 */
function editedLines(row: ViewRow): ViewLine[] {
  if (isUnchangedOutsideTables(row)) {
    return [row.mergedLine].filter(isLine);
  }

  return [row.oldLine, row.newLine, row.mergedLine].filter(isLine);
}

/** True for an unchanged row whose two lines are not lines of a table. */
function isUnchangedOutsideTables({ kind, oldLine, newLine }: ViewRow): boolean {
  return kind === LineChangeKind.Unchanged && oldLine?.table === null && newLine?.table === null;
}

/** The line with its sanitized HTML; a line that was not sanitized again stays as it is. */
function sanitizedLine(
  line: ViewLine | null,
  sanitizedLines: ReadonlyMap<ViewLine, string>,
): ViewLine | null {
  if (line === null) {
    return null;
  }

  const html = sanitizedLines.get(line);

  return html === undefined ? line : { ...line, html };
}

/** True when the line is there. */
function isLine(line: ViewLine | null): line is ViewLine {
  return line !== null;
}

/** Both changes with one list of details: the first's details, then the second's. */
function joinDescribedChanges(first: DescribedChanges, second: DescribedChanges): DescribedChanges {
  const detailShift = first.details.length;
  const shiftedOldRanges = second.oldRanges.map((range) => withShiftedDetails(range, detailShift));
  const shiftedNewRanges = second.newRanges.map((range) => withShiftedDetails(range, detailShift));

  return {
    oldRanges: [...first.oldRanges, ...shiftedOldRanges],
    newRanges: [...first.newRanges, ...shiftedNewRanges],
    details: [...first.details, ...second.details],
  };
}

/** The range with the positions of its details moved by `shift`. */
function withShiftedDetails(range: MarkedRange, shift: number): MarkedRange {
  const detailIndices = range.detailIndices?.map((detailIndex) => detailIndex + shift);
  return { ...range, detailIndices };
}
