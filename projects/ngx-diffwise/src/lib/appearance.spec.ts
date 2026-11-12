import { appearanceClasses, appearanceStyles } from './appearance';
import { DiffwiseConfig } from './config/diffwise-config';
import { DiffwiseLayout } from './config/option-values';

const BUILTIN_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const FONT_FAMILY_PROPERTY = 'font-family';

/** Classes of the default levels, which a diff has even with the default configuration. */
const DEFAULT_LEVEL_CLASSES = [
  'diffwise-html-diff--diff-intensity-3',
  'diffwise-html-diff--ui-contrast-3',
];

describe('appearanceClasses', () => {
  it('adds only the classes of the levels for the defaults', () => {
    expect(appearanceClasses(new DiffwiseConfig(), {}, DiffwiseLayout.SideBySide)).toEqual(
      DEFAULT_LEVEL_CLASSES,
    );
  });

  it('adds the class of the single column when the diff shows it', () => {
    expect(appearanceClasses(new DiffwiseConfig(), {}, DiffwiseLayout.Inline)).toEqual([
      'diffwise-html-diff--layout-inline',
      ...DEFAULT_LEVEL_CLASSES,
    ]);
  });

  it('adds no class for the layout an option asks for, only for the one shown', () => {
    const config = new DiffwiseConfig({ layout: DiffwiseLayout.Inline });

    expect(appearanceClasses(config, {}, DiffwiseLayout.SideBySide)).toEqual(DEFAULT_LEVEL_CLASSES);
  });

  it('adds a modifier class with the value of each option that differs from its default', () => {
    const config = new DiffwiseConfig({
      highlightStyle: 'top-bottom',
      diffIntensity: 1,
      uiContrast: 5,
      lineNumberStyle: 'background',
      lineNumberAlignment: 'bottom',
      dividerStyle: 'line',
      gapStyle: 'empty',
      versionHeaderAlignment: 'end',
      changeDetails: 'icon',
      changeDetailsIconStyle: 'plain',
      tooltipColorMode: 'reversed',
      tooltipTitleAlignment: 'center',
    });

    expect(appearanceClasses(config, {}, DiffwiseLayout.SideBySide)).toEqual([
      'diffwise-html-diff--highlight-style-top-bottom',
      'diffwise-html-diff--line-number-style-background',
      'diffwise-html-diff--line-number-alignment-bottom',
      'diffwise-html-diff--divider-style-line',
      'diffwise-html-diff--gap-style-empty',
      'diffwise-html-diff--version-header-alignment-end',
      'diffwise-html-diff--change-details-icon',
      'diffwise-html-diff--change-details-icon-style-plain',
      'diffwise-html-diff--tooltip-color-mode-reversed',
      'diffwise-html-diff--tooltip-title-alignment-center',
      'diffwise-html-diff--diff-intensity-1',
      'diffwise-html-diff--ui-contrast-5',
    ]);
  });

  it('highlights whole lines only without backgrounds of changed lines', () => {
    const withoutBackgrounds = new DiffwiseConfig({
      showLineNumbers: false,
      highlightChangedLines: false,
      highlightWholeLines: true,
    });
    const withBackgrounds = new DiffwiseConfig({ highlightWholeLines: true });

    expect(appearanceClasses(withoutBackgrounds, {}, DiffwiseLayout.SideBySide)).toEqual([
      ...DEFAULT_LEVEL_CLASSES,
      'diffwise-html-diff--no-line-numbers',
      'diffwise-html-diff--no-changed-line-highlight',
      'diffwise-html-diff--highlight-whole-lines',
    ]);
    expect(appearanceClasses(withBackgrounds, {}, DiffwiseLayout.SideBySide)).toEqual(
      DEFAULT_LEVEL_CLASSES,
    );
  });

  it('turns off the highlights of changed parts in the tooltips', () => {
    const config = new DiffwiseConfig({ highlightTooltipChanges: false });

    expect(appearanceClasses(config, {}, DiffwiseLayout.SideBySide)).toEqual([
      ...DEFAULT_LEVEL_CLASSES,
      'diffwise-html-diff--no-tooltip-change-highlight',
    ]);
  });

  it('leaves out the intensity when the app gives colors of changes', () => {
    const config = new DiffwiseConfig({ diffIntensity: 5 });

    expect(
      appearanceClasses(config, { addedAccent: '#0f766e' }, DiffwiseLayout.SideBySide),
    ).toEqual(['diffwise-html-diff--ui-contrast-3']);
  });
});

describe('appearanceStyles', () => {
  it('sets only the digits of the line numbers for the defaults', () => {
    expect(appearanceStyles(new DiffwiseConfig(), {}, 2)).toEqual({
      '--diffwise-line-number-digits': '2',
    });
  });

  it('sets the sizes, the font and the colors of the app', () => {
    const config = new DiffwiseConfig({
      versionHeaderFontSize: 0.9,
      lineNumberFontSize: 1,
      tooltipFontSize: 0.7,
      fontFamily: 'Source Sans 3',
    });
    const colors = { removedLine: '#fbeefe', addedAccent: '#0f766e' };

    expect(appearanceStyles(config, colors, 3)).toEqual({
      '--diffwise-line-number-digits': '3',
      '--diffwise-line-number-font-size': '1rem',
      '--diffwise-version-header-font-size': '0.9rem',
      '--diffwise-tooltip-font-size': '0.7rem',
      [FONT_FAMILY_PROPERTY]: '"Source Sans 3", ' + BUILTIN_FONT_FAMILY,
      '--diffwise-removed-line': '#fbeefe',
      '--diffwise-added-accent': '#0f766e',
    });
  });

  it('sets the built-in font', () => {
    const config = new DiffwiseConfig({ fontFamily: 'builtin' });

    expect(appearanceStyles(config, {}, 2)[FONT_FAMILY_PROPERTY]).toBe(BUILTIN_FONT_FAMILY);
  });
});
