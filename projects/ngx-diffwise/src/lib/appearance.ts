import { DIFF_COLOR_VARIABLES, type ThemeDiffColors } from './config/diff-colors';
import { DiffwiseConfig } from './config/diffwise-config';
import { DiffwiseFontFamily, DiffwiseLayout } from './config/option-values';

/** The defaults: an option at its default needs no style, and most need no class. */
const DEFAULT_CONFIG = new DiffwiseConfig();

/**
 * Options shown by a modifier class of the component when they differ from their defaults. The
 * class ends with the value, such as `gray`.
 */
const VALUE_MODIFIERS = {
  highlightStyle: 'diffwise-html-diff--highlight-style-',
  inlineDiffStyle: 'diffwise-html-diff--inline-diff-style-',
  lineNumberStyle: 'diffwise-html-diff--line-number-style-',
  lineNumberAlignment: 'diffwise-html-diff--line-number-alignment-',
  dividerStyle: 'diffwise-html-diff--divider-style-',
  gapStyle: 'diffwise-html-diff--gap-style-',
  versionHeaderAlignment: 'diffwise-html-diff--version-header-alignment-',
  changeDetails: 'diffwise-html-diff--change-details-',
  changeDetailsIconStyle: 'diffwise-html-diff--change-details-icon-style-',
  tooltipColorMode: 'diffwise-html-diff--tooltip-color-mode-',
  tooltipTitleAlignment: 'diffwise-html-diff--tooltip-title-alignment-',
} as const;

type ValueOption = keyof typeof VALUE_MODIFIERS;

/** A layout the diff can show; the automatic layout shows one of them. */
export type ShownLayout = typeof DiffwiseLayout.SideBySide | typeof DiffwiseLayout.Inline;

const VALUE_OPTIONS = Object.keys(VALUE_MODIFIERS) as ValueOption[];

/** Starts of the classes of the levels, which every level has, the default one too. */
const DIFF_INTENSITY_MODIFIER = 'diffwise-html-diff--diff-intensity-';
const UI_CONTRAST_MODIFIER = 'diffwise-html-diff--ui-contrast-';

/** The class of a diff that shows a single column, also when the automatic layout chose it. */
const INLINE_LAYOUT_CLASS = 'diffwise-html-diff--layout-inline';
const NO_LINE_NUMBERS_CLASS = 'diffwise-html-diff--no-line-numbers';
const NO_CHANGED_LINE_HIGHLIGHT_CLASS = 'diffwise-html-diff--no-changed-line-highlight';
const HIGHLIGHT_WHOLE_LINES_CLASS = 'diffwise-html-diff--highlight-whole-lines';
const NO_TOOLTIP_CHANGE_HIGHLIGHT_CLASS = 'diffwise-html-diff--no-tooltip-change-highlight';

const LINE_NUMBER_DIGITS_VARIABLE = '--diffwise-line-number-digits';
const LINE_NUMBER_FONT_SIZE_VARIABLE = '--diffwise-line-number-font-size';
const VERSION_HEADER_FONT_SIZE_VARIABLE = '--diffwise-version-header-font-size';
const TOOLTIP_FONT_SIZE_VARIABLE = '--diffwise-tooltip-font-size';
const TOOLBAR_FONT_SIZE_VARIABLE = '--diffwise-toolbar-font-size';
const FONT_FAMILY_PROPERTY = 'font-family';
const REM_UNIT = 'rem';

/** The built-in font: the font of the system. */
const BUILTIN_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

const FONT_NAME_QUOTE = '"';
const FONT_LIST_SEPARATOR = ', ';
const COLOR_NAMES = Object.keys(DIFF_COLOR_VARIABLES) as (keyof ThemeDiffColors)[];

/**
 * Modifier classes of the component: for the layout it shows, for the levels, and for the other
 * options that differ from their defaults.
 */
export function appearanceClasses(
  config: DiffwiseConfig,
  customColors: ThemeDiffColors,
  shownLayout: ShownLayout,
): string[] {
  const changedOptions = VALUE_OPTIONS.filter(
    (option) => config[option] !== DEFAULT_CONFIG[option],
  );
  const valueClasses = changedOptions.map((option) => VALUE_MODIFIERS[option] + config[option]);

  return [
    ...layoutClasses(shownLayout),
    ...valueClasses,
    ...levelClasses(config, customColors),
    ...toggleClasses(config),
  ];
}

/**
 * Styles of the component element: the width of the line numbers, and the sizes, the font and
 * the colors of the app that differ from the defaults.
 */
export function appearanceStyles(
  config: DiffwiseConfig,
  customColors: ThemeDiffColors,
  lineNumberDigits: number,
): Record<string, string> {
  const styles: Record<string, string> = {
    [LINE_NUMBER_DIGITS_VARIABLE]: String(lineNumberDigits),
  };

  if (config.lineNumberFontSize !== DEFAULT_CONFIG.lineNumberFontSize) {
    styles[LINE_NUMBER_FONT_SIZE_VARIABLE] = config.lineNumberFontSize + REM_UNIT;
  }

  if (config.versionHeaderFontSize !== DEFAULT_CONFIG.versionHeaderFontSize) {
    styles[VERSION_HEADER_FONT_SIZE_VARIABLE] = config.versionHeaderFontSize + REM_UNIT;
  }

  if (config.tooltipFontSize !== DEFAULT_CONFIG.tooltipFontSize) {
    styles[TOOLTIP_FONT_SIZE_VARIABLE] = config.tooltipFontSize + REM_UNIT;
  }

  if (config.toolbarFontSize !== DEFAULT_CONFIG.toolbarFontSize) {
    styles[TOOLBAR_FONT_SIZE_VARIABLE] = config.toolbarFontSize + REM_UNIT;
  }

  if (config.fontFamily !== DiffwiseFontFamily.Inherit) {
    styles[FONT_FAMILY_PROPERTY] = cssFontFamily(config.fontFamily);
  }

  for (const name of COLOR_NAMES) {
    const color = customColors[name];

    if (color !== undefined) {
      styles[DIFF_COLOR_VARIABLES[name]] = color;
    }
  }

  return styles;
}

/** The class of the single column; the two versions side by side need none. */
function layoutClasses(shownLayout: ShownLayout): string[] {
  return shownLayout === DiffwiseLayout.Inline ? [INLINE_LAYOUT_CLASS] : [];
}

function hasColors(colors: ThemeDiffColors): boolean {
  return Object.keys(colors).length > 0;
}

/**
 * Classes of the intensity and the contrast, also at the default level 3. Colors of the app
 * replace the intensity, so with them it has no class.
 */
function levelClasses(config: DiffwiseConfig, customColors: ThemeDiffColors): string[] {
  const contrastClass = UI_CONTRAST_MODIFIER + config.uiContrast;

  if (hasColors(customColors)) {
    return [contrastClass];
  }

  return [DIFF_INTENSITY_MODIFIER + config.diffIntensity, contrastClass];
}

/** Modifier classes of the options that turn parts of the diff on or off. */
function toggleClasses(config: DiffwiseConfig): string[] {
  const { showLineNumbers, highlightChangedLines, highlightWholeLines, highlightTooltipChanges } =
    config;
  const classes: string[] = [];

  if (!showLineNumbers) {
    classes.push(NO_LINE_NUMBERS_CLASS);
  }

  if (!highlightChangedLines) {
    classes.push(NO_CHANGED_LINE_HIGHLIGHT_CLASS);
  }

  if (!highlightChangedLines && highlightWholeLines) {
    classes.push(HIGHLIGHT_WHOLE_LINES_CLASS);
  }

  if (!highlightTooltipChanges) {
    classes.push(NO_TOOLTIP_CHANGE_HIGHLIGHT_CLASS);
  }

  return classes;
}

/** The CSS font: the built-in one, or a font of the app with the built-in one as a fallback. */
function cssFontFamily(fontFamily: string): string {
  if (fontFamily === DiffwiseFontFamily.Builtin) {
    return BUILTIN_FONT_FAMILY;
  }

  const quotedName = FONT_NAME_QUOTE + fontFamily.trim() + FONT_NAME_QUOTE;
  return [quotedName, BUILTIN_FONT_FAMILY].join(FONT_LIST_SEPARATOR);
}
