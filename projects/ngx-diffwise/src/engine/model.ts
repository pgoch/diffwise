/** Kinds of document lines. */
export const LineKind = {
  /** `h1` to `h6`. */
  Heading: 'heading',
  /** `p`, a container with text only, or text outside any block. */
  Paragraph: 'paragraph',
  /** Any other block, such as a list or a table; one line for now. */
  Block: 'block',
} as const;

export type LineKind = (typeof LineKind)[keyof typeof LineKind];

/** A block a reader sees as one unit; HTML has no lines of its own. */
export interface Line {
  readonly kind: LineKind;
  /** Block tag, such as `p` or `ul`; `null` for text outside any block. */
  readonly tag: string | null;
  /** Text as a reader sees it; lines are compared by it. */
  readonly text: string;
  /** Sanitized HTML inside copies of its containers, such as a quote. */
  readonly html: string;
}

/** What counts as a difference between the two versions. */
export interface DiffOptions {
  /** Ignores differences in whitespace. */
  readonly ignoreWhitespace: boolean;
  /** Ignores differences in letter case. */
  readonly ignoreCase: boolean;
}

/** Default options: every difference counts. */
export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
};

/** Ways a line can differ between the two versions. */
export const LineChangeKind = {
  Unchanged: 'unchanged',
  /** A similar line on each side; their words are compared separately. */
  Changed: 'changed',
  Added: 'added',
  Removed: 'removed',
} as const;

export type LineChangeKind = (typeof LineChangeKind)[keyof typeof LineChangeKind];

/** A line, or a pair of lines, and how it differs between the two versions. */
export type LineChange =
  | {
      readonly kind: typeof LineChangeKind.Unchanged | typeof LineChangeKind.Changed;
      readonly oldLine: Line;
      readonly newLine: Line;
    }
  | { readonly kind: typeof LineChangeKind.Removed; readonly oldLine: Line }
  | { readonly kind: typeof LineChangeKind.Added; readonly newLine: Line };

/** Numbers of added, removed and changed lines. */
export interface DiffStats {
  readonly addedLines: number;
  readonly removedLines: number;
  readonly changedLines: number;
}

/** Line changes of a whole comparison, in reading order, with their numbers. */
export interface LineDiff {
  readonly changes: readonly LineChange[];
  readonly stats: DiffStats;
}

/** Part of a line's text, `[start, end)`, counted like `String.slice` counts. */
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

/** Text that differs inside a changed line pair. */
export interface WordChanges {
  /** Ranges in the old line's text. */
  readonly removed: readonly TextRange[];
  /** Ranges in the new line's text. */
  readonly added: readonly TextRange[];
}

/** A line as the view shows it. */
export interface ViewLine {
  /** Position of the line in its version, counted from 1. */
  readonly number: number;
  /** Sanitized HTML; in a changed line, removed or added words are marked. */
  readonly html: string;
}

/** A row of the side-by-side view: a line of each version, or of one of them. */
export interface ViewRow {
  readonly kind: LineChangeKind;
  /** `null` when the row shows an added line. */
  readonly oldLine: ViewLine | null;
  /** `null` when the row shows a removed line. */
  readonly newLine: ViewLine | null;
}

/** Two HTML documents compared: rows of the view in reading order, and change counts. */
export interface HtmlDiff {
  readonly rows: readonly ViewRow[];
  readonly stats: DiffStats;
}

/** How two HTML documents are compared and prepared for the view. */
export interface HtmlDiffSettings {
  /** What counts as a difference. */
  readonly options: DiffOptions;
  /** Starts every id in the shown HTML; each diff on a page needs its own. */
  readonly idPrefix: string;
}
