/** Kinds of document lines. */
export const LineKind = {
  /** `h1` to `h6`. */
  Heading: 'heading',
  /** `p`, a container with text only, or text outside any block. */
  Paragraph: 'paragraph',
  /** `li`, `dt` or `dd`, or the text of one next to its inner blocks, such as a nested list. */
  ListItem: 'listItem',
  /** A row of a table, `tr`, with its cells. */
  TableRow: 'tableRow',
  /** The caption of a table. */
  TableCaption: 'tableCaption',
  /** Any other block, such as a code block or a figure. */
  Block: 'block',
} as const;

export type LineKind = (typeof LineKind)[keyof typeof LineKind];

/** A block a reader sees as one unit; HTML has no lines of its own. */
export interface Line {
  readonly kind: LineKind;
  /** Block tag, such as `p` or `li`; `null` for text outside any block. */
  readonly tag: string | null;
  /** Text as a reader sees it; lines are compared by it. An image is one character of it. */
  readonly text: string;
  /** Format of each piece of the text, in reading order; a space between blocks has none. */
  readonly formats: readonly FormattedRange[];
  /** Images in the text, in reading order. */
  readonly images: readonly LineImage[];
  /**
   * Sanitized HTML inside copies of its containers, such as a quote or a list; its ids are prefixed
   * and appear only in the first line of their element.
   */
  readonly html: string;
  /** Marker of the list item that the line starts; `null` in other lines, or with no marker shown. */
  readonly marker: ListMarker | null;
  /** State of a checkbox that the list item starts with, as in a task list; `null` without one. */
  readonly checkbox: CheckboxState | null;
  /** Position of the line's table among the tables of its version, from 0; `null` outside tables. */
  readonly table: number | null;
  /** Cells of a table row, in reading order; empty in other lines. */
  readonly cells: readonly TableCell[];
}

/** A cell of a table row: its part of the line's text, and the columns it takes in the table. */
export interface TableCell extends TextRange {
  /** Column the cell starts in, counted from 0. */
  readonly column: number;
  /** Columns the cell spans, at least 1. */
  readonly columnSpan: number;
}

/** Kinds of lists by the markers of their items. */
export const ListType = {
  /** Bullets, such as dots or squares. */
  Bulleted: 'bulleted',
  /** Numbers, letters or Roman numerals. */
  Numbered: 'numbered',
} as const;

export type ListType = (typeof ListType)[keyof typeof ListType];

/** Looks of list markers as `list-style-type` names them; Diffwise draws and names these. */
export const ListStyle = {
  /** 1, 2, 3. */
  Decimal: 'decimal',
  /** 01, 02, 03. */
  DecimalLeadingZero: 'decimal-leading-zero',
  /** a, b, c; `lower-latin` is the same. */
  LowerAlpha: 'lower-alpha',
  /** A, B, C; `upper-latin` is the same. */
  UpperAlpha: 'upper-alpha',
  LowerRoman: 'lower-roman',
  UpperRoman: 'upper-roman',
  /** α, β, γ. */
  LowerGreek: 'lower-greek',
  /** Filled circles. */
  Disc: 'disc',
  /** Hollow circles. */
  Circle: 'circle',
  /** Filled squares. */
  Square: 'square',
  /** No marker. */
  None: 'none',
} as const;

export type ListStyle = (typeof ListStyle)[keyof typeof ListStyle];

/** The marker a list item shows before its first line, such as a dot or a number. */
export interface ListMarker {
  readonly listType: ListType;
  /** Look of the marker as `list-style-type` names it, such as `decimal` or `disc`. */
  readonly style: string;
  /** Number of the item in its list; a bulleted list counts its items too. */
  readonly number: number;
  /**
   * The number without the shift from items before the item, or from items after it in a list that
   * counts down from its length; items added or removed in the list leave it as it is.
   */
  readonly unshiftedNumber: number;
  /** Lists around the item: 1 in a list outside other lists. */
  readonly level: number;
}

/** States of a checkbox. */
export const CheckboxState = {
  Checked: 'checked',
  Unchecked: 'unchecked',
} as const;

export type CheckboxState = (typeof CheckboxState)[keyof typeof CheckboxState];

/** The text of a line and the images in it, which its words are compared by. */
export type LineContent = Pick<Line, 'text' | 'images'>;

/** What a reader sees of an image. */
export const ImageProperty = {
  /** Address of the image file, as its `src` gives it. */
  Source: 'source',
  /** Width as CSS writes it, such as `480px`. */
  Width: 'width',
  /** Height as CSS writes it, such as `270px`. */
  Height: 'height',
  /** Text that screen readers read instead of the image. */
  AltText: 'altText',
} as const;

export type ImageProperty = (typeof ImageProperty)[keyof typeof ImageProperty];

/** Each property of an image; `null` where the image does not set it. */
export type ImageProperties = Readonly<Record<ImageProperty, string | null>>;

/** An image in a line. */
export interface LineImage {
  /** Position of the image's character in the line's text. */
  readonly position: number;
  readonly properties: ImageProperties;
}

/** What counts as a difference between the two versions. */
export interface DiffOptions {
  /** Ignores differences in whitespace. */
  readonly ignoreWhitespace: boolean;
  /** Ignores differences in letter case. */
  readonly ignoreCase: boolean;
  /**
   * Ignores differences in formatting, such as italic → bold, heading levels and the look of list
   * markers, such as bullets → numbers; another number of a list item still counts.
   */
  readonly ignoreFormatting: boolean;
  /** Ignores links added, removed or pointing elsewhere around the same text. */
  readonly ignoreLinkChanges: boolean;
}

/** Default options: every difference counts. */
export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreFormatting: false,
  ignoreLinkChanges: false,
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

/** On-off formatting. Markup of the same look gives the same style, such as `b` and `strong`. */
export const TextStyle = {
  Bold: 'bold',
  Italic: 'italic',
  Underline: 'underline',
  Strikethrough: 'strikethrough',
  Superscript: 'superscript',
  Subscript: 'subscript',
  /** Code font: `code`, `kbd`, `samp`, `tt` and `pre`. */
  Code: 'code',
  /** Text marked with `mark`. */
  TextHighlight: 'textHighlight',
  SmallText: 'smallText',
  Uppercase: 'uppercase',
  Lowercase: 'lowercase',
  /** The first letter of each word in upper case. */
  Capitalized: 'capitalized',
} as const;

export type TextStyle = (typeof TextStyle)[keyof typeof TextStyle];

/** Formatting with a value, such as the text color. */
export const FormattingValue = {
  /** Level of the heading around the text, `1` to `6`; text outside headings has none. */
  HeadingLevel: 'headingLevel',
  TextColor: 'textColor',
  BackgroundColor: 'backgroundColor',
  FontFamily: 'fontFamily',
  FontSize: 'fontSize',
  /** Alignment of the block around the text, such as `center`. */
  TextAlignment: 'textAlignment',
} as const;

export type FormattingValue = (typeof FormattingValue)[keyof typeof FormattingValue];

/** Each formatting value as CSS writes it, or a heading level; `null` where none is set. */
export type FormattingValues = Readonly<Record<FormattingValue, string | null>>;

/** How a reader sees a piece of text besides its words: formatting and link. */
export interface TextFormat {
  /** On-off formatting, in the order of `TextStyle`. */
  readonly styles: readonly TextStyle[];
  readonly values: FormattingValues;
  /** Address of the link around the text, as its `href` gives it; `null` outside links. */
  readonly link: string | null;
}

/** Part of a line's text and its format. */
export interface FormattedRange extends TextRange {
  readonly format: TextFormat;
}

/** Starts the data attributes Diffwise puts in the HTML; the content's own are removed. */
export const DIFFWISE_DATA_ATTRIBUTE_START = 'data-diffwise-';

/** Positions of the change details a marker shows, separated by spaces, such as `0 1`. */
export const CHANGE_DETAILS_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}change-details`;

/** Separates the positions in `CHANGE_DETAILS_ATTRIBUTE`. */
export const DETAIL_INDEX_SEPARATOR = ' ';

/** Marks the list item that a line belongs to, such as the `li` of an item line, in its HTML. */
export const LINE_ITEM_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}line-item`;

/** Marks a copy of a list item in a later line of the item, which hides its marker. */
export const CONTINUED_ITEM_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}continued-item`;

/** Holds the text of a list marker that Diffwise draws in place of the browser's, such as `5.`. */
export const LIST_MARKER_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}list-marker`;

/** Marks the copy of a table in the HTML of a table line, which holds its caption or one row. */
export const TABLE_COPY_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}table-copy`;

/** Marks the copy of a cell from a row above, without content, in a lower row that it spans. */
export const CONTINUED_CELL_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}continued-cell`;

/** Part of a line's text to mark, and the change details its marker shows. */
export interface MarkedRange extends TextRange {
  /** Positions in the row's change details; changed text has none. */
  readonly detailIndices?: readonly number[];
}

/** Kinds of changes the view describes besides changed text. */
export const ChangeDetailKind = {
  /** Formatting of unchanged text, such as italic → bold, or a heading level. */
  Formatting: 'formatting',
  /** The link around unchanged text: another address, or a link added or removed. */
  Link: 'link',
  /** An image with another file, size or alternative text in the same place. */
  Image: 'image',
  /** The marker of a list item, such as a bullet that became a number, or its level. */
  ListMarker: 'listMarker',
  /** A checkbox at the start of a list item, checked or cleared. */
  Checkbox: 'checkbox',
} as const;

export type ChangeDetailKind = (typeof ChangeDetailKind)[keyof typeof ChangeDetailKind];

/** A formatting value before and after a change. */
export interface FormattingValueChange {
  readonly name: FormattingValue;
  /** `null` when the old text has no such value. */
  readonly oldValue: string | null;
  /** `null` when the new text has no such value. */
  readonly newValue: string | null;
}

/** Formatting of unchanged text that differs between the versions. */
export interface FormattingChangeDetail {
  readonly kind: typeof ChangeDetailKind.Formatting;
  /** Styles of the old text that the new text lacks, such as italic. */
  readonly removedStyles: readonly TextStyle[];
  /** Styles of the new text that the old text lacks, such as bold. */
  readonly addedStyles: readonly TextStyle[];
  /** Values that differ, such as the text color, in the order of `FormattingValue`. */
  readonly changedValues: readonly FormattingValueChange[];
}

/** The link around unchanged text that differs between the versions. */
export interface LinkChangeDetail {
  readonly kind: typeof ChangeDetailKind.Link;
  /** `null` when the link was added around the text. */
  readonly oldLink: string | null;
  /** `null` when the link was removed from around the text. */
  readonly newLink: string | null;
}

/** An image that differs between the versions in the same place. */
export interface ImageChangeDetail {
  readonly kind: typeof ChangeDetailKind.Image;
  readonly oldImage: ImageProperties;
  readonly newImage: ImageProperties;
  /** Properties that differ, in the order of `ImageProperty`. */
  readonly changedProperties: readonly ImageProperty[];
}

/** What can differ in the marker of a list item. */
export const ListMarkerProperty = {
  /** Bullets or numbers; a paragraph turned into a list item, or the other way round. */
  ListType: 'listType',
  /** Look of the bullets or numbers within the same type, such as numbers → letters. */
  Style: 'style',
  /** A number that the item's place in its list does not explain, such as one from another start. */
  Number: 'number',
  Level: 'level',
} as const;

export type ListMarkerProperty = (typeof ListMarkerProperty)[keyof typeof ListMarkerProperty];

/** The marker of a list item that differs between the versions. */
export interface ListMarkerChangeDetail {
  readonly kind: typeof ChangeDetailKind.ListMarker;
  /** `null` when the old line shows no marker, such as a paragraph. */
  readonly oldMarker: ListMarker | null;
  /** `null` when the new line shows no marker. */
  readonly newMarker: ListMarker | null;
  /** Properties that differ, in the order of `ListMarkerProperty`. */
  readonly changedProperties: readonly ListMarkerProperty[];
}

/** A checkbox at the start of a list item that was checked or cleared. */
export interface CheckboxChangeDetail {
  readonly kind: typeof ChangeDetailKind.Checkbox;
  readonly oldState: CheckboxState;
  readonly newState: CheckboxState;
}

/** A change of a list item besides its text: its marker, or its checkbox. */
export type ListItemChangeDetail = ListMarkerChangeDetail | CheckboxChangeDetail;

/** A change besides changed text, described in the view. */
export type ChangeDetail =
  FormattingChangeDetail | LinkChangeDetail | ImageChangeDetail | ListItemChangeDetail;

/** Changes described in the view: their ranges in each line and their details. */
export interface DescribedChanges {
  /** Ranges in the old line's text, with the positions of their details. */
  readonly oldRanges: readonly MarkedRange[];
  /** Ranges in the new line's text, with the positions of their details. */
  readonly newRanges: readonly MarkedRange[];
  readonly details: readonly ChangeDetail[];
}

/** A line as the view shows it. */
export interface ViewLine {
  /** Position of the line in its version, counted from 1. */
  readonly number: number;
  /** Sanitized HTML; in a changed line, changed text, formatting and images are marked. */
  readonly html: string;
  /** Position of the line's table among the tables of its version, from 0; `null` outside tables. */
  readonly table: number | null;
}

/** A row of the side-by-side view: a line of each version, or of one of them. */
export interface ViewRow {
  readonly kind: LineChangeKind;
  /** `null` when the row shows an added line. */
  readonly oldLine: ViewLine | null;
  /** `null` when the row shows a removed line. */
  readonly newLine: ViewLine | null;
  /** Changes besides changed text, such as formatting; markers point to them by position. */
  readonly changeDetails: readonly ChangeDetail[];
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
