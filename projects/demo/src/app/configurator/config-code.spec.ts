import * as library from 'ngx-diffwise';
import {
  DiffwiseColorMode,
  DiffwiseConfig,
  type DiffwiseConfigOptions,
  DiffwiseFontFamily,
  DiffwiseLanguage,
  type DiffwiseLanguagePack,
  DiffwiseLayout,
  DiffwisePalette,
  DiffwiseUserSetting,
  DiffwiseVersionHeaders,
} from 'ngx-diffwise';

import { ConfigForm, configCode } from './config-code';

/** The options of the example of the documentation: dark, colorblind, one column, short. */
const EXAMPLE_OPTIONS: DiffwiseConfigOptions = {
  colorMode: DiffwiseColorMode.Dark,
  diffPalette: DiffwisePalette.Colorblind,
  layout: DiffwiseLayout.Inline,
  hideUnchangedLines: true,
};

const EXAMPLE_OBJECT = `import { ApplicationConfig } from '@angular/core';
import { provideDiffwise } from 'ngx-diffwise';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDiffwise({
      colorMode: 'dark',
      diffPalette: 'colorblind',
      layout: 'inline',
      hideUnchangedLines: true,
    }),
  ],
};`;

const EXAMPLE_CLASS = `import { ApplicationConfig } from '@angular/core';
import {
  DiffwiseColorMode,
  DiffwiseConfig,
  DiffwiseLayout,
  DiffwisePalette,
  provideDiffwise,
} from 'ngx-diffwise';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDiffwise(
      new DiffwiseConfig({
        colorMode: DiffwiseColorMode.Dark,
        diffPalette: DiffwisePalette.Colorblind,
        layout: DiffwiseLayout.Inline,
        hideUnchangedLines: true,
      }),
    ),
  ],
};`;

const POLISH_OBJECT = `import { ApplicationConfig } from '@angular/core';
import { diffwisePolish, provideDiffwise, provideDiffwiseLanguages } from 'ngx-diffwise';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDiffwise({
      language: 'pl',
    }),
    provideDiffwiseLanguages(diffwisePolish),
  ],
};`;

/** Options of every kind: numbers, texts with quotes, lists, objects and a named font. */
const RICH_OPTIONS: DiffwiseConfigOptions = {
  colorMode: DiffwiseColorMode.Auto,
  darkModeSelector: "[data-theme='dark']",
  diffIntensity: 5,
  diffColors: {
    light: { removedLine: '#fbeefe', addedAccent: '#0f766e' },
    dark: { addedLine: '#16302b' },
  },
  contextLines: 1,
  layoutBreakpoint: 900,
  versionHeaders: { old: 'Version 3 · 12.10.2026', new: 'Version 4 · 05.11.2026' },
  fontFamily: 'Source Sans 3',
  versionHeaderFontSize: 1.25,
  allowedUserSettings: [DiffwiseUserSetting.ColorMode, DiffwiseUserSetting.Layout],
  userSettingsKey: 'contract-history',
  customTexts: { oldVersionLabel: "Don't keep", newVersionLabel: 'The "new" one' },
};

const PROVIDERS_START = 'providers: ';
const PROVIDERS_END = '],';
const IMPORT_NAMES = /import \{([^}]*)\} from 'ngx-diffwise'/;

/**
 * What the code gives to each provider function: its list of providers runs with the exports of
 * the library, and `provideDiffwise` and `provideDiffwiseLanguages` give back what they get.
 */
function providersOf(code: string): unknown[] {
  const start = code.indexOf(PROVIDERS_START) + PROVIDERS_START.length;
  const providers = code.slice(start, code.lastIndexOf(PROVIDERS_END) + 1);
  const scope = {
    ...library,
    provideDiffwise: (config: unknown) => config,
    provideDiffwiseLanguages: (...languages: DiffwiseLanguagePack[]) => languages,
  };
  const run = new Function(...Object.keys(scope), `return ${providers};`) as (
    ...values: unknown[]
  ) => unknown[];

  return run(...Object.values(scope));
}

/** The options that the code gives to `provideDiffwise`. */
function providedOptions(code: string): unknown {
  return providersOf(code)[0];
}

/** The languages that the code gives to `provideDiffwiseLanguages`, if it calls it. */
function providedLanguages(code: string): DiffwiseLanguage[] | undefined {
  const languages = providersOf(code)[1] as DiffwiseLanguagePack[] | undefined;

  return languages?.map(({ language }) => language);
}

/** The names the code imports from the library. */
function importedNames(code: string): string[] {
  const names = IMPORT_NAMES.exec(code)?.[1] ?? '';

  return names
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

describe('configCode', () => {
  it('writes the options as a plain object, with texts in quotes', () => {
    expect(configCode(EXAMPLE_OPTIONS, ConfigForm.PlainObject)).toBe(EXAMPLE_OBJECT);
  });

  it('writes the options as a DiffwiseConfig, with the constants and their imports', () => {
    expect(configCode(EXAMPLE_OPTIONS, ConfigForm.DiffwiseConfig)).toBe(EXAMPLE_CLASS);
  });

  it('writes an empty configuration on one line, as Prettier does', () => {
    expect(configCode({}, ConfigForm.PlainObject)).toContain(
      '  providers: [provideDiffwise({})],\n',
    );
    expect(configCode({}, ConfigForm.DiffwiseConfig)).toContain(
      "import { DiffwiseConfig, provideDiffwise } from 'ngx-diffwise';\n",
    );
    expect(configCode({}, ConfigForm.DiffwiseConfig)).toContain(
      '  providers: [provideDiffwise(new DiffwiseConfig())],\n',
    );
  });

  it('quotes texts as Prettier does, and puts a long value on several lines', () => {
    const code = configCode(RICH_OPTIONS, ConfigForm.PlainObject);
    const quotes = configCode(
      { customTexts: { diffLabel: `It's "both"` } },
      ConfigForm.PlainObject,
    );

    expect(code).toContain(`      darkModeSelector: "[data-theme='dark']",\n`);
    expect(code).toContain(
      `      customTexts: { oldVersionLabel: "Don't keep", newVersionLabel: 'The "new" one' },\n`,
    );
    expect(quotes).toContain(`      customTexts: { diffLabel: 'It\\'s "both"' },\n`);
    expect(code).toContain(
      [
        '      diffColors: {',
        "        light: { removedLine: '#fbeefe', addedAccent: '#0f766e' },",
        "        dark: { addedLine: '#16302b' },",
        '      },',
      ].join('\n'),
    );
    expect(code).toContain(`      allowedUserSettings: ['colorMode', 'layout'],\n`);
  });

  it('writes the values of constants as constants, and a named font as its name', () => {
    const options = {
      fontFamily: DiffwiseFontFamily.Builtin,
      versionHeaders: DiffwiseVersionHeaders.Icons,
      allowedUserSettings: [DiffwiseUserSetting.Layout],
    };
    const code = configCode(options, ConfigForm.DiffwiseConfig);
    const named = configCode({ fontFamily: 'Inter' }, ConfigForm.DiffwiseConfig);

    expect(code).toContain('        fontFamily: DiffwiseFontFamily.Builtin,\n');
    expect(code).toContain('        versionHeaders: DiffwiseVersionHeaders.Icons,\n');
    expect(code).toContain('        allowedUserSettings: [DiffwiseUserSetting.Layout],\n');
    expect(named).toContain("        fontFamily: 'Inter',\n");
    expect(importedNames(named)).toEqual(['DiffwiseConfig', 'provideDiffwise']);
  });

  for (const form of Object.values(ConfigForm)) {
    it(`gives the library exactly the chosen options, as a ${form}`, () => {
      const code = configCode(RICH_OPTIONS, form);
      const provided = providedOptions(code);

      expect(new DiffwiseConfig(provided as DiffwiseConfigOptions)).toEqual(
        new DiffwiseConfig(RICH_OPTIONS),
      );
      expect(importedNames(code).every((name) => Object.hasOwn(library, name))).toBe(true);
    });
  }

  it('gives the chosen language besides English to provideDiffwiseLanguages, with its import', () => {
    expect(configCode({ language: DiffwiseLanguage.PL }, ConfigForm.PlainObject)).toBe(
      POLISH_OBJECT,
    );

    for (const form of Object.values(ConfigForm)) {
      for (const language of Object.values(DiffwiseLanguage)) {
        const code = configCode({ language }, form);
        const isProvided = language !== DiffwiseLanguage.EN && language !== DiffwiseLanguage.Auto;

        expect(providedLanguages(code), `${language} ${form}`).toEqual(
          isProvided ? [language] : undefined,
        );
        expect(importedNames(code).every((name) => Object.hasOwn(library, name))).toBe(true);
      }
    }
  });

  it('keeps every line within the width of Prettier in an Angular app', () => {
    for (const form of Object.values(ConfigForm)) {
      const lines = configCode(RICH_OPTIONS, form).split('\n');

      expect(lines.filter((line) => line.length > 100)).toEqual([]);
    }
  });
});
