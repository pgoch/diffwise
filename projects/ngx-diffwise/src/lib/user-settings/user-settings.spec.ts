import { DiffwiseColorMode, DiffwiseLayout, DiffwiseUserSetting } from '../config/option-values';
import { validUserChoices } from './user-settings';

const WARN_METHOD = 'warn';

const ALL_SETTINGS = Object.values(DiffwiseUserSetting);

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
