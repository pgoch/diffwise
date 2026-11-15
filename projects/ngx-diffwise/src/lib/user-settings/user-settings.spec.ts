import { DiffwiseColorMode, DiffwiseLayout, DiffwiseUserSetting } from '../config/option-values';
import { choicesOfUserSettings, userSettingsOf, validUserChoices } from './user-settings';

const WARN_METHOD = 'warn';

const ALL_SETTINGS = Object.values(DiffwiseUserSetting);

describe('userSettingsOf', () => {
  it('gives the choices with the number of their format, frozen', () => {
    const settings = userSettingsOf({ colorMode: DiffwiseColorMode.Dark });

    expect(settings).toEqual({ version: 1, settings: { colorMode: DiffwiseColorMode.Dark } });
    expect(Object.isFrozen(settings)).toBe(true);
  });
});

describe('validUserChoices', () => {
  beforeEach(() => {
    vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the choices of the allowed options', () => {
    const choices = { layout: DiffwiseLayout.Inline, hideUnchangedLines: true };

    expect(validUserChoices(choices, ALL_SETTINGS)).toEqual(choices);
  });

  it('leaves out the choices of options the app does not allow', () => {
    const choices = { layout: DiffwiseLayout.Inline, colorMode: DiffwiseColorMode.Dark };

    expect(validUserChoices(choices, [DiffwiseUserSetting.ColorMode])).toEqual({
      colorMode: DiffwiseColorMode.Dark,
    });
    expect(validUserChoices(choices, [])).toEqual({});
  });

  it('leaves out invalid values and options the user cannot change, with a warning for invalid values', () => {
    const choices = {
      layout: 'columns',
      colorMode: DiffwiseColorMode.Light,
      showLineNumbers: false,
    };

    expect(validUserChoices(choices, ALL_SETTINGS)).toEqual({
      colorMode: DiffwiseColorMode.Light,
    });
    expect(console.warn).toHaveBeenCalledOnce();
  });
});

describe('choicesOfUserSettings', () => {
  beforeEach(() => {
    vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives the valid choices of user settings in the current format, frozen', () => {
    const settings = {
      version: 1,
      settings: { layout: DiffwiseLayout.Inline, colorMode: 'sepia' },
    };
    const choices = choicesOfUserSettings(settings);

    expect(choices).toEqual({ layout: DiffwiseLayout.Inline });
    expect(Object.isFrozen(choices)).toBe(true);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('leaves out the choices of options that are not allowed', () => {
    const settings = userSettingsOf({
      layout: DiffwiseLayout.Inline,
      colorMode: DiffwiseColorMode.Dark,
    });

    expect(choicesOfUserSettings(settings, [DiffwiseUserSetting.ColorMode])).toEqual({
      colorMode: DiffwiseColorMode.Dark,
    });
  });

  it('gives null for a format of an unknown version and for other values, with a warning', () => {
    const values = [
      { version: 2, settings: { layout: DiffwiseLayout.Inline } },
      { settings: { layout: DiffwiseLayout.Inline } },
      { version: 1, settings: null },
      { layout: DiffwiseLayout.Inline },
      'inline',
      null,
    ];

    for (const value of values) {
      expect(choicesOfUserSettings(value)).toBeNull();
    }

    expect(console.warn).toHaveBeenCalledTimes(values.length);
  });
});
