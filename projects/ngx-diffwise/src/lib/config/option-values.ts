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

/** Colors of changes. */
export const DiffwisePalette = {
  /** Red for removed and green for added. */
  Default: 'default',
  /** Orange for removed and blue for added, which colorblind readers tell apart. */
  Colorblind: 'colorblind',
  /**
   * No colored backgrounds: changes in frames, solid and blue when added, dashed, orange and struck
   * through when removed.
   */
  HighContrast: 'high-contrast',
} as const;

export type DiffwisePalette = (typeof DiffwisePalette)[keyof typeof DiffwisePalette];

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

/** Ways the single column shows a changed line. */
export const DiffwiseInlineDiffStyle = {
  /** One line: the new line with the removed text in it, before the text that replaces it. */
  Merged: 'merged',
  /** One line like `Merged`, with removed text and removed lines struck through. */
  Strikethrough: 'strikethrough',
  /** Two lines: the old line above the new one. */
  Stacked: 'stacked',
} as const;

export type DiffwiseInlineDiffStyle =
  (typeof DiffwiseInlineDiffStyle)[keyof typeof DiffwiseInlineDiffStyle];

/** What the diff shows under the text that the versions are the same. */
export const DiffwiseNoChangesView = {
  /** Nothing: the toolbar with the text alone. */
  Message: 'message',
  /** The document once: one column of line numbers and the content across the whole width. */
  Document: 'document',
  /** Both versions, as a diff shows them when they differ. */
  Diff: 'diff',
} as const;

export type DiffwiseNoChangesView =
  (typeof DiffwiseNoChangesView)[keyof typeof DiffwiseNoChangesView];

/** How the diff shows the block of changes that the navigation has stepped to. */
export const DiffwiseActiveChangeStyle = {
  /** A frame around the whole block. */
  Outline: 'outline',
  /** An arrow at the number of the first line of the block. */
  Indicator: 'indicator',
} as const;

export type DiffwiseActiveChangeStyle =
  (typeof DiffwiseActiveChangeStyle)[keyof typeof DiffwiseActiveChangeStyle];

/**
 * Options the user can change in the view settings of the toolbar, in the order they show there.
 * Each value is the name of its option, so `['layout', 'colorMode']` works without the constant.
 */
export const DiffwiseUserSetting = {
  /** Light, dark, or automatic. */
  ColorMode: 'colorMode',
  /**
   * The standard colors of changes, colorblind-friendly or high contrast ones, or the colors of
   * the app, when it gives them.
   */
  DiffPalette: 'diffPalette',
  /** The versions side by side, a single column, or automatic. */
  Layout: 'layout',
  /** How the single column shows a changed line; the user can change it in the single column. */
  InlineDiffStyle: 'inlineDiffStyle',
  /** Hides unchanged lines far from changes. */
  HideUnchangedLines: 'hideUnchangedLines',
} as const;

export type DiffwiseUserSetting = (typeof DiffwiseUserSetting)[keyof typeof DiffwiseUserSetting];

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
  /**
   * The language of the app (`LOCALE_ID`) when the interface has it, or else English. Every
   * Chinese locale gets Chinese in simplified characters, and only Portuguese without a region or
   * of Portugal gets Portuguese.
   */
  Auto: 'auto',
  /** English. */
  EN: 'en',
  /** Polish. */
  PL: 'pl',
  /** Chinese, in simplified characters. */
  ZH: 'zh',
  /** Spanish. */
  ES: 'es',
  /** Hindi. */
  HI: 'hi',
  /** French. */
  FR: 'fr',
  /** Russian. */
  RU: 'ru',
  /** Portuguese, in the words and spelling of Portugal. */
  PT: 'pt',
  /** Italian. */
  IT: 'it',
  /** Japanese. */
  JA: 'ja',
  /** German. */
  DE: 'de',
  /** Korean. */
  KO: 'ko',
} as const;

export type DiffwiseLanguage = (typeof DiffwiseLanguage)[keyof typeof DiffwiseLanguage];
