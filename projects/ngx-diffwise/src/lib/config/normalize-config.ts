import { isDevMode } from '@angular/core';

import { ENGLISH_TEXTS } from '../i18n/en';
import type { DiffwiseCustomTexts } from '../i18n/texts';
import { DIFF_COLOR_VARIABLES, type DiffwiseDiffColors, type ThemeDiffColors } from './diff-colors';
import type { DiffwiseConfigOptions } from './diffwise-config';
import {
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
  DiffwiseLineNumberStyle,
  DiffwiseTooltipColorMode,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
  DiffwiseVerticalAlignment,
} from './option-values';

const TEXT_TYPE = 'string';
const NUMBER_TYPE = 'number';
const OBJECT_TYPE = 'object';
const COLOR_PROPERTY = 'color';

/** Joins a theme and a color name in warnings, such as `dark.addedLine`. */
const COLOR_PATH_SEPARATOR = '.';

/** Characters a font name cannot have, since the diff puts the name in quotes in CSS. */
const NOT_IN_FONT_NAME = /["\\;{}]/;

/** Lowest and highest number an option takes, both included. */
interface NumberRange {
  readonly min: number;
  readonly max: number;
}

/** Levels of the scales `diffIntensity` and `uiContrast`. */
const LEVEL_RANGE: NumberRange = { min: 1, max: 5 };

/** Unchanged lines shown around a change. */
const CONTEXT_LINES_RANGE: NumberRange = { min: 1, max: 100 };

/** Font sizes in rem. */
const FONT_SIZE_RANGE: NumberRange = { min: 0.5, max: 10 };

/** Themes an app can give colors of changes for. */
const COLOR_THEMES: readonly string[] = [DiffwiseColorMode.Light, DiffwiseColorMode.Dark];

/** Warnings in development mode; the console puts a name at `%s` and a value at `%o`. */
const Warning = {
  NotAnObject: 'Diffwise ignores the configuration %o: it is not an object.',
  UnknownOption: 'Diffwise ignores the option "%s": no option has this name.',
  InvalidValue: 'Diffwise ignores the option "%s": it does not take the value %o.',
  UnknownText: 'Diffwise ignores the custom text "%s": no text has this name.',
  InvalidText: 'Diffwise ignores the custom text "%s": the value %o is not a text.',
  UnknownTheme: 'Diffwise ignores the colors of "%s": no theme has this name.',
  InvalidThemeColors: 'Diffwise ignores the colors of "%s": the value %o is not an object.',
  UnknownColor: 'Diffwise ignores the color "%s": no color has this name.',
  InvalidColor: 'Diffwise ignores the color "%s": the value %o is not a CSS color.',
} as const;

/** Checks of the values each option takes. */
const OPTION_CHECKS: Readonly<Record<keyof DiffwiseConfigOptions, (value: unknown) => boolean>> = {
  colorMode: isColorMode,
  darkModeSelector: isDarkModeSelector,
  highlightStyle: isHighlightStyle,
  diffIntensity: isLevel,
  uiContrast: isLevel,
  diffColors: isObjectOrNull,
  layout: isLayout,
  layoutBreakpoint: isLayoutBreakpoint,
  inlineDiffStyle: isInlineDiffStyle,
  showLineNumbers: isBoolean,
  lineNumberStyle: isLineNumberStyle,
  lineNumberAlignment: isVerticalAlignment,
  highlightChangedLines: isBoolean,
  highlightWholeLines: isBoolean,
  hideUnchangedLines: isBoolean,
  contextLines: isContextLines,
  showDiffStats: isBoolean,
  dividerStyle: isDividerStyle,
  gapStyle: isGapStyle,
  versionHeaders: isVersionHeaders,
  versionHeaderAlignment: isAlignment,
  fontFamily: isFontFamily,
  versionHeaderFontSize: isFontSize,
  lineNumberFontSize: isFontSize,
  tooltipFontSize: isFontSize,
  toolbarFontSize: isFontSize,
  changeDetails: isChangeDetails,
  changeDetailsIconStyle: isChangeDetailsIconStyle,
  tooltipColorMode: isTooltipColorMode,
  highlightTooltipChanges: isBoolean,
  tooltipTitleAlignment: isAlignment,
  ignoreWhitespace: isBoolean,
  ignoreCase: isBoolean,
  ignoreFormatting: isBoolean,
  ignoreLinkChanges: isBoolean,
  language: isLanguage,
  customTexts: isObjectOrNull,
};

/** Keeps only the valid items of an object, such as the texts of custom texts. */
type ItemCheck = (value: object) => object;

/** Options checked item by item: an invalid item is left out, and the other items stay. */
const ITEM_CHECKS: Readonly<Partial<Record<keyof DiffwiseConfigOptions, ItemCheck>>> = {
  diffColors: validDiffColors,
  customTexts: validCustomTexts,
};

/**
 * Keeps only the options with valid values, so an invalid value acts as if it was not given.
 * In development mode, warns about unknown options and invalid values.
 */
export function normalizeConfig(options: unknown): DiffwiseConfigOptions {
  if (!isObject(options)) {
    warn(Warning.NotAnObject, options);
    return {};
  }

  const validOptions: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(options)) {
    if (value === undefined) {
      continue;
    }

    if (!isOptionName(name)) {
      warn(Warning.UnknownOption, name);
    } else if (!OPTION_CHECKS[name](value)) {
      warn(Warning.InvalidValue, name, value);
    } else {
      validOptions[name] = validCopy(name, value);
    }
  }

  return validOptions;
}

function isOptionName(name: string): name is keyof DiffwiseConfigOptions {
  return Object.hasOwn(OPTION_CHECKS, name);
}

/** A frozen copy of a valid value; an option checked item by item keeps only its valid items. */
function validCopy(name: keyof DiffwiseConfigOptions, value: unknown): unknown {
  const keepValidItems = ITEM_CHECKS[name];

  if (keepValidItems === undefined || !isObject(value)) {
    return frozenCopy(value);
  }

  return Object.freeze(keepValidItems(value));
}

function isBoolean(value: unknown): value is boolean {
  return value === true || value === false;
}

function isText(value: unknown): value is string {
  return typeof value === TEXT_TYPE;
}

function isNumber(value: unknown): value is number {
  return typeof value === NUMBER_TYPE;
}

function isObject(value: unknown): value is object {
  return typeof value === OBJECT_TYPE && value !== null;
}

/** True for an object, or for `null`, which takes away the items of the levels below. */
function isObjectOrNull(value: unknown): boolean {
  return value === null || isObject(value);
}

function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

function isInRange(value: number, range: NumberRange): boolean {
  return value >= range.min && value <= range.max;
}

function isColorMode(value: unknown): boolean {
  return isValueOf(DiffwiseColorMode, value);
}

/** True for `null`, which follows the system, or for a CSS selector, such as `.dark`. */
function isDarkModeSelector(value: unknown): boolean {
  return value === null || (isText(value) && isSelector(value));
}

/** True for a selector the browser can read; without a browser, for any text that is not blank. */
function isSelector(text: string): boolean {
  if (isBlank(text)) {
    return false;
  }

  try {
    globalThis.document?.createDocumentFragment().querySelector(text);
    return true;
  } catch {
    return false;
  }
}

function isHighlightStyle(value: unknown): boolean {
  return isValueOf(DiffwiseHighlightStyle, value);
}

/** True for a level of a scale: a whole number from 1 to 5. */
function isLevel(value: unknown): boolean {
  return isNumber(value) && Number.isInteger(value) && isInRange(value, LEVEL_RANGE);
}

function isLayout(value: unknown): boolean {
  return isValueOf(DiffwiseLayout, value);
}

/** True for a width in pixels: a number above zero. */
function isLayoutBreakpoint(value: unknown): boolean {
  return isNumber(value) && Number.isFinite(value) && value > 0;
}

/** True for a number of lines around a change: a whole number from 1 to 100. */
function isContextLines(value: unknown): boolean {
  return isNumber(value) && Number.isInteger(value) && isInRange(value, CONTEXT_LINES_RANGE);
}

function isInlineDiffStyle(value: unknown): boolean {
  return isValueOf(DiffwiseInlineDiffStyle, value);
}

function isLineNumberStyle(value: unknown): boolean {
  return isValueOf(DiffwiseLineNumberStyle, value);
}

function isVerticalAlignment(value: unknown): boolean {
  return isValueOf(DiffwiseVerticalAlignment, value);
}

function isDividerStyle(value: unknown): boolean {
  return isValueOf(DiffwiseDividerStyle, value);
}

function isGapStyle(value: unknown): boolean {
  return isValueOf(DiffwiseGapStyle, value);
}

function isVersionHeaders(value: unknown): boolean {
  return isValueOf(DiffwiseVersionHeaders, value) || isVersionHeaderTexts(value);
}

function isAlignment(value: unknown): boolean {
  return isValueOf(DiffwiseAlignment, value);
}

/** True for a font of the diff, or for the name of a font of the app, such as `Inter`. */
function isFontFamily(value: unknown): boolean {
  return isValueOf(DiffwiseFontFamily, value) || (isText(value) && isFontName(value));
}

/** True for a font name the diff can put in quotes: not blank, without quotes or braces. */
function isFontName(text: string): boolean {
  return !isBlank(text) && !NOT_IN_FONT_NAME.test(text);
}

/** True for a font size in rem, from 0.5 to 10. */
function isFontSize(value: unknown): boolean {
  return isNumber(value) && isInRange(value, FONT_SIZE_RANGE);
}

function isChangeDetails(value: unknown): boolean {
  return isValueOf(DiffwiseChangeDetails, value);
}

function isChangeDetailsIconStyle(value: unknown): boolean {
  return isValueOf(DiffwiseChangeDetailsIconStyle, value);
}

function isTooltipColorMode(value: unknown): boolean {
  return isValueOf(DiffwiseTooltipColorMode, value);
}

function isLanguage(value: unknown): boolean {
  return isValueOf(DiffwiseLanguage, value);
}

/** True for one of the values of an option constant, such as `'icons'`. */
function isValueOf(constant: Readonly<Record<string, string>>, value: unknown): boolean {
  return Object.values(constant).some((allowed) => allowed === value);
}

/** True for texts of an app: an object with the texts `old` and `new`. */
function isVersionHeaderTexts(value: unknown): value is DiffwiseVersionHeaderTexts {
  if (!isObject(value)) {
    return false;
  }

  const texts = value as Partial<Record<keyof DiffwiseVersionHeaderTexts, unknown>>;
  return isText(texts.old) && isText(texts.new);
}

/** Only the valid colors of each theme; in development mode, warns about the others. */
function validDiffColors(diffColors: object): DiffwiseDiffColors {
  const validColors: Record<string, ThemeDiffColors> = {};

  for (const [theme, colors] of Object.entries(diffColors)) {
    if (colors === undefined) {
      continue;
    }

    if (!COLOR_THEMES.includes(theme)) {
      warn(Warning.UnknownTheme, theme);
    } else if (!isObject(colors)) {
      warn(Warning.InvalidThemeColors, theme, colors);
    } else {
      validColors[theme] = Object.freeze(validThemeColors(theme, colors));
    }
  }

  return validColors;
}

/** Only the valid colors of one theme; in development mode, warns about the others. */
function validThemeColors(theme: string, colors: object): ThemeDiffColors {
  const validColors: Record<string, string> = {};

  for (const [name, color] of Object.entries(colors)) {
    if (color === undefined) {
      continue;
    }

    const path = theme + COLOR_PATH_SEPARATOR + name;

    if (!isColorName(name)) {
      warn(Warning.UnknownColor, path);
    } else if (!isColor(color)) {
      warn(Warning.InvalidColor, path, color);
    } else {
      validColors[name] = color;
    }
  }

  return validColors;
}

function isColorName(name: string): name is keyof ThemeDiffColors {
  return Object.hasOwn(DIFF_COLOR_VARIABLES, name);
}

/** True for a CSS color, such as `#2563eb`; without a browser, for any text that is not blank. */
function isColor(value: unknown): value is string {
  if (!isText(value) || isBlank(value)) {
    return false;
  }

  return globalThis.CSS?.supports(COLOR_PROPERTY, value) ?? true;
}

/** Only the valid texts of custom texts; in development mode, warns about the others. */
function validCustomTexts(customTexts: object): DiffwiseCustomTexts {
  const validTexts: Record<string, string> = {};

  for (const [name, text] of Object.entries(customTexts)) {
    if (text === undefined) {
      continue;
    }

    if (!isTextName(name)) {
      warn(Warning.UnknownText, name);
    } else if (!isText(text)) {
      warn(Warning.InvalidText, name, text);
    } else {
      validTexts[name] = text;
    }
  }

  return validTexts;
}

/** True for the name of a text of the interface; English has every text. */
function isTextName(name: string): name is keyof DiffwiseCustomTexts {
  return Object.hasOwn(ENGLISH_TEXTS, name);
}

/** A frozen copy of an object value, so later changes in the app do not reach the config. */
function frozenCopy(value: unknown): unknown {
  return isObject(value) ? Object.freeze({ ...value }) : value;
}

function warn(message: string, ...values: unknown[]): void {
  if (isDevMode()) {
    console.warn(message, ...values);
  }
}
