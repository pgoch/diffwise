import type { DiffwiseConfigOptions } from './diffwise-config';
import { normalizeConfig } from './normalize-config';
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
  DiffwiseNoChangesView,
  DiffwiseTooltipColorMode,
  DiffwiseVersionHeaders,
  DiffwiseVerticalAlignment,
} from './option-values';

const WARN_METHOD = 'warn';

describe('normalizeConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    const customTexts = {
      oldVersionLabel: 'Przed zmianami',
      newVersionLabel: 4,
      oldVerisonLabel: 'Po zmianach',
    };
    const validTexts = normalizeConfig({ customTexts }).customTexts;

    expect(validTexts).toEqual({ oldVersionLabel: 'Przed zmianami' });
    expect(Object.isFrozen(validTexts)).toBe(true);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('leaves out a custom text without a value, and ignores custom texts that are not an object', () => {
    expect(normalizeConfig({ customTexts: { oldVersionLabel: undefined } })).toEqual({
      customTexts: {},
    });
    expect(normalizeConfig({ customTexts: 'Przed zmianami' })).toEqual({});
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('keeps null for custom texts and colors, which takes them away', () => {
    expect(normalizeConfig({ customTexts: null, diffColors: null })).toEqual({
      customTexts: null,
      diffColors: null,
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('keeps values of the appearance options, given as constants or as plain text', () => {
    const options = {
      highlightStyle: 'top-bottom',
      diffIntensity: 5,
      uiContrast: 1,
      lineNumberStyle: 'background',
      lineNumberAlignment: 'middle',
      highlightChangedLines: false,
      highlightWholeLines: true,
      dividerStyle: 'line',
      gapStyle: 'empty',
      versionHeaderAlignment: 'start',
      fontFamily: 'builtin',
      versionHeaderFontSize: 1,
      lineNumberFontSize: 0.5,
      tooltipFontSize: 10,
      toolbarFontSize: 1.2,
      showDiffStats: false,
    };

    expect(normalizeConfig(options)).toEqual({
      highlightStyle: DiffwiseHighlightStyle.TopBottom,
      diffIntensity: 5,
      uiContrast: 1,
      lineNumberStyle: DiffwiseLineNumberStyle.Background,
      lineNumberAlignment: DiffwiseVerticalAlignment.Middle,
      highlightChangedLines: false,
      highlightWholeLines: true,
      dividerStyle: DiffwiseDividerStyle.Line,
      gapStyle: DiffwiseGapStyle.Empty,
      versionHeaderAlignment: DiffwiseAlignment.Start,
      fontFamily: DiffwiseFontFamily.Builtin,
      versionHeaderFontSize: 1,
      lineNumberFontSize: 0.5,
      tooltipFontSize: 10,
      toolbarFontSize: 1.2,
      showDiffStats: false,
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('keeps the looks of the icons and the tooltips, and ignores other values with a warning', () => {
    const options = {
      changeDetailsIconStyle: 'filled',
      tooltipColorMode: 'reversed',
      highlightTooltipChanges: false,
      tooltipTitleAlignment: 'center',
    };
    const invalidOptions = [
      { changeDetailsIconStyle: 'outline' },
      { tooltipColorMode: 'dark' },
      { highlightTooltipChanges: 'false' },
      { tooltipTitleAlignment: 'left' },
    ];

    expect(normalizeConfig(options)).toEqual({
      changeDetailsIconStyle: DiffwiseChangeDetailsIconStyle.Filled,
      tooltipColorMode: DiffwiseTooltipColorMode.Reversed,
      highlightTooltipChanges: false,
      tooltipTitleAlignment: DiffwiseAlignment.Center,
    });

    for (const invalid of invalidOptions) {
      expect(normalizeConfig(invalid)).toEqual({});
    }

    expect(console.warn).toHaveBeenCalledTimes(invalidOptions.length);
  });

  it('keeps the options of the comparison, and ignores values that are not true or false', () => {
    expect(normalizeConfig({ ignoreFormatting: true, ignoreLinkChanges: false })).toEqual({
      ignoreFormatting: true,
      ignoreLinkChanges: false,
    });
    expect(normalizeConfig({ ignoreFormatting: 'true', ignoreLinkChanges: 0 })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('keeps where details of changes show, and ignores another place with a warning', () => {
    expect(normalizeConfig({ changeDetails: 'hover' })).toEqual({
      changeDetails: DiffwiseChangeDetails.Hover,
    });
    expect(normalizeConfig({ changeDetails: 'tooltip' })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('ignores levels and font sizes out of their ranges, with a warning for each', () => {
    const invalidOptions = [
      { diffIntensity: 0 },
      { diffIntensity: 2.5 },
      { uiContrast: 6 },
      { uiContrast: '3' },
      { versionHeaderFontSize: 0.4 },
      { lineNumberFontSize: 11 },
      { lineNumberFontSize: Number.NaN },
      { tooltipFontSize: 0 },
      { toolbarFontSize: 10.5 },
      { showDiffStats: 'false' },
    ];

    for (const options of invalidOptions) {
      expect(normalizeConfig(options)).toEqual({});
    }

    expect(console.warn).toHaveBeenCalledTimes(invalidOptions.length);
  });

  it('keeps a layout and a breakpoint above zero, given as constants or as plain text', () => {
    expect(normalizeConfig({ layout: 'side-by-side', layoutBreakpoint: 600.5 })).toEqual({
      layout: DiffwiseLayout.SideBySide,
      layoutBreakpoint: 600.5,
    });
    expect(normalizeConfig({ layout: 'inline' })).toEqual({ layout: DiffwiseLayout.Inline });
    expect(normalizeConfig({ layout: 'auto' })).toEqual({ layout: DiffwiseLayout.Auto });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('ignores another layout and a breakpoint that is not above zero, with a warning for each', () => {
    const invalidOptions = [
      { layout: 'stacked' },
      { layout: true },
      { layoutBreakpoint: 0 },
      { layoutBreakpoint: -768 },
      { layoutBreakpoint: '768' },
      { layoutBreakpoint: Number.NaN },
      { layoutBreakpoint: Number.POSITIVE_INFINITY },
    ];

    for (const options of invalidOptions) {
      expect(normalizeConfig(options)).toEqual({});
    }

    expect(console.warn).toHaveBeenCalledTimes(invalidOptions.length);
  });

  it('keeps a way to show changed lines in the single column, given as a constant or as plain text', () => {
    expect(normalizeConfig({ inlineDiffStyle: 'strikethrough' })).toEqual({
      inlineDiffStyle: DiffwiseInlineDiffStyle.Strikethrough,
    });
    expect(normalizeConfig({ inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked })).toEqual({
      inlineDiffStyle: 'stacked',
    });
    expect(normalizeConfig({ inlineDiffStyle: 'merged' })).toEqual({
      inlineDiffStyle: DiffwiseInlineDiffStyle.Merged,
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('ignores another way to show changed lines in the single column, with a warning', () => {
    const invalidOptions = [{ inlineDiffStyle: 'side-by-side' }, { inlineDiffStyle: 1 }];

    for (const options of invalidOptions) {
      expect(normalizeConfig(options)).toEqual({});
    }

    expect(console.warn).toHaveBeenCalledTimes(invalidOptions.length);
  });

  it('keeps hidden unchanged lines and a whole number of context lines from 1 to 100', () => {
    expect(normalizeConfig({ hideUnchangedLines: true, contextLines: 1 })).toEqual({
      hideUnchangedLines: true,
      contextLines: 1,
    });
    expect(normalizeConfig({ contextLines: 100 })).toEqual({ contextLines: 100 });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('ignores context lines out of their range or not whole, with a warning for each', () => {
    const invalidOptions = [
      { hideUnchangedLines: 'true' },
      { contextLines: 0 },
      { contextLines: 101 },
      { contextLines: 2.5 },
      { contextLines: '3' },
      { contextLines: Number.NaN },
    ];

    for (const options of invalidOptions) {
      expect(normalizeConfig(options)).toEqual({});
    }

    expect(console.warn).toHaveBeenCalledTimes(invalidOptions.length);
  });

  it('keeps what the same versions show, and ignores another value with a warning', () => {
    expect(normalizeConfig({ noChangesView: 'document' })).toEqual({
      noChangesView: DiffwiseNoChangesView.Document,
    });
    expect(normalizeConfig({ noChangesView: DiffwiseNoChangesView.Diff })).toEqual({
      noChangesView: 'diff',
    });
    expect(normalizeConfig({ noChangesView: 'none' })).toEqual({});
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('keeps the name of a font of the app, and ignores a name it cannot put in quotes', () => {
    expect(normalizeConfig({ fontFamily: 'Source Sans 3' })).toEqual({
      fontFamily: 'Source Sans 3',
    });
    expect(normalizeConfig({ fontFamily: ' ' })).toEqual({});
    expect(normalizeConfig({ fontFamily: 'Inter"; color: red' })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('keeps the valid colors of changes as frozen copies, warning about each invalid one', () => {
    const diffColors = {
      light: { addedLine: '#e6f7f5', addedAcent: '#0f766e', removedLine: ' ' },
      dark: '#16191f',
      sepia: { addedLine: '#f1e7d0' },
    };
    const validColors = normalizeConfig({ diffColors }).diffColors;

    expect(validColors).toEqual({ light: { addedLine: '#e6f7f5' } });
    expect(Object.isFrozen(validColors)).toBe(true);
    expect(Object.isFrozen(validColors?.light)).toBe(true);
    expect(console.warn).toHaveBeenCalledTimes(4);
  });

  it('ignores a color the browser cannot read', () => {
    vi.stubGlobal('CSS', { supports: (_property: string, value: string) => value !== 'redd' });

    const diffColors = { dark: { removedAccent: 'redd', addedAccent: '#6fdc8c' } };

    expect(normalizeConfig({ diffColors })).toEqual({
      diffColors: { dark: { addedAccent: '#6fdc8c' } },
    });
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
