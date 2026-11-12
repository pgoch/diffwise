/** Color modes of the diff. */
export const DiffwiseColorMode = {
  /** Follows the system, or the dark mode of the app when `darkModeSelector` is set. */
  Auto: 'auto',
  /** Always light. */
  Light: 'light',
  /** Always dark. */
  Dark: 'dark',
} as const;

export type DiffwiseColorMode = (typeof DiffwiseColorMode)[keyof typeof DiffwiseColorMode];

/** Styles of changed words: the same background, and for some styles lines in the accent color. */
export const DiffwiseHighlightStyle = {
  /** An outline around the changed words. */
  Outline: 'outline',
  /** Only the background. */
  Background: 'background',
  /** A line under the changed words. */
  Underline: 'underline',
  /** Lines above and under the changed words. */
  TopBottom: 'top-bottom',
} as const;

export type DiffwiseHighlightStyle =
  (typeof DiffwiseHighlightStyle)[keyof typeof DiffwiseHighlightStyle];

/** A level of a scale, from 1, the weakest, to 5, the strongest. */
export type DiffwiseLevel = 1 | 2 | 3 | 4 | 5;

/** What the number of a changed line gets. */
export const DiffwiseLineNumberStyle = {
  /** A colored number with a bar. */
  Bar: 'bar',
  /** A colored background of the number. */
  Background: 'background',
} as const;

export type DiffwiseLineNumberStyle =
  (typeof DiffwiseLineNumberStyle)[keyof typeof DiffwiseLineNumberStyle];

/** What stands between the two versions. */
export const DiffwiseDividerStyle = {
  /** A gray column. */
  Column: 'column',
  /** A thin line. */
  Line: 'line',
} as const;

export type DiffwiseDividerStyle = (typeof DiffwiseDividerStyle)[keyof typeof DiffwiseDividerStyle];

/** What fills the place opposite an added or a removed line. */
export const DiffwiseGapStyle = {
  /** Diagonal stripes, unbroken from row to row. */
  Stripes: 'stripes',
  /** A gray background, darker than the diff in the light theme and lighter in the dark one. */
  Gray: 'gray',
  /** Nothing: the place looks like a line without text. */
  Empty: 'empty',
} as const;

export type DiffwiseGapStyle = (typeof DiffwiseGapStyle)[keyof typeof DiffwiseGapStyle];

/** Places along a line; start and end follow the direction of the text. */
export const DiffwiseAlignment = {
  Start: 'start',
  Center: 'center',
  End: 'end',
} as const;

export type DiffwiseAlignment = (typeof DiffwiseAlignment)[keyof typeof DiffwiseAlignment];

/** Places of the line numbers in the height of their lines. */
export const DiffwiseVerticalAlignment = {
  /** At the first line of the text. */
  Top: 'top',
  Middle: 'middle',
  /** At the last line of the text. */
  Bottom: 'bottom',
} as const;

export type DiffwiseVerticalAlignment =
  (typeof DiffwiseVerticalAlignment)[keyof typeof DiffwiseVerticalAlignment];

/** Layouts of the diff. */
export const DiffwiseLayout = {
  /** A single column in a diff narrower than `layoutBreakpoint`, or else the versions side by side. */
  Auto: 'auto',
  /** The two versions next to each other. */
  SideBySide: 'side-by-side',
  /** A single column with the lines of both versions. */
  Inline: 'inline',
} as const;

export type DiffwiseLayout = (typeof DiffwiseLayout)[keyof typeof DiffwiseLayout];

/** Fonts of the diff; an app can also give the name of a font it loads. */
export const DiffwiseFontFamily = {
  /** The font of the element around the diff. */
  Inherit: 'inherit',
  /** The font of the system. */
  Builtin: 'builtin',
} as const;

export type DiffwiseFontFamily = (typeof DiffwiseFontFamily)[keyof typeof DiffwiseFontFamily];

/** Where the details of a change besides its text show, such as the old and new link address. */
export const DiffwiseChangeDetails = {
  /** In a tooltip of the marked change, on hover; marked changes can take the focus then. */
  Hover: 'hover',
  /** In a tooltip of an icon between the versions, on hover and on focus. */
  Icon: 'icon',
  /** In both places. */
  Both: 'both',
} as const;

export type DiffwiseChangeDetails =
  (typeof DiffwiseChangeDetails)[keyof typeof DiffwiseChangeDetails];

/** Looks of the icons between the versions that show the details of changes. */
export const DiffwiseChangeDetailsIconStyle = {
  /** A gray frame. */
  Plain: 'plain',
  /** A frame with a gradient from the color of the old version to the color of the new one. */
  Gradient: 'gradient',
  /** A background with the gradient of the frame. */
  Filled: 'filled',
} as const;

export type DiffwiseChangeDetailsIconStyle =
  (typeof DiffwiseChangeDetailsIconStyle)[keyof typeof DiffwiseChangeDetailsIconStyle];

/** Colors of the tooltips. */
export const DiffwiseTooltipColorMode = {
  /** The colors of the opposite theme: dark tooltips on a light diff, light ones on a dark diff. */
  Reversed: 'reversed',
  /** The colors of the diff. */
  Component: 'component',
} as const;

export type DiffwiseTooltipColorMode =
  (typeof DiffwiseTooltipColorMode)[keyof typeof DiffwiseTooltipColorMode];

/** Headers above the two versions; an app can also give its own texts instead. */
export const DiffwiseVersionHeaders = {
  /** No headers. */
  None: 'none',
  /** "Previous version" and "New version". */
  Default: 'default',
  /** Icons for the earlier and the later version, named by the default texts. */
  Icons: 'icons',
} as const;

export type DiffwiseVersionHeaders =
  (typeof DiffwiseVersionHeaders)[keyof typeof DiffwiseVersionHeaders];

/** Headers an app gives to the two versions, such as a version number with a date. */
export interface DiffwiseVersionHeaderTexts {
  /** Header of the earlier version, such as `Version 3 · 12.10.2026`. */
  readonly old: string;
  /** Header of the later version. */
  readonly new: string;
}

/** Languages of the interface. */
export const DiffwiseLanguage = {
  /** The language of the app (`LOCALE_ID`) when the interface has it, or else English. */
  Auto: 'auto',
  /** English. */
  EN: 'en',
  /** Polish. */
  PL: 'pl',
} as const;

export type DiffwiseLanguage = (typeof DiffwiseLanguage)[keyof typeof DiffwiseLanguage];
