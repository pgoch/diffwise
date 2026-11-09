import { DiffwiseConfig, type DiffwiseConfigOptions } from './diffwise-config';
import { DiffwiseColorMode, DiffwiseLanguage, DiffwiseVersionHeaders } from './option-values';

const WARN_METHOD = 'warn';

/** Options as plain JavaScript or JSON can give them, without type checks. */
function untyped(options: object): DiffwiseConfigOptions {
  return options as DiffwiseConfigOptions;
}

describe('DiffwiseConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has the default of every option', () => {
    expect({ ...new DiffwiseConfig() }).toEqual({
      colorMode: DiffwiseColorMode.Auto,
      darkModeSelector: null,
      showLineNumbers: true,
      versionHeaders: DiffwiseVersionHeaders.Default,
      ignoreWhitespace: false,
      ignoreCase: false,
      language: DiffwiseLanguage.Auto,
      customTexts: {},
    });
  });

  it('changes only the options given to the constructor', () => {
    const config = new DiffwiseConfig({ showLineNumbers: false, versionHeaders: 'icons' });

    expect({ ...config }).toEqual({
      colorMode: DiffwiseColorMode.Auto,
      darkModeSelector: null,
      showLineNumbers: false,
      versionHeaders: DiffwiseVersionHeaders.Icons,
      ignoreWhitespace: false,
      ignoreCase: false,
      language: DiffwiseLanguage.Auto,
      customTexts: {},
    });
  });

  it('cannot be changed; with() returns a changed copy', () => {
    const config = new DiffwiseConfig({ ignoreCase: true });
    const copy = config.with({ showLineNumbers: false });

    expect(Object.isFrozen(config)).toBe(true);
    expect(config.showLineNumbers).toBe(true);
    expect(copy.showLineNumbers).toBe(false);
    expect(copy.ignoreCase).toBe(true);
  });

  it('takes from another config only the options given to it', () => {
    const globalConfig = new DiffwiseConfig({ showLineNumbers: false });
    const diffConfig = new DiffwiseConfig({ ignoreCase: true });
    const effectiveConfig = globalConfig.with(diffConfig);

    expect(effectiveConfig.showLineNumbers).toBe(false);
    expect(effectiveConfig.ignoreCase).toBe(true);
  });

  it('keeps the current value when a change has no value', () => {
    const config = new DiffwiseConfig({ showLineNumbers: false });

    expect(config.with({ showLineNumbers: undefined }).showLineNumbers).toBe(false);
  });

  it('keeps texts of the app as they were given', () => {
    const texts = { old: 'Wersja 3', new: 'Wersja 4' };
    const config = new DiffwiseConfig({ versionHeaders: texts });

    texts.old = 'Wersja 5';

    expect(config.versionHeaders).toEqual({ old: 'Wersja 3', new: 'Wersja 4' });
  });

  it('changes custom texts one by one, so the other texts stay', () => {
    const config = new DiffwiseConfig({
      customTexts: { oldVersionLabel: 'Przed', newVersionLabel: 'Po' },
    });
    const copy = config.with({ customTexts: { newVersionLabel: 'Teraz' } });

    expect(copy.customTexts).toEqual({ oldVersionLabel: 'Przed', newVersionLabel: 'Teraz' });
    expect(config.customTexts).toEqual({ oldVersionLabel: 'Przed', newVersionLabel: 'Po' });
  });

  it('keeps the default for an invalid value, with a warning', () => {
    const config = new DiffwiseConfig(untyped({ showLineNumbers: 'false' }));

    expect(config.showLineNumbers).toBe(true);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('keeps the current value when a change is invalid', () => {
    const config = new DiffwiseConfig({ versionHeaders: DiffwiseVersionHeaders.None });

    expect(config.with(untyped({ versionHeaders: 'both' })).versionHeaders).toBe(
      DiffwiseVersionHeaders.None,
    );
  });
});
