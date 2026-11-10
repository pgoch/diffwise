/** How a part of a tooltip line shows. */
export const TooltipPartKind = {
  Text: 'text',
  /** An address or a file, in a code font. */
  Code: 'code',
  /** A swatch of a color; the text of the part is the CSS color. */
  Color: 'color',
} as const;

export type TooltipPartKind = (typeof TooltipPartKind)[keyof typeof TooltipPartKind];

/** Changes that a highlighted part of a value shows (U9 C). */
export const TooltipHighlight = {
  /** A part only the old value has. */
  Removed: 'removed',
  /** A part only the new value has. */
  Added: 'added',
} as const;

export type TooltipHighlight = (typeof TooltipHighlight)[keyof typeof TooltipHighlight];

/** A piece of a tooltip line. */
export interface TooltipPart {
  readonly kind: TooltipPartKind;
  readonly text: string;
  /** The change the part shows, highlighted; `null` for a part both values have. */
  readonly highlight: TooltipHighlight | null;
}

/** Kinds of tooltip lines. */
export const TooltipLineKind = {
  /** Heads the lines after it, such as "alternative text". */
  Subtitle: 'subtitle',
  /** Describes a change, such as "italic → bold". */
  Description: 'description',
  /** A value with its label, such as an old address after "Before". */
  Row: 'row',
} as const;

export type TooltipLineKind = (typeof TooltipLineKind)[keyof typeof TooltipLineKind];

/** A line of a tooltip. */
export interface TooltipLine {
  readonly kind: TooltipLineKind;
  /** Label of a row, such as "Before"; `null` for the other lines. */
  readonly label: string | null;
  readonly parts: readonly TooltipPart[];
}

/** Lines of one change in a tooltip. */
export interface TooltipSection {
  /** Title of one change among several; `null` when the tooltip shows one change. */
  readonly title: string | null;
  readonly lines: readonly TooltipLine[];
}

/** What a tooltip shows: a title, and the lines of one change or of several. */
export interface TooltipContent {
  readonly title: string;
  readonly sections: readonly TooltipSection[];
}

export function tooltipPart(
  kind: TooltipPartKind,
  text: string,
  highlight: TooltipHighlight | null = null,
): TooltipPart {
  return { kind, text, highlight };
}

export function textPart(text: string): TooltipPart {
  return tooltipPart(TooltipPartKind.Text, text);
}

export function codePart(text: string): TooltipPart {
  return tooltipPart(TooltipPartKind.Code, text);
}

/** A swatch of a CSS color, such as `rgb(192, 57, 43)`. */
export function colorPart(color: string): TooltipPart {
  return { kind: TooltipPartKind.Color, text: color, highlight: null };
}

export function subtitleLine(text: string): TooltipLine {
  return { kind: TooltipLineKind.Subtitle, label: null, parts: [textPart(text)] };
}

export function descriptionLine(parts: readonly TooltipPart[]): TooltipLine {
  return { kind: TooltipLineKind.Description, label: null, parts };
}

export function rowLine(label: string, parts: readonly TooltipPart[]): TooltipLine {
  return { kind: TooltipLineKind.Row, label, parts };
}

/** A tooltip with a title only, such as the name of a version icon. */
export function titleOnlyTooltip(title: string): TooltipContent {
  return { title, sections: [] };
}
