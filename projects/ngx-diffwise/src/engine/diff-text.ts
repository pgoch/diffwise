import { countChanges, diffLines } from './compare/diff-lines';
import { diffWords } from './compare/diff-words';
import { ADDED_TEXT_MARKER, REMOVED_TEXT_MARKER } from './mark/mark-changes';
import {
  type ChangeDetail,
  type Comparison,
  type ComparisonSettings,
  type DiffOptions,
  type DiffStats,
  type Line,
  type LineChange,
  LineChangeKind,
  type ViewLine,
  type ViewRow,
} from './model';
import {
  type TextHtml,
  markedTextHtml,
  mergedTextHtml,
  textHtml,
  whitespaceMarkedHtml,
} from './text/text-line-html';
import { textLines } from './text/text-lines';

/** Plain text has no formatting, links or images to describe. */
const NO_CHANGE_DETAILS: readonly ChangeDetail[] = [];

const NO_TEXT = '';

/** Text of a blank line: empty, or of whitespace alone. */
const BLANK_TEXT = /^\s*$/;

/**
 * Compares two versions of plain text line by line and returns the rows of the side-by-side view
 * with change counts. Lines and words are compared as in HTML documents, and spaces and tabs stay
 * as in the text. The text never becomes HTML, so a tag in it shows as plain characters. When the
 * settings ask for it, each changed pair gets its merged line too, for the single-column view. When
 * the options ignore blank lines, blank lines are compared as empty ones, and a blank line added or
 * removed is an unchanged line of its version alone, which the numbers of changes leave out.
 */
export function diffText(
  oldText: string,
  newText: string,
  settings: ComparisonSettings,
): Comparison {
  const { options, marksAllWhitespace } = settings;
  const unchangedHtml = marksAllWhitespace ? whitespaceMarkedHtml : textHtml;
  const oldLines = comparedLines(textLines(oldText, unchangedHtml), options);
  const newLines = comparedLines(textLines(newText, unchangedHtml), options);
  const lineDiff = diffLines(oldLines, newLines, options);
  const rowBuilder = new TextRowBuilder(settings, unchangedHtml);
  const rows = lineDiff.changes.map((change) => rowBuilder.toRow(change));
  const stats = options.ignoreBlankLines
    ? statsWithoutBlankLines(lineDiff.changes)
    : lineDiff.stats;

  return { rows, stats };
}

/** Turns line changes of plain text into view rows and numbers the lines of each version from 1. */
class TextRowBuilder {
  private oldLineCount = 0;
  private newLineCount = 0;

  private readonly options: DiffOptions;
  private readonly mergesChangedLines: boolean;

  /** HTML of unchanged text in a changed line. */
  private readonly unchangedHtml: TextHtml;

  constructor(settings: ComparisonSettings, unchangedHtml: TextHtml) {
    this.options = settings.options;
    this.mergesChangedLines = settings.mergesChangedLines;
    this.unchangedHtml = unchangedHtml;
  }

  /** The row of the view for a change of lines. */
  toRow(change: LineChange): ViewRow {
    if (this.options.ignoreBlankLines && isBlankLineChange(change)) {
      return this.blankLineRow(change);
    }

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
   * A row of a changed pair: removed text marked in the old line and added text in the new one. The
   * pair also becomes one merged line, when the diff merges lines.
   */
  private changedRow(oldLine: Line, newLine: Line): ViewRow {
    const wordChanges = diffWords(oldLine, newLine, this.options);
    const { removed, added } = wordChanges;
    const oldHtml = markedTextHtml(oldLine.text, removed, REMOVED_TEXT_MARKER, this.unchangedHtml);
    const newHtml = markedTextHtml(newLine.text, added, ADDED_TEXT_MARKER, this.unchangedHtml);
    const shownOldLine = this.nextOldLine(oldLine, oldHtml);
    const shownNewLine = this.nextNewLine(newLine, newHtml);
    const mergedHtml = this.mergesChangedLines
      ? mergedTextHtml({ oldLine, newLine, wordChanges }, this.unchangedHtml)
      : null;
    const mergedLine = mergedHtml === null ? null : { ...shownNewLine, html: mergedHtml };

    return {
      kind: LineChangeKind.Changed,
      oldLine: shownOldLine,
      newLine: shownNewLine,
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine,
    };
  }

  /** The row of a blank line added or removed, which the comparison ignores: unchanged, alone. */
  private blankLineRow(change: LineChange): ViewRow {
    const oldLine =
      change.kind === LineChangeKind.Removed
        ? this.nextOldLine(change.oldLine, change.oldLine.html)
        : null;
    const newLine =
      change.kind === LineChangeKind.Added
        ? this.nextNewLine(change.newLine, change.newLine.html)
        : null;

    return {
      kind: LineChangeKind.Unchanged,
      oldLine,
      newLine,
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  /** The row of a removed line. */
  private removedRow(oldLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Removed,
      oldLine: this.nextOldLine(oldLine, oldLine.html),
      newLine: null,
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  /** The row of an added line. */
  private addedRow(newLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Added,
      oldLine: null,
      newLine: this.nextNewLine(newLine, newLine.html),
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
 * The lines as the comparison takes them: when blank lines are ignored, each blank line is empty, so
 * a blank line of spaces in place of an empty one is no change. Each line keeps its HTML.
 */
function comparedLines(lines: Line[], options: DiffOptions): Line[] {
  if (!options.ignoreBlankLines) {
    return lines;
  }

  return lines.map((line) => (isBlank(line) ? { ...line, text: NO_TEXT } : line));
}

/** Numbers of the changes besides blank lines added or removed. */
function statsWithoutBlankLines(changes: readonly LineChange[]): DiffStats {
  const countedChanges = changes.filter((change) => !isBlankLineChange(change));
  return countChanges(countedChanges);
}

/** True for a blank line added or removed. */
function isBlankLineChange(change: LineChange): boolean {
  if (change.kind === LineChangeKind.Removed) {
    return isBlank(change.oldLine);
  }

  if (change.kind === LineChangeKind.Added) {
    return isBlank(change.newLine);
  }

  return false;
}

/** True for a line without text, or of whitespace alone. */
function isBlank(line: Line): boolean {
  return BLANK_TEXT.test(line.text);
}
