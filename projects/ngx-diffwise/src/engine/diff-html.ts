import { type ColumnMatches, alignTableColumns } from './compare/align-table-columns';
import { diffFormats } from './compare/diff-formats';
import { diffImages } from './compare/diff-images';
import { diffLines } from './compare/diff-lines';
import { diffListMarkers, itemNumberChanged } from './compare/diff-list-markers';
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
import { mergeLines } from './mark/merge-lines';
import {
  type ChangedTableLine,
  type TableRowSource,
  withMergedTables,
} from './mark/merge-table-rows';
import { addTableColumns } from './mark/table-columns';
import {
  type ChangeDetail,
  ChangeDetailKind,
  type DescribedChanges,
  type DiffOptions,
  type HtmlDiff,
  type HtmlDiffSettings,
  type Line,
  type LineChange,
  LineChangeKind,
  type ListItemChangeDetail,
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
const NO_DESCRIBED_CHANGES: DescribedChanges = { oldRanges: [], newRanges: [], details: [] };

/**
 * Compares two HTML documents and returns the rows of the side-by-side view with change counts.
 * Table lines get the columns of their tables after marking, since marks widen cells. When the
 * settings ask for it, each changed pair gets its merged line too, for the single-column view, and
 * so does every line of a table whose two versions show as one table there.
 */
export function diffHtml(oldHtml: string, newHtml: string, settings: HtmlDiffSettings): HtmlDiff {
  const oldLines = versionLines(oldHtml, settings.idPrefix, OLD_VERSION_ID_PART);
  const newLines = versionLines(newHtml, settings.idPrefix, NEW_VERSION_ID_PART);
  const { changes, stats } = diffLines(oldLines, newLines, settings.options);
  const columns = alignTableColumns(changes, settings.options);
  const rowBuilder = new ViewRowBuilder(settings, columns);
  const markedRows = changes.map((change) => rowBuilder.toRow(change));
  const mergedRows = settings.mergesChangedLines
    ? withMergedTables(rowBuilder.tableRowSources(markedRows), columns.tablePairs())
    : markedRows;
  const rows = sanitizedRows(withTableColumns(mergedRows));

  return { rows, stats };
}

/**
 * Lines of one version. Its ids get a prefix of their own, such as `diffwise-1-old-`, so links
 * such as footnotes work within each version.
 */
function versionLines(html: string, idPrefix: string, versionPart: string): Line[] {
  const versionIdPrefix = `${idPrefix}${ID_PART_SEPARATOR}${versionPart}${ID_PART_SEPARATOR}`;
  return splitLines(parseHtml(html), versionIdPrefix);
}

/** Turns line changes into view rows and numbers the lines of each version from 1. */
class ViewRowBuilder {
  private oldLineCount = 0;
  private newLineCount = 0;

  private readonly options: DiffOptions;
  private readonly mergesChangedLines: boolean;

  /** What merging needs for each row of a changed line of a table. */
  private readonly changedTableLines = new Map<ViewRow, ChangedTableLine>();

  constructor(
    settings: HtmlDiffSettings,
    private readonly columns: ColumnMatches,
  ) {
    this.options = settings.options;
    this.mergesChangedLines = settings.mergesChangedLines;
  }

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
   * text and described changes in the new one; their markers point to the row's details. Details of
   * the list item come first. A cell with no place on the other side is marked whole. A pair
   * outside tables also becomes one merged line, when the diff merges lines.
   */
  private changedRow(oldLine: Line, newLine: Line): ViewRow {
    const itemDetails = diffListMarkers(oldLine, newLine, this.options);
    const cellChanges = this.cellChangesOf(oldLine, newLine);
    const changedText = allChangedText(oldLine, newLine, cellChanges);
    const formatChanges = diffFormats(oldLine, newLine, changedText, this.options);
    const imageChanges = diffImages(oldLine, newLine, changedText, this.options);
    const itemChanges = { ...NO_DESCRIBED_CHANGES, details: itemDetails };
    const textChanges = joinDescribedChanges(formatChanges, imageChanges);
    const describedChanges = joinDescribedChanges(itemChanges, textChanges);
    const itemMarks = listItemMarks(itemDetails, itemNumberChanged(oldLine, newLine));
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
    const mergedHtml = this.mergesChangedLines && !isInTable ? mergeLines(pair) : null;
    const row: ViewRow = {
      kind: LineChangeKind.Changed,
      oldLine: shownOldLine,
      newLine: shownNewLine,
      changeDetails: describedChanges.details,
      mergedLine: mergedHtml === null ? null : { ...shownNewLine, html: mergedHtml },
    };

    if (isInTable) {
      this.changedTableLines.set(row, { pair, removedCells });
    }

    return row;
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

  private removedRow(oldLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Removed,
      oldLine: this.nextOldLine(oldLine, wholeLineHtml(oldLine, REMOVED_TEXT_MARKER)),
      newLine: null,
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  private addedRow(newLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Added,
      oldLine: null,
      newLine: this.nextNewLine(newLine, wholeLineHtml(newLine, ADDED_TEXT_MARKER)),
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  private nextOldLine(line: Line, html: string): ViewLine {
    this.oldLineCount++;
    return { kind: line.kind, number: this.oldLineCount, html, table: line.table };
  }

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
 * The rows with the HTML of their lines sanitized again, because marking changes and adding
 * columns edit it. The sanitizer cleans the lines of all rows in one run.
 */
function sanitizedRows(rows: readonly ViewRow[]): ViewRow[] {
  const lines = rows.flatMap(({ oldLine, newLine, mergedLine }) =>
    [oldLine, newLine, mergedLine].filter(isLine),
  );
  const sanitizedHtml = sanitizeHtmlPieces(lines.map((line) => line.html));
  const sanitizedLines = new Map(lines.map((line, position) => [line, sanitizedHtml[position]]));
  const sanitized = (line: ViewLine | null) => sanitizedLine(line, sanitizedLines);

  return rows.map((row) => ({
    ...row,
    oldLine: sanitized(row.oldLine),
    newLine: sanitized(row.newLine),
    mergedLine: sanitized(row.mergedLine),
  }));
}

/** The line with its sanitized HTML; `null` for no line. */
function sanitizedLine(
  line: ViewLine | null,
  sanitizedLines: ReadonlyMap<ViewLine, string>,
): ViewLine | null {
  const html = line === null ? undefined : sanitizedLines.get(line);
  return line === null || html === undefined ? null : { ...line, html };
}

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

/**
 * Marks of a changed list item: positions of the details of its marker and checkbox, among the
 * first details. Another number alone marks the marker without details.
 */
function listItemMarks(
  itemDetails: readonly ListItemChangeDetail[],
  numberChanged: boolean,
): ListItemMarks {
  const listMarkerDetails = positionsOfKind(itemDetails, ChangeDetailKind.ListMarker);

  return {
    listMarkerChanged: numberChanged || listMarkerDetails.length > 0,
    listMarkerDetails,
    checkboxDetails: positionsOfKind(itemDetails, ChangeDetailKind.Checkbox),
  };
}

function positionsOfKind(details: readonly ChangeDetail[], kind: ChangeDetailKind): number[] {
  return details.flatMap((detail, position) => (detail.kind === kind ? [position] : []));
}
