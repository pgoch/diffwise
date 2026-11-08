import { isDevMode } from '@angular/core';

import { ENGLISH_TEXTS } from '../i18n/en';
import type { DiffwiseCustomTexts } from '../i18n/texts';
import type { DiffwiseConfigOptions } from './diffwise-config';
import {
  DiffwiseColorMode,
  DiffwiseLanguage,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
} from './option-values';

const TEXT_TYPE = 'string';
const OBJECT_TYPE = 'object';

/** Warnings in development mode; the console puts a name at `%s` and a value at `%o`. */
const Warning = {
  NotAnObject: 'Diffwise ignores the configuration %o: it is not an object.',
  UnknownOption: 'Diffwise ignores the option "%s": no option has this name.',
  InvalidValue: 'Diffwise ignores the option "%s": it does not take the value %o.',
  UnknownText: 'Diffwise ignores the custom text "%s": no text has this name.',
  InvalidText: 'Diffwise ignores the custom text "%s": the value %o is not a text.',
} as const;

/** Checks of the values each option takes. */
const OPTION_CHECKS: Readonly<Record<keyof DiffwiseConfigOptions, (value: unknown) => boolean>> = {
  colorMode: isColorMode,
  darkModeSelector: isDarkModeSelector,
  showLineNumbers: isBoolean,
  versionHeaders: isVersionHeaders,
  ignoreWhitespace: isBoolean,
  ignoreCase: isBoolean,
  language: isLanguage,
  customTexts: isObject,
};

/** Keeps only the valid items of an object, such as the texts of custom texts. */
type ItemCheck = (value: object) => object;

/** Options checked item by item: an invalid item is left out, and the other items stay. */
const ITEM_CHECKS: Readonly<Partial<Record<keyof DiffwiseConfigOptions, ItemCheck>>> = {
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

function isObject(value: unknown): value is object {
  return typeof value === OBJECT_TYPE && value !== null;
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
  if (text.trim().length === 0) {
    return false;
  }

  try {
    globalThis.document?.createDocumentFragment().querySelector(text);
    return true;
  } catch {
    return false;
  }
}

function isVersionHeaders(value: unknown): boolean {
  return isValueOf(DiffwiseVersionHeaders, value) || isVersionHeaderTexts(value);
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
