import { diffLines } from './compare/diff-lines';
import { diffWords } from './compare/diff-words';
import { ADDED_TEXT_MARKER, REMOVED_TEXT_MARKER } from './mark/mark-changes';
import {
  type ChangeDetail,
  type Comparison,
  type ComparisonSettings,
  type DiffOptions,
  type Line,
  type LineChange,
  LineChangeKind,
  type ViewLine,
  type ViewRow,
} from './model';
import { markedTextHtml, mergedTextHtml } from './text/text-line-html';
import { textLines } from './text/text-lines';

/** Plain text has no formatting, links or images to describe. */
const NO_CHANGE_DETAILS: readonly ChangeDetail[] = [];

/**
 * Compares two versions of plain text line by line and returns the rows of the side-by-side view
 * with change counts. Lines and words are compared as in HTML documents, and spaces and tabs stay
 * as in the text. The text never becomes HTML, so a tag in it shows as plain characters. When the
 * settings ask for it, each changed pair gets its merged line too, for the single-column view.
 */
export function diffText(
  oldText: string,
  newText: string,
  settings: ComparisonSettings,
): Comparison {
  const { changes, stats } = diffLines(textLines(oldText), textLines(newText), settings.options);
  const rowBuilder = new TextRowBuilder(settings);
  const rows = changes.map((change) => rowBuilder.toRow(change));

  return { rows, stats };
}

/** Turns line changes of plain text into view rows and numbers the lines of each version from 1. */
class TextRowBuilder {
  private oldLineCount = 0;
  private newLineCount = 0;

  private readonly options: DiffOptions;
  private readonly mergesChangedLines: boolean;

  constructor(settings: ComparisonSettings) {
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
   * A row of a changed pair: removed text marked in the old line and added text in the new one. The
   * pair also becomes one merged line, when the diff merges lines.
   */
  private changedRow(oldLine: Line, newLine: Line): ViewRow {
    const wordChanges = diffWords(oldLine, newLine, this.options);
    const oldHtml = markedTextHtml(oldLine.text, wordChanges.removed, REMOVED_TEXT_MARKER);
    const newHtml = markedTextHtml(newLine.text, wordChanges.added, ADDED_TEXT_MARKER);
    const shownOldLine = this.nextOldLine(oldLine, oldHtml);
    const shownNewLine = this.nextNewLine(newLine, newHtml);
    const mergedHtml = this.mergesChangedLines
      ? mergedTextHtml({ oldLine, newLine, wordChanges })
      : null;

    return {
      kind: LineChangeKind.Changed,
      oldLine: shownOldLine,
      newLine: shownNewLine,
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: mergedHtml === null ? null : { ...shownNewLine, html: mergedHtml },
    };
  }

  private removedRow(oldLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Removed,
      oldLine: this.nextOldLine(oldLine, oldLine.html),
      newLine: null,
      changeDetails: NO_CHANGE_DETAILS,
      mergedLine: null,
    };
  }

  private addedRow(newLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Added,
      oldLine: null,
      newLine: this.nextNewLine(newLine, newLine.html),
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
