import type { DiffwiseCustomTexts } from '../i18n/texts';
import type { DiffwiseDiffColors } from './diff-colors';
import { normalizeConfig } from './normalize-config';
import {
  DiffwiseActiveChangeStyle,
  DiffwiseAlignment,
  DiffwiseChangeDetails,
  DiffwiseChangeDetailsIconStyle,
  DiffwiseColorMode,
  DiffwiseDividerStyle,
  DiffwiseFontFamily,
  DiffwiseGapStyle,
  DiffwiseHighlightStyle,
  DiffwiseInlineDiffStyle,
  DiffwiseLanguage,
  DiffwiseLayout,
  type DiffwiseLevel,
  DiffwiseLineNumberStyle,
  DiffwiseNoChangesView,
  DiffwiseTooltipColorMode,
  DiffwiseUserSetting,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
  DiffwiseVerticalAlignment,
} from './option-values';

/** Options of Diffwise. An option left out keeps its value from the level below, or its default. */
export interface DiffwiseConfigOptions {
  /** Light, dark, or automatic: as the system or the app. Default: `DiffwiseColorMode.Auto`. */
  readonly colorMode?: DiffwiseColorMode;
  /**
   * In automatic mode, the dark mode marker of the app, such as `.dark` on `<html>`; `null`
   * follows the system. Default: `null`.
   */
  readonly darkModeSelector?: string | null;
  /**
   * Style of changed words: all have the same background, and a style can add lines in the
   * accent color. Default: `DiffwiseHighlightStyle.Outline`.
   */
  readonly highlightStyle?: DiffwiseHighlightStyle;
  /**
   * Intensity of the change colors, from 1 to 5; the backgrounds of changed lines and words
   * change together. Default: `3`.
   */
  readonly diffIntensity?: DiffwiseLevel;
  /**
   * Contrast of everything besides the content, from 1 to 5: headers, line numbers and the
   * column between the versions. Default: `3`.
   */
  readonly uiContrast?: DiffwiseLevel;
  /**
   * Colors of changes for the light and the dark theme. Each level of the configuration changes
   * only the colors it sets, and `null` takes away the colors of the levels below. Default: none.
   */
  readonly diffColors?: DiffwiseDiffColors | null;
  /**
   * The two versions side by side, a single column, or automatic: a single column in a narrow
   * diff. Default: `DiffwiseLayout.Auto`.
   */
  readonly layout?: DiffwiseLayout;
  /**
   * Width of the diff in pixels under which the automatic layout shows a single column; a number
   * above zero. Default: `768`.
   */
  readonly layoutBreakpoint?: number;
  /**
   * How the single column shows a changed line: merged into one line, merged with removed text
   * struck through, or as the old line above the new one. Default:
   * `DiffwiseInlineDiffStyle.Merged`.
   */
  readonly inlineDiffStyle?: DiffwiseInlineDiffStyle;
  /** Shows the number of each line. Default: `true`. */
  readonly showLineNumbers?: boolean;
  /**
   * What the number of a changed line gets: a colored number with a bar, or a colored
   * background. Default: `DiffwiseLineNumberStyle.Bar`.
   */
  readonly lineNumberStyle?: DiffwiseLineNumberStyle;
  /** Place of the line numbers in their lines. Default: `DiffwiseVerticalAlignment.Top`. */
  readonly lineNumberAlignment?: DiffwiseVerticalAlignment;
  /** Gives changed lines a light background. Default: `true`. */
  readonly highlightChangedLines?: boolean;
  /**
   * Without backgrounds of changed lines, highlights an added or a removed line as a whole, like
   * changed words; otherwise its number shows the change. Default: `false`.
   */
  readonly highlightWholeLines?: boolean;
  /**
   * Hides unchanged lines far from changes behind a bar, which shows them on a click.
   * Default: `false`.
   */
  readonly hideUnchangedLines?: boolean;
  /**
   * Unchanged lines that stay shown above and below each change when unchanged lines are hidden; a
   * whole number from 1 to 100. Default: `3`.
   */
  readonly contextLines?: number;
  /**
   * Shows arrows to the previous and the next block of changes in the toolbar above the diff, with
   * the position of the block among all of them. Default: `true`.
   */
  readonly showNavigationToolbar?: boolean;
  /**
   * How the block of changes that the navigation has stepped to shows: a frame around it, or an
   * arrow at the number of its first line. Default: `DiffwiseActiveChangeStyle.Outline`.
   */
  readonly activeChangeStyle?: DiffwiseActiveChangeStyle;
  /**
   * Shows the numbers of added, removed and changed lines in the toolbar above the diff.
   * Default: `true`.
   */
  readonly showDiffStats?: boolean;
  /**
   * What shows under the text that the versions are the same: nothing, the document once, or both
   * versions as usual. Default: `DiffwiseNoChangesView.Message`.
   */
  readonly noChangesView?: DiffwiseNoChangesView;
  /**
   * Options the user can change in the view settings of the toolbar; an empty list hides the
   * button. The choices of the user win over every level of the configuration. Default: all of
   * `DiffwiseUserSetting`.
   */
  readonly allowedUserSettings?: readonly DiffwiseUserSetting[];
  /**
   * Keeps the choices of the user in localStorage of the browser, so they stay after a reload.
   * Only the choices go there, never the documents. Default: `false`.
   */
  readonly rememberUserSettings?: boolean;
  /**
   * Name under which diffs keep the choices of the user: diffs with the same name share them, and
   * in localStorage the name keeps apart the choices of apps on one domain. `null` takes the base
   * path of the app, such as `/` or `/admin/`. Default: `null`.
   */
  readonly userSettingsKey?: string | null;
  /** A gray column or a line between the versions. Default: `DiffwiseDividerStyle.Column`. */
  readonly dividerStyle?: DiffwiseDividerStyle;
  /** What fills the gap opposite an added or removed line. Default: `DiffwiseGapStyle.Stripes`. */
  readonly gapStyle?: DiffwiseGapStyle;
  /** Headers above the two versions, or texts of the app. Default: `DiffwiseVersionHeaders.Default`. */
  readonly versionHeaders?: DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts;
  /** Place of the header texts in their columns. Default: `DiffwiseAlignment.Center`. */
  readonly versionHeaderAlignment?: DiffwiseAlignment;
  /**
   * Font of the diff: the one of the app, a built-in one, or the name of a font the app loads,
   * such as `'Inter'`. Default: `DiffwiseFontFamily.Inherit`.
   */
  readonly fontFamily?: string;
  /** Font size of the headers in rem, from 0.5 to 10. Default: `0.75`. */
  readonly versionHeaderFontSize?: number;
  /** Font size of the line numbers in rem, from 0.5 to 10. Default: `0.75`. */
  readonly lineNumberFontSize?: number;
  /** Font size of the tooltips in rem, from 0.5 to 10. Default: `0.8`. */
  readonly tooltipFontSize?: number;
  /** Font size of the toolbar above the diff in rem, from 0.5 to 10. Default: `0.8`. */
  readonly toolbarFontSize?: number;
  /**
   * Where details of changes besides text show, such as link addresses: on hover of the change,
   * from an icon between the versions, or both. Default: `DiffwiseChangeDetails.Both`.
   */
  readonly changeDetails?: DiffwiseChangeDetails;
  /**
   * Look of the icons between the versions: a gray frame, a frame with a gradient, or a background
   * with the gradient. Default: `DiffwiseChangeDetailsIconStyle.Gradient`.
   */
  readonly changeDetailsIconStyle?: DiffwiseChangeDetailsIconStyle;
  /**
   * Colors of the tooltips: those of the opposite theme, or those of the diff.
   * Default: `DiffwiseTooltipColorMode.Component`.
   */
  readonly tooltipColorMode?: DiffwiseTooltipColorMode;
  /**
   * Highlights in a tooltip the part of a value that changed, such as a part of a link address or
   * of a file name. Default: `true`.
   */
  readonly highlightTooltipChanges?: boolean;
  /** Place of the titles in the tooltips. Default: `DiffwiseAlignment.Start`. */
  readonly tooltipTitleAlignment?: DiffwiseAlignment;
  /** Ignores differences in whitespace. Default: `false`. */
  readonly ignoreWhitespace?: boolean;
  /** Ignores differences in letter case. Default: `false`. */
  readonly ignoreCase?: boolean;
  /**
   * Ignores changes of formatting alone, such as italic → bold or another heading level.
   * Default: `false`.
   */
  readonly ignoreFormatting?: boolean;
  /** Ignores links added, removed or pointing elsewhere around the same text. Default: `false`. */
  readonly ignoreLinkChanges?: boolean;
  /** Language of the interface; `auto` takes the one of the app. Default: `DiffwiseLanguage.Auto`. */
  readonly language?: DiffwiseLanguage;
  /**
   * Texts shown instead of texts of the interface. Each level of the configuration changes only
   * the texts it sets, and `null` takes away the texts of the levels below. Default: none.
   */
  readonly customTexts?: DiffwiseCustomTexts | null;
}

/** Custom texts of a config that sets none. */
const NO_CUSTOM_TEXTS: DiffwiseCustomTexts = Object.freeze({});

/** Colors of changes of a config that sets none. */
const NO_DIFF_COLORS: DiffwiseDiffColors = Object.freeze({});

/** Every option the user can change, which the view settings show by default. */
const ALL_USER_SETTINGS: readonly DiffwiseUserSetting[] = Object.freeze(
  Object.values(DiffwiseUserSetting),
);

/**
 * Options of Diffwise with their defaults. A config changes only the options given to it,
 * so the config of one diff keeps the other options of the global configuration.
 */
export class DiffwiseConfig implements Required<DiffwiseConfigOptions> {
  /** Light, dark, or automatic: as the system or the app. */
  readonly colorMode: DiffwiseColorMode = DiffwiseColorMode.Auto;

  /** In automatic mode, the dark mode marker of the app, such as `.dark`; `null` follows the system. */
  readonly darkModeSelector: string | null = null;

  /** Style of changed words. */
  readonly highlightStyle: DiffwiseHighlightStyle = DiffwiseHighlightStyle.Outline;

  /** Intensity of the change colors, from 1 to 5. */
  readonly diffIntensity: DiffwiseLevel = 3;

  /** Contrast of everything besides the content, from 1 to 5. */
  readonly uiContrast: DiffwiseLevel = 3;

  /** Colors of changes for the light and the dark theme. */
  readonly diffColors: DiffwiseDiffColors = NO_DIFF_COLORS;

  /** The two versions side by side, a single column, or automatic by the width of the diff. */
  readonly layout: DiffwiseLayout = DiffwiseLayout.Auto;

  /** Width of the diff in pixels under which the automatic layout shows a single column. */
  readonly layoutBreakpoint: number = 768;

  /** How the single column shows a changed line: as one merged line, or as two lines. */
  readonly inlineDiffStyle: DiffwiseInlineDiffStyle = DiffwiseInlineDiffStyle.Merged;

  /** Shows the number of each line. */
  readonly showLineNumbers: boolean = true;

  /** What the number of a changed line gets. */
  readonly lineNumberStyle: DiffwiseLineNumberStyle = DiffwiseLineNumberStyle.Bar;

  /** Place of the line numbers in the height of their lines. */
  readonly lineNumberAlignment: DiffwiseVerticalAlignment = DiffwiseVerticalAlignment.Top;

  /** Gives changed lines a light background. */
  readonly highlightChangedLines: boolean = true;

  /** Without backgrounds of changed lines, highlights an added or a removed line as a whole. */
  readonly highlightWholeLines: boolean = false;

  /** Hides unchanged lines far from changes behind a bar. */
  readonly hideUnchangedLines: boolean = false;

  /** Unchanged lines that stay shown above and below each change when unchanged lines are hidden. */
  readonly contextLines: number = 3;

  /** Shows arrows between the blocks of changes in the toolbar above the diff. */
  readonly showNavigationToolbar: boolean = true;

  /** How the block of changes that the navigation has stepped to shows. */
  readonly activeChangeStyle: DiffwiseActiveChangeStyle = DiffwiseActiveChangeStyle.Outline;

  /** Shows the numbers of changed lines in the toolbar above the diff. */
  readonly showDiffStats: boolean = true;

  /** What shows under the text that the versions are the same. */
  readonly noChangesView: DiffwiseNoChangesView = DiffwiseNoChangesView.Message;

  /** Options the user can change in the view settings of the toolbar. */
  readonly allowedUserSettings: readonly DiffwiseUserSetting[] = ALL_USER_SETTINGS;

  /** Keeps the choices of the user in localStorage of the browser. */
  readonly rememberUserSettings: boolean = false;

  /** Name under which diffs keep the choices of the user; `null` takes the base path of the app. */
  readonly userSettingsKey: string | null = null;

  /** What stands between the two versions. */
  readonly dividerStyle: DiffwiseDividerStyle = DiffwiseDividerStyle.Column;

  /** What fills the place opposite an added or a removed line. */
  readonly gapStyle: DiffwiseGapStyle = DiffwiseGapStyle.Stripes;

  /** Headers above the two versions, or texts of the app. */
  readonly versionHeaders: DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts =
    DiffwiseVersionHeaders.Default;

  /** Place of the header texts in their columns. */
  readonly versionHeaderAlignment: DiffwiseAlignment = DiffwiseAlignment.Center;

  /** Font of the diff: the one of the app, a built-in one, or the name of a font the app loads. */
  readonly fontFamily: string = DiffwiseFontFamily.Inherit;

  /** Font size of the headers in rem. */
  readonly versionHeaderFontSize: number = 0.75;

  /** Font size of the line numbers in rem. */
  readonly lineNumberFontSize: number = 0.75;

  /** Font size of the tooltips in rem. */
  readonly tooltipFontSize: number = 0.8;

  /** Font size of the toolbar above the diff in rem. */
  readonly toolbarFontSize: number = 0.8;

  /** Where the details of a change besides its text show. */
  readonly changeDetails: DiffwiseChangeDetails = DiffwiseChangeDetails.Both;

  /** Look of the icons between the versions. */
  readonly changeDetailsIconStyle: DiffwiseChangeDetailsIconStyle =
    DiffwiseChangeDetailsIconStyle.Gradient;

  /** Colors of the tooltips: those of the opposite theme, or those of the diff. */
  readonly tooltipColorMode: DiffwiseTooltipColorMode = DiffwiseTooltipColorMode.Component;

  /** Highlights in a tooltip the part of a value that changed. */
  readonly highlightTooltipChanges: boolean = true;

  /** Place of the titles in the tooltips. */
  readonly tooltipTitleAlignment: DiffwiseAlignment = DiffwiseAlignment.Start;

  /** Ignores differences in whitespace. */
  readonly ignoreWhitespace: boolean = false;

  /** Ignores differences in letter case. */
  readonly ignoreCase: boolean = false;

  /** Ignores changes of formatting alone. */
  readonly ignoreFormatting: boolean = false;

  /** Ignores links added, removed or pointing elsewhere around the same text. */
  readonly ignoreLinkChanges: boolean = false;

  /** Language of the interface; `auto` takes the one of the app. */
  readonly language: DiffwiseLanguage = DiffwiseLanguage.Auto;

  /** Texts shown instead of texts of the interface. */
  readonly customTexts: DiffwiseCustomTexts = NO_CUSTOM_TEXTS;

  /** Valid options given to the constructor, without the defaults. */
  readonly #givenOptions: DiffwiseConfigOptions;

  /**
   * Takes only the options to change; an invalid value keeps the default. Custom texts or colors
   * given as `null` are none, also in a config changed by this one through `with()`.
   */
  constructor(options: DiffwiseConfig | DiffwiseConfigOptions = {}) {
    this.#givenOptions = DiffwiseConfig.#validOptionsOf(options);
    Object.assign(this, fieldValuesOf(this.#givenOptions));
    Object.freeze(this);
  }

  /** A copy with the given options changed; an invalid value keeps the current one. */
  with(changes: DiffwiseConfig | DiffwiseConfigOptions): DiffwiseConfig {
    const validChanges = DiffwiseConfig.#validOptionsOf(changes);
    return new DiffwiseConfig(withChanges(this.#givenOptions, validChanges));
  }

  /** Valid options of a plain object, or only the options given to a config. */
  static #validOptionsOf(options: DiffwiseConfig | DiffwiseConfigOptions): DiffwiseConfigOptions {
    return options instanceof DiffwiseConfig ? options.#givenOptions : normalizeConfig(options);
  }
}

/**
 * The options with the changes. Custom texts and colors change one by one, so the texts and
 * colors left out stay; `null` takes them all away.
 */
function withChanges(
  options: DiffwiseConfigOptions,
  changes: DiffwiseConfigOptions,
): DiffwiseConfigOptions {
  const customTexts = withTextChanges(options.customTexts, changes.customTexts);
  const diffColors = withColorChanges(options.diffColors, changes.diffColors);

  return { ...options, ...changes, customTexts, diffColors };
}

/** Custom texts with the changes, text by text; `null` takes away all texts. */
function withTextChanges(
  texts: DiffwiseCustomTexts | null = NO_CUSTOM_TEXTS,
  changes: DiffwiseCustomTexts | null = NO_CUSTOM_TEXTS,
): DiffwiseCustomTexts {
  if (changes === null) {
    return NO_CUSTOM_TEXTS;
  }

  return { ...texts, ...changes };
}

/** Colors of both themes with the changes, color by color; `null` takes away all colors. */
function withColorChanges(
  colors: DiffwiseDiffColors | null = NO_DIFF_COLORS,
  changes: DiffwiseDiffColors | null = NO_DIFF_COLORS,
): DiffwiseDiffColors {
  if (changes === null) {
    return NO_DIFF_COLORS;
  }

  const light = { ...colors?.light, ...changes.light };
  const dark = { ...colors?.dark, ...changes.dark };

  return { light, dark };
}

/** The options as values of the fields of a config: texts or colors given as `null` are none. */
function fieldValuesOf(options: DiffwiseConfigOptions): DiffwiseConfigOptions {
  const customTexts = options.customTexts ?? NO_CUSTOM_TEXTS;
  const diffColors = options.diffColors ?? NO_DIFF_COLORS;

  return { ...options, customTexts, diffColors };
}
