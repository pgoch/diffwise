import { diffLines } from './compare/diff-lines';
import { diffWords } from './compare/diff-words';
import { parseHtml } from './html/parse-html';
import { prefixIds } from './html/prefix-ids';
import { sanitizeHtml } from './html/sanitize-html';
import { splitLines } from './html/split-lines';
import { ADDED_TEXT_MARKER, REMOVED_TEXT_MARKER, markChanges } from './mark/mark-changes';
import {
  type DiffOptions,
  type HtmlDiff,
  type HtmlDiffSettings,
  type Line,
  type LineChange,
  LineChangeKind,
  type ViewLine,
  type ViewRow,
} from './model';

const ID_PART_SEPARATOR = '-';
const OLD_VERSION_ID_PART = 'old';
const NEW_VERSION_ID_PART = 'new';

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
  const root = parseHtml(html);

  prefixIds(root, `${idPrefix}${ID_PART_SEPARATOR}${versionPart}${ID_PART_SEPARATOR}`);

  return splitLines(root);
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
    };
  }

  /** A row of a changed pair: removed words marked in the old line, added words in the new one. */
  private changedRow(oldLine: Line, newLine: Line): ViewRow {
    const { removed, added } = diffWords(oldLine.text, newLine.text, this.options);
    const markedOldHtml = markChanges(oldLine, removed, REMOVED_TEXT_MARKER);
    const markedNewHtml = markChanges(newLine, added, ADDED_TEXT_MARKER);

    return {
      kind: LineChangeKind.Changed,
      oldLine: this.nextOldLine(markedOldHtml),
      newLine: this.nextNewLine(markedNewHtml),
    };
  }

  private removedRow(oldLine: Line): ViewRow {
    return { kind: LineChangeKind.Removed, oldLine: this.nextOldLine(oldLine.html), newLine: null };
  }

  private addedRow(newLine: Line): ViewRow {
    return { kind: LineChangeKind.Added, oldLine: null, newLine: this.nextNewLine(newLine.html) };
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
