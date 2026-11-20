import {
  DiffwiseActiveChangeStyle,
  DiffwiseAlignment,
  DiffwiseChangeDetails,
  DiffwiseChangeDetailsIconStyle,
  DiffwiseColorMode,
  type DiffwiseConfigOptions,
  DiffwiseDividerStyle,
  DiffwiseFontFamily,
  DiffwiseGapStyle,
  DiffwiseHighlightStyle,
  DiffwiseInlineDiffStyle,
  DiffwiseLanguage,
  DiffwiseLayout,
  DiffwiseLineNumberStyle,
  DiffwiseNoChangesView,
  DiffwisePalette,
  DiffwiseTextFont,
  DiffwiseTooltipColorMode,
  DiffwiseUserSetting,
  DiffwiseVersionHeaders,
  DiffwiseVerticalAlignment,
} from 'ngx-diffwise';

import type { OptionName } from './steps';

/** The forms of the configuration: a plain object, or a `DiffwiseConfig` with the constants. */
export const ConfigForm = {
  PlainObject: 'plainObject',
  DiffwiseConfig: 'diffwiseConfig',
} as const;

export type ConfigForm = (typeof ConfigForm)[keyof typeof ConfigForm];

/** A constant of the library, such as `DiffwiseColorMode`: its name and its values. */
interface LibraryConstant {
  readonly name: string;
  readonly values: Readonly<Record<string, unknown>>;
}

/** A piece of code as it stands, such as `DiffwiseColorMode.Dark`, not a text in quotes. */
interface Code {
  readonly code: string;
}

/** The longest line the code has, as Prettier writes an Angular app by default. */
const LINE_WIDTH = 100;

/** One step of indentation. */
const INDENT = '  ';

const QUOTE = "'";
const ESCAPED_QUOTE = "\\'";
const DOUBLE_QUOTE = '"';
const ESCAPED_DOUBLE_QUOTE = '\\"';
const OBJECT_TYPE = 'object';
const STRING_TYPE = 'string';

const CONFIG_CLASS = 'DiffwiseConfig';
const PROVIDE_FUNCTION = 'provideDiffwise';
const LANGUAGES_FUNCTION = 'provideDiffwiseLanguages';
const LIBRARY = 'ngx-diffwise';

const ANGULAR_IMPORT = "import { ApplicationConfig } from '@angular/core';";
const CONFIG_START = 'export const appConfig: ApplicationConfig = {';
const PROVIDERS_START = INDENT + 'providers: [';
const PROVIDERS_END = INDENT + '],';
const CALL_START = '(';
const CALL_CLOSE = ')';
const ITEM_END = ',';
const CALL_END = CALL_CLOSE + ITEM_END;
const EMPTY_OBJECT = '{}';
const NEW_CONFIG = `new ${CONFIG_CLASS}`;
const IMPORT_START = 'import {';
const IMPORT_END = `} from '${LIBRARY}';`;
const CODE_KEY = 'code';
const KEY_END = ': ';
const LIST_BRACKETS = ['[', ']'] as const;
const OBJECT_BRACES = ['{', '}'] as const;
const CONFIG_END = '};';

/** The constant of each option whose values are those of a constant of the library. */
const CONSTANTS: Partial<Record<OptionName, LibraryConstant>> = {
  colorMode: { name: 'DiffwiseColorMode', values: DiffwiseColorMode },
  diffPalette: { name: 'DiffwisePalette', values: DiffwisePalette },
  highlightStyle: { name: 'DiffwiseHighlightStyle', values: DiffwiseHighlightStyle },
  layout: { name: 'DiffwiseLayout', values: DiffwiseLayout },
  inlineDiffStyle: { name: 'DiffwiseInlineDiffStyle', values: DiffwiseInlineDiffStyle },
  lineNumberStyle: { name: 'DiffwiseLineNumberStyle', values: DiffwiseLineNumberStyle },
  lineNumberAlignment: { name: 'DiffwiseVerticalAlignment', values: DiffwiseVerticalAlignment },
  activeChangeStyle: { name: 'DiffwiseActiveChangeStyle', values: DiffwiseActiveChangeStyle },
  noChangesView: { name: 'DiffwiseNoChangesView', values: DiffwiseNoChangesView },
  allowedUserSettings: { name: 'DiffwiseUserSetting', values: DiffwiseUserSetting },
  dividerStyle: { name: 'DiffwiseDividerStyle', values: DiffwiseDividerStyle },
  gapStyle: { name: 'DiffwiseGapStyle', values: DiffwiseGapStyle },
  versionHeaders: { name: 'DiffwiseVersionHeaders', values: DiffwiseVersionHeaders },
  versionHeaderAlignment: { name: 'DiffwiseAlignment', values: DiffwiseAlignment },
  fontFamily: { name: 'DiffwiseFontFamily', values: DiffwiseFontFamily },
  textFont: { name: 'DiffwiseTextFont', values: DiffwiseTextFont },
  changeDetails: { name: 'DiffwiseChangeDetails', values: DiffwiseChangeDetails },
  changeDetailsIconStyle: {
    name: 'DiffwiseChangeDetailsIconStyle',
    values: DiffwiseChangeDetailsIconStyle,
  },
  tooltipColorMode: { name: 'DiffwiseTooltipColorMode', values: DiffwiseTooltipColorMode },
  tooltipTitleAlignment: { name: 'DiffwiseAlignment', values: DiffwiseAlignment },
  language: { name: 'DiffwiseLanguage', values: DiffwiseLanguage },
};

/** The constant of each language besides English, which an app gives to `provideDiffwiseLanguages`. */
const LANGUAGE_CONSTANTS: Partial<Record<DiffwiseLanguage, string>> = {
  [DiffwiseLanguage.PL]: 'diffwisePolish',
  [DiffwiseLanguage.ZH]: 'diffwiseChinese',
  [DiffwiseLanguage.ES]: 'diffwiseSpanish',
  [DiffwiseLanguage.HI]: 'diffwiseHindi',
  [DiffwiseLanguage.FR]: 'diffwiseFrench',
  [DiffwiseLanguage.RU]: 'diffwiseRussian',
  [DiffwiseLanguage.PT]: 'diffwisePortuguese',
  [DiffwiseLanguage.IT]: 'diffwiseItalian',
  [DiffwiseLanguage.JA]: 'diffwiseJapanese',
  [DiffwiseLanguage.DE]: 'diffwiseGerman',
  [DiffwiseLanguage.KO]: 'diffwiseKorean',
};

/**
 * The text of `app.config.ts` that gives the options to every diff of an app, in the order of
 * the options, and the chosen language besides English to `provideDiffwiseLanguages`. The plain
 * object has texts in quotes; the `DiffwiseConfig` has the constants of the library instead, with
 * their imports.
 */
export function configCode(options: DiffwiseConfigOptions, form: ConfigForm): string {
  const usesClass = form === ConfigForm.DiffwiseConfig;
  const values = usesClass ? withConstants(options) : options;
  const names = usesClass ? [...constantNamesOf(options), CONFIG_CLASS] : [];
  const language =
    options.language === undefined ? undefined : LANGUAGE_CONSTANTS[options.language];
  const languageNames = language === undefined ? [] : [language, LANGUAGES_FUNCTION];
  const providers =
    Object.keys(options).length === 0
      ? [emptyProviders(usesClass)]
      : [
          PROVIDERS_START,
          ...providerLines(values, usesClass),
          ...languageLines(language),
          PROVIDERS_END,
        ];

  return [
    ANGULAR_IMPORT,
    libraryImport([...names, PROVIDE_FUNCTION, ...languageNames]),
    '',
    CONFIG_START,
    ...providers,
    CONFIG_END,
  ].join('\n');
}

/** The line of `provideDiffwiseLanguages(…)` with the constant of the language, if there is one. */
function languageLines(language: string | undefined): string[] {
  return language === undefined
    ? []
    : [INDENT.repeat(2) + LANGUAGES_FUNCTION + CALL_START + language + CALL_END];
}

/** The providers of an app that changes no option, on one line, as Prettier writes them. */
function emptyProviders(usesClass: boolean): string {
  const config = usesClass ? NEW_CONFIG + CALL_START + CALL_CLOSE : EMPTY_OBJECT;
  const provider = PROVIDE_FUNCTION + CALL_START + config + CALL_CLOSE;

  return PROVIDERS_START + provider + PROVIDERS_END.trimStart();
}

/** The lines of the provider of the options, in the form. */
function providerLines(options: object, usesClass: boolean): string[] {
  return usesClass ? classProvider(options) : objectProvider(options);
}

/** The lines of `provideDiffwise({ … })`, with each option on a line of its own. */
function objectProvider(options: object): string[] {
  const lines = valueLines(options, INDENT.repeat(2), PROVIDE_FUNCTION + CALL_START, true);

  lines[lines.length - 1] += CALL_END;

  return lines;
}

/** The lines of `provideDiffwise(new DiffwiseConfig({ … }))`, each option on a line of its own. */
function classProvider(options: object): string[] {
  const indent = INDENT.repeat(2);
  const config = valueLines(options, INDENT.repeat(3), NEW_CONFIG + CALL_START, true);

  config[config.length - 1] += CALL_END;

  return [indent + PROVIDE_FUNCTION + CALL_START, ...config, indent + CALL_END];
}

/** The import of the names from the library, on one line when it fits. */
function libraryImport(names: readonly string[]): string {
  const sorted = [...new Set(names)].sort();
  const line = `${IMPORT_START} ${sorted.join(', ')} ${IMPORT_END}`;

  if (line.length <= LINE_WIDTH) {
    return line;
  }

  const items = sorted.map((name) => INDENT + name + ITEM_END);

  return [IMPORT_START, ...items, IMPORT_END].join('\n');
}

/** The names of the constants of the library that the options use. */
function constantNamesOf(options: DiffwiseConfigOptions): string[] {
  const entries = Object.entries(options) as [OptionName, unknown][];

  return entries.flatMap(([name, value]) => {
    const constant = CONSTANTS[name];
    const items = Array.isArray(value) ? value : [value];
    const usesConstant = items.some((item) => constant && keyOf(constant, item) !== undefined);

    return usesConstant && constant ? [constant.name] : [];
  });
}

/** The options with each value of a constant written as the constant, as `DiffwiseLayout.Inline`. */
function withConstants(options: DiffwiseConfigOptions): Record<string, unknown> {
  const entries = Object.entries(options) as [OptionName, unknown][];

  return Object.fromEntries(
    entries.map(([name, value]) => {
      const constant = CONSTANTS[name];
      const code = constant ? asConstant(constant, value) : value;

      return [name, code];
    }),
  );
}

/** The value, or each item of a list, as a constant of the library when it has the value. */
function asConstant(constant: LibraryConstant, value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => asConstant(constant, item));
  }

  const key = keyOf(constant, value);

  return key === undefined ? value : codeOf(`${constant.name}.${key}`);
}

/** The key of the constant with the value, such as `Dark` for `'dark'`. */
function keyOf(constant: LibraryConstant, value: unknown): string | undefined {
  return Object.keys(constant.values).find((key) => constant.values[key] === value);
}

/** A piece of code that stands as it is. */
function codeOf(code: string): Code {
  return { code };
}

/** True for a piece of code that stands as it is. */
function isCode(value: unknown): value is Code {
  return typeof value === OBJECT_TYPE && value !== null && Object.hasOwn(value as object, CODE_KEY);
}

/**
 * The lines of a value after the prefix, such as the name of its option: on one line when it fits,
 * or else each item of a list or an object on a line of its own, as Prettier writes them. An
 * expanded object has a line for each item anyway.
 */
function valueLines(value: unknown, indent: string, prefix = '', isExpanded = false): string[] {
  const line = indent + prefix + inlineOf(value);
  const fits = line.length + ITEM_END.length <= LINE_WIDTH;

  if (!isComposite(value) || Object.keys(value).length === 0 || (fits && !isExpanded)) {
    return [line];
  }

  const inner = indent + INDENT;
  const isList = Array.isArray(value);
  const entries: [string, unknown][] = isList
    ? value.map((item: unknown) => ['', item])
    : Object.entries(value).map(([key, item]) => [key + KEY_END, item]);
  const lines = entries.flatMap(([itemPrefix, item]) => {
    const itemLines = valueLines(item, inner, itemPrefix);

    itemLines[itemLines.length - 1] += ITEM_END;

    return itemLines;
  });
  const [open, close] = isList ? LIST_BRACKETS : OBJECT_BRACES;

  return [indent + prefix + open, ...lines, indent + close];
}

/** True for a list or an object, which can stand on several lines. */
function isComposite(value: unknown): value is object {
  return typeof value === OBJECT_TYPE && value !== null && !isCode(value);
}

/** A value on one line, as code. */
function inlineOf(value: unknown): string {
  if (isCode(value)) {
    return value.code;
  }

  if (typeof value === STRING_TYPE) {
    return quoted(value as string);
  }

  if (Array.isArray(value)) {
    return `[${value.map(inlineOf).join(', ')}]`;
  }

  if (isComposite(value)) {
    const entries = Object.entries(value).map(([key, item]) => key + KEY_END + inlineOf(item));

    return entries.length === 0 ? EMPTY_OBJECT : `{ ${entries.join(', ')} }`;
  }

  return String(value);
}

/**
 * A text in quotes, with the special characters in it escaped. As Prettier does, single quotes
 * stand around it unless it has more single quotes than double ones.
 */
function quoted(text: string): string {
  const escaped = JSON.stringify(text).slice(1, -1);
  const usesDoubleQuotes = countOf(text, QUOTE) > countOf(text, DOUBLE_QUOTE);

  if (usesDoubleQuotes) {
    return DOUBLE_QUOTE + escaped + DOUBLE_QUOTE;
  }

  const singleQuoted = escaped
    .replaceAll(ESCAPED_DOUBLE_QUOTE, DOUBLE_QUOTE)
    .replaceAll(QUOTE, ESCAPED_QUOTE);

  return QUOTE + singleQuoted + QUOTE;
}

/** How many times the character stands in the text. */
function countOf(text: string, character: string): number {
  return text.split(character).length - 1;
}
