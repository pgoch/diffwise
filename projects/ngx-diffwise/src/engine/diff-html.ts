import { diffFormats } from './compare/diff-formats';
import { diffImages } from './compare/diff-images';
import { diffLines } from './compare/diff-lines';
import { diffWords } from './compare/diff-words';
import { parseHtml } from './html/parse-html';
import { sanitizeHtml } from './html/sanitize-html';
import { splitLines } from './html/split-lines';
import { ADDED_TEXT_MARKER, REMOVED_TEXT_MARKER, markChanges } from './mark/mark-changes';
import {
  type ChangeDetail,
  type DescribedChanges,
  type DiffOptions,
  type HtmlDiff,
  type HtmlDiffSettings,
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

/** Compares two HTML documents and returns the rows of the side-by-side view with change counts. */
export function diffHtml(oldHtml: string, newHtml: string, settings: HtmlDiffSettings): HtmlDiff {
  const oldLines = versionLines(oldHtml, settings.idPrefix, OLD_VERSION_ID_PART);
  const newLines = versionLines(newHtml, settings.idPrefix, NEW_VERSION_ID_PART);
  const { changes, stats } = diffLines(oldLines, newLines, settings.options);
  const rowBuilder = new ViewRowBuilder(settings.options);
  const rows = changes.map((change) => rowBuilder.toRow(change));

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

  constructor(private readonly options: DiffOptions) {}

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
      oldLine: this.nextOldLine(oldLine.html),
      newLine: this.nextNewLine(newLine.html),
      changeDetails: NO_CHANGE_DETAILS,
    };
  }

  /**
   * A row of a changed pair. Removed text and described changes are marked in the old line, added
   * text and described changes in the new one; their markers point to the row's details.
   */
  private changedRow(oldLine: Line, newLine: Line): ViewRow {
    const wordChanges = diffWords(oldLine, newLine, this.options);
    const formatChanges = diffFormats(oldLine, newLine, wordChanges, this.options);
    const imageChanges = diffImages(oldLine, newLine, wordChanges, this.options);
    const describedChanges = joinDescribedChanges(formatChanges, imageChanges);
    const oldRanges = [...wordChanges.removed, ...describedChanges.oldRanges];
    const newRanges = [...wordChanges.added, ...describedChanges.newRanges];
    const markedOldHtml = markChanges(oldLine, oldRanges, REMOVED_TEXT_MARKER);
    const markedNewHtml = markChanges(newLine, newRanges, ADDED_TEXT_MARKER);

    return {
      kind: LineChangeKind.Changed,
      oldLine: this.nextOldLine(markedOldHtml),
      newLine: this.nextNewLine(markedNewHtml),
      changeDetails: describedChanges.details,
    };
  }

  private removedRow(oldLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Removed,
      oldLine: this.nextOldLine(oldLine.html),
      newLine: null,
      changeDetails: NO_CHANGE_DETAILS,
    };
  }

  private addedRow(newLine: Line): ViewRow {
    return {
      kind: LineChangeKind.Added,
      oldLine: null,
      newLine: this.nextNewLine(newLine.html),
      changeDetails: NO_CHANGE_DETAILS,
    };
  }

  private nextOldLine(html: string): ViewLine {
    this.oldLineCount++;
    return viewLine(this.oldLineCount, html);
  }

  private nextNewLine(html: string): ViewLine {
    this.newLineCount++;
    return viewLine(this.newLineCount, html);
  }
}

/** A numbered line. Its HTML is sanitized again, because marking changes edits it. */
function viewLine(number: number, html: string): ViewLine {
  return { number, html: sanitizeHtml(html) };
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
