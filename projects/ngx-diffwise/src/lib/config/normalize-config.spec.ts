import type { DiffwiseConfigOptions } from './diffwise-config';
import { normalizeConfig } from './normalize-config';
import { DiffwiseColorMode, DiffwiseLanguage, DiffwiseVersionHeaders } from './option-values';

const WARN_METHOD = 'warn';

describe('normalizeConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps valid values, given as constants or as plain text', () => {
    const options = { showLineNumbers: false, versionHeaders: 'icons', ignoreCase: true };

    expect(normalizeConfig(options)).toEqual({
      showLineNumbers: false,
      versionHeaders: DiffwiseVersionHeaders.Icons,
      ignoreCase: true,
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('keeps texts of the app as a frozen copy', () => {
    const texts = { old: 'Wersja 3 · 12.10.2026', new: 'Wersja 4 · 05.11.2026' };
    const { versionHeaders } = normalizeConfig({ versionHeaders: texts });

    expect(versionHeaders).toEqual(texts);
    expect(versionHeaders).not.toBe(texts);
    expect(Object.isFrozen(versionHeaders)).toBe(true);
  });

  it('leaves out an option without a value, with no warning', () => {
    const options: DiffwiseConfigOptions = { showLineNumbers: undefined, ignoreCase: true };

    expect(normalizeConfig(options)).toEqual({ ignoreCase: true });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('ignores values the options do not take, with a warning for each', () => {
    const options = { showLineNumbers: 'false', versionHeaders: 'both', ignoreWhitespace: 1 };

    expect(normalizeConfig(options)).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(3);
  });

  it('ignores texts of the app without both texts', () => {
    expect(normalizeConfig({ versionHeaders: { old: 'Wersja 3' } })).toEqual({});
    expect(normalizeConfig({ versionHeaders: { old: 'Wersja 3', new: 4 } })).toEqual({});
    expect(normalizeConfig({ versionHeaders: null })).toEqual({});
  });

  it('keeps a color mode, and a dark mode selector or null for the system', () => {
    const options = { colorMode: 'dark', darkModeSelector: 'html.dark, [data-theme="dark"]' };

    expect(normalizeConfig(options)).toEqual({
      colorMode: DiffwiseColorMode.Dark,
      darkModeSelector: 'html.dark, [data-theme="dark"]',
    });
    expect(normalizeConfig({ darkModeSelector: null })).toEqual({ darkModeSelector: null });
  });

  it('ignores a color mode or a dark mode selector the browser cannot use', () => {
    const invalidOptions = [
      { colorMode: 'night' },
      { darkModeSelector: ' ' },
      { darkModeSelector: '..dark' },
      { darkModeSelector: 1 },
    ];

    for (const options of invalidOptions) {
      expect(normalizeConfig(options)).toEqual({});
    }

    expect(console.warn).toHaveBeenCalledTimes(invalidOptions.length);
  });

  it('keeps a language of the interface, and ignores one it has no texts in', () => {
    expect(normalizeConfig({ language: 'pl' })).toEqual({ language: DiffwiseLanguage.PL });
    expect(normalizeConfig({ language: 'de' })).toEqual({});
    expect(normalizeConfig({ language: 'pl-PL' })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('keeps the valid custom texts as a frozen copy, with a warning for each invalid one', () => {
    const customTexts = { oldVersion: 'Przed zmianami', newVersion: 4, oldVerison: 'Po zmianach' };
    const validTexts = normalizeConfig({ customTexts }).customTexts;

    expect(validTexts).toEqual({ oldVersion: 'Przed zmianami' });
    expect(Object.isFrozen(validTexts)).toBe(true);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('leaves out a custom text without a value, and ignores custom texts that are not an object', () => {
    expect(normalizeConfig({ customTexts: { oldVersion: undefined } })).toEqual({
      customTexts: {},
    });
    expect(normalizeConfig({ customTexts: 'Przed zmianami' })).toEqual({});
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('ignores an unknown option, with a warning', () => {
    expect(normalizeConfig({ showLineNumber: false, ignoreCase: true })).toEqual({
      ignoreCase: true,
    });
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('ignores a configuration that is not an object', () => {
    expect(normalizeConfig(null)).toEqual({});
    expect(normalizeConfig('showLineNumbers')).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
