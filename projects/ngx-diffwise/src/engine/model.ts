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
