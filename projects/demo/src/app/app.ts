import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import {
  Diffwise,
  DiffwiseAlignment,
  DiffwiseChangeDetails,
  DiffwiseChangeDetailsIconStyle,
  DiffwiseColorMode,
  type DiffwiseConfigOptions,
  type DiffwiseDiffColors,
  DiffwiseDividerStyle,
  DiffwiseFontFamily,
  DiffwiseGapStyle,
  DiffwiseHighlightStyle,
  DiffwiseHtmlDiff,
  DiffwiseLanguage,
  DiffwiseInlineDiffStyle,
  DiffwiseLayout,
  type DiffwiseLevel,
  DiffwiseLineNumberStyle,
  DiffwiseTooltipColorMode,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
  DiffwiseVerticalAlignment,
} from 'ngx-diffwise';

import { type Choice, ChoiceButtons } from './choice-buttons';

/** Languages of the sample documents; each one is a folder in `test-data/`. */
const SampleLanguage = {
  English: 'en',
  Polish: 'pl',
} as const;

type SampleLanguage = (typeof SampleLanguage)[keyof typeof SampleLanguage];

/** Language of the diff interface for each language of the samples. */
const INTERFACE_LANGUAGES: Readonly<Record<SampleLanguage, DiffwiseLanguage>> = {
  [SampleLanguage.English]: DiffwiseLanguage.EN,
  [SampleLanguage.Polish]: DiffwiseLanguage.PL,
};

/** Sizes of the sample documents; each one is a folder in a language folder. */
const SampleSize = {
  Short: 'short',
  Medium: 'medium',
  Long: 'long',
} as const;

type SampleSize = (typeof SampleSize)[keyof typeof SampleSize];

/** File names of the earlier and the later version of a sample. */
const SAMPLE_FILES = ['before', 'after'];

const SAMPLES_FOLDER = 'test-data';
const PATH_SEPARATOR = '/';
const HTML_EXTENSION = '.html';
const LOAD_ERROR = 'Could not load a sample file.';

const LANGUAGE_CHOICES: readonly Choice<SampleLanguage>[] = [
  { value: SampleLanguage.English, label: 'English' },
  { value: SampleLanguage.Polish, label: 'Polski' },
];

const SIZE_CHOICES: readonly Choice<SampleSize>[] = [
  { value: SampleSize.Short, label: 'Short' },
  { value: SampleSize.Medium, label: 'Medium' },
  { value: SampleSize.Long, label: 'Long' },
];

const COLOR_MODE_CHOICES: readonly Choice<DiffwiseColorMode>[] = [
  { value: DiffwiseColorMode.Light, label: 'Light' },
  { value: DiffwiseColorMode.Dark, label: 'Dark' },
  { value: DiffwiseColorMode.Auto, label: 'Auto' },
];

const HIGHLIGHT_STYLE_CHOICES: readonly Choice<DiffwiseHighlightStyle>[] = [
  { value: DiffwiseHighlightStyle.Outline, label: 'Outline' },
  { value: DiffwiseHighlightStyle.Background, label: 'Background' },
  { value: DiffwiseHighlightStyle.Underline, label: 'Underline' },
  { value: DiffwiseHighlightStyle.TopBottom, label: 'Top and bottom' },
];

/** Levels of the intensity and the contrast, from the weakest to the strongest. */
const LEVEL_CHOICES: readonly Choice<DiffwiseLevel>[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

const LAYOUT_CHOICES: readonly Choice<DiffwiseLayout>[] = [
  { value: DiffwiseLayout.Auto, label: 'Auto' },
  { value: DiffwiseLayout.SideBySide, label: 'Side by side' },
  { value: DiffwiseLayout.Inline, label: 'Single column' },
];

const INLINE_DIFF_STYLE_CHOICES: readonly Choice<DiffwiseInlineDiffStyle>[] = [
  { value: DiffwiseInlineDiffStyle.Merged, label: 'Merged' },
  { value: DiffwiseInlineDiffStyle.Strikethrough, label: 'Struck through' },
  { value: DiffwiseInlineDiffStyle.Stacked, label: 'Stacked' },
];

/** Widths of the diff in the demo, as values of `max-width`; the automatic layout follows them. */
const DiffWidth = {
  Full: 'none',
  Medium: '760px',
  Narrow: '480px',
} as const;

type DiffWidth = (typeof DiffWidth)[keyof typeof DiffWidth];

const DIFF_WIDTH_CHOICES: readonly Choice<DiffWidth>[] = [
  { value: DiffWidth.Full, label: 'Full' },
  { value: DiffWidth.Medium, label: '760 px' },
  { value: DiffWidth.Narrow, label: '480 px' },
];

const DIVIDER_STYLE_CHOICES: readonly Choice<DiffwiseDividerStyle>[] = [
  { value: DiffwiseDividerStyle.Column, label: 'Gray column' },
  { value: DiffwiseDividerStyle.Line, label: 'Line' },
];

const GAP_STYLE_CHOICES: readonly Choice<DiffwiseGapStyle>[] = [
  { value: DiffwiseGapStyle.Stripes, label: 'Stripes' },
  { value: DiffwiseGapStyle.Gray, label: 'Gray' },
  { value: DiffwiseGapStyle.Empty, label: 'Empty' },
];

/** A value of the `versionHeaders` option. */
type VersionHeaders = DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts;

/** Header choices; the custom texts show how an app can name its versions. */
const VERSION_HEADER_CHOICES: readonly Choice<VersionHeaders>[] = [
  { value: DiffwiseVersionHeaders.Default, label: 'Default' },
  { value: DiffwiseVersionHeaders.Icons, label: 'Icons' },
  {
    value: { old: 'Version 3 · 12.10.2026', new: 'Version 4 · 05.11.2026' },
    label: 'Custom texts',
  },
  { value: DiffwiseVersionHeaders.None, label: 'None' },
];

const ALIGNMENT_CHOICES: readonly Choice<DiffwiseAlignment>[] = [
  { value: DiffwiseAlignment.Start, label: 'Start' },
  { value: DiffwiseAlignment.Center, label: 'Center' },
  { value: DiffwiseAlignment.End, label: 'End' },
];

const LINE_NUMBER_STYLE_CHOICES: readonly Choice<DiffwiseLineNumberStyle>[] = [
  { value: DiffwiseLineNumberStyle.Bar, label: 'Colored bar' },
  { value: DiffwiseLineNumberStyle.Background, label: 'Colored background' },
];

const VERTICAL_ALIGNMENT_CHOICES: readonly Choice<DiffwiseVerticalAlignment>[] = [
  { value: DiffwiseVerticalAlignment.Top, label: 'Top' },
  { value: DiffwiseVerticalAlignment.Middle, label: 'Middle' },
  { value: DiffwiseVerticalAlignment.Bottom, label: 'Bottom' },
];

/** Where details of changes besides text show. */
const CHANGE_DETAILS_CHOICES: readonly Choice<DiffwiseChangeDetails>[] = [
  { value: DiffwiseChangeDetails.Hover, label: 'Tooltip on the change' },
  { value: DiffwiseChangeDetails.Icon, label: 'Icon in the middle' },
  { value: DiffwiseChangeDetails.Both, label: 'Both' },
];

const CHANGE_DETAILS_ICON_STYLE_CHOICES: readonly Choice<DiffwiseChangeDetailsIconStyle>[] = [
  { value: DiffwiseChangeDetailsIconStyle.Plain, label: 'Gray frame' },
  { value: DiffwiseChangeDetailsIconStyle.Gradient, label: 'Gradient frame' },
  { value: DiffwiseChangeDetailsIconStyle.Filled, label: 'Full gradient' },
];

const TOOLTIP_COLOR_MODE_CHOICES: readonly Choice<DiffwiseTooltipColorMode>[] = [
  { value: DiffwiseTooltipColorMode.Reversed, label: 'Reversed' },
  { value: DiffwiseTooltipColorMode.Component, label: 'Colors of the diff' },
];

/** Fonts in the panel: the one of the app, the built-in one, or a font named in the panel. */
const FontChoice = {
  App: 'app',
  Builtin: 'builtin',
  Custom: 'custom',
} as const;

type FontChoice = (typeof FontChoice)[keyof typeof FontChoice];

const FONT_CHOICES: readonly Choice<FontChoice>[] = [
  { value: FontChoice.App, label: 'App' },
  { value: FontChoice.Builtin, label: 'Built-in' },
  { value: FontChoice.Custom, label: 'Custom' },
];

/** A font that comes with Windows and macOS, so the custom font shows without loading it. */
const DEFAULT_CUSTOM_FONT = 'Georgia';

/** Colors an app could give: magenta and teal. */
const EXAMPLE_DIFF_COLORS: DiffwiseDiffColors = {
  light: {
    removedLine: '#fbeefe',
    removedHighlight: '#efc0f6',
    removedAccent: '#a21caf',
    addedLine: '#e6f7f5',
    addedHighlight: '#a5e2d9',
    addedAccent: '#0f766e',
  },
  dark: {
    removedLine: '#2a1730',
    removedHighlight: '#6b2a78',
    removedAccent: '#f0abfc',
    addedLine: '#10251f',
    addedHighlight: '#1f5f55',
    addedAccent: '#5eead4',
  },
};

@Component({
  selector: 'demo-root',
  imports: [ChoiceButtons, DiffwiseHtmlDiff],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly languages = LANGUAGE_CHOICES;
  protected readonly sizes = SIZE_CHOICES;
  protected readonly colorModes = COLOR_MODE_CHOICES;
  protected readonly highlightStyles = HIGHLIGHT_STYLE_CHOICES;
  protected readonly levels = LEVEL_CHOICES;
  protected readonly layouts = LAYOUT_CHOICES;
  protected readonly inlineDiffStyles = INLINE_DIFF_STYLE_CHOICES;
  protected readonly diffWidths = DIFF_WIDTH_CHOICES;
  protected readonly dividerStyles = DIVIDER_STYLE_CHOICES;
  protected readonly gapStyles = GAP_STYLE_CHOICES;
  protected readonly versionHeaderChoices = VERSION_HEADER_CHOICES;
  protected readonly alignments = ALIGNMENT_CHOICES;
  protected readonly lineNumberStyles = LINE_NUMBER_STYLE_CHOICES;
  protected readonly verticalAlignments = VERTICAL_ALIGNMENT_CHOICES;
  protected readonly changeDetailsChoices = CHANGE_DETAILS_CHOICES;
  protected readonly changeDetailsIconStyles = CHANGE_DETAILS_ICON_STYLE_CHOICES;
  protected readonly tooltipColorModes = TOOLTIP_COLOR_MODE_CHOICES;
  protected readonly fonts = FONT_CHOICES;
  protected readonly fontChoices = FontChoice;

  /** Changes the global configuration while the app runs; the panel shows its values. */
  protected readonly diffwise = inject(Diffwise);

  protected readonly language = signal<SampleLanguage>(SampleLanguage.English);
  protected readonly size = signal<SampleSize>(SampleSize.Short);

  /** Width of the diff, which the page narrows to show the automatic layout. */
  protected readonly diffWidth = signal<DiffWidth>(DiffWidth.Full);

  /** Language of the diff interface: the one of the sample, set through an input of the diff. */
  protected readonly interfaceLanguage = computed(() => INTERFACE_LANGUAGES[this.language()]);

  /** The chosen headers; the first choice is set in `app.config.ts`. */
  protected readonly versionHeaders = signal<VersionHeaders>(DiffwiseVersionHeaders.Default);

  /** True while the global configuration has the example colors. */
  protected readonly showsExampleColors = signal(false);

  /** Name of the custom font, kept while another font is chosen. */
  protected readonly customFontName = signal(DEFAULT_CUSTOM_FONT);

  /** The chosen font, from the global configuration. */
  protected readonly fontChoice = computed(() => fontChoiceOf(this.diffwise.config().fontFamily));

  /** The selected pair of sample documents from `test-data/`. */
  protected readonly sample = resource({
    params: () => ({ language: this.language(), size: this.size() }),
    loader: async ({ params, abortSignal }) => {
      const paths = SAMPLE_FILES.map((file) => samplePath(params.language, params.size, file));
      const [oldHtml, newHtml] = await Promise.all(
        paths.map((path) => loadText(path, abortSignal)),
      );

      return { oldHtml, newHtml };
    },
  });

  /** Changes options of the global configuration, as an app can do while it runs. */
  protected update(changes: DiffwiseConfigOptions): void {
    this.diffwise.updateConfig(changes);
  }

  /** Switches the theme with the method of the service for each color mode. */
  protected chooseColorMode(colorMode: DiffwiseColorMode): void {
    switch (colorMode) {
      case DiffwiseColorMode.Light:
        this.diffwise.switchToLightMode();
        break;
      case DiffwiseColorMode.Dark:
        this.diffwise.switchToDarkMode();
        break;
      case DiffwiseColorMode.Auto:
        this.diffwise.switchToAutoMode();
        break;
    }
  }

  protected chooseVersionHeaders(versionHeaders: VersionHeaders): void {
    this.versionHeaders.set(versionHeaders);
    this.update({ versionHeaders });
  }

  /** Gives the example colors to the global configuration, or takes them away with `null`. */
  protected showExampleColors(shown: boolean): void {
    this.showsExampleColors.set(shown);
    this.update({ diffColors: shown ? EXAMPLE_DIFF_COLORS : null });
  }

  protected chooseFont(choice: FontChoice): void {
    this.update({ fontFamily: fontFamilyOf(choice, this.customFontName()) });
  }

  /** Shows the named font at once; the diff ignores a blank name. */
  protected nameCustomFont(event: Event): void {
    const name = (event.target as HTMLInputElement).value;

    this.customFontName.set(name);
    this.update({ fontFamily: name });
  }

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  /** The number in a field; an empty field gives `NaN`, which the diff ignores. */
  protected numberOf(event: Event): number {
    return (event.target as HTMLInputElement).valueAsNumber;
  }
}

/** The font choice that shows a value of the `fontFamily` option. */
function fontChoiceOf(fontFamily: string): FontChoice {
  switch (fontFamily) {
    case DiffwiseFontFamily.Inherit:
      return FontChoice.App;
    case DiffwiseFontFamily.Builtin:
      return FontChoice.Builtin;
    default:
      return FontChoice.Custom;
  }
}

/** The value of the `fontFamily` option for a font choice. */
function fontFamilyOf(choice: FontChoice, customFontName: string): string {
  switch (choice) {
    case FontChoice.App:
      return DiffwiseFontFamily.Inherit;
    case FontChoice.Builtin:
      return DiffwiseFontFamily.Builtin;
    case FontChoice.Custom:
      return customFontName;
  }
}

/** Path of a sample file, such as `test-data/en/short/before.html`. */
function samplePath(language: SampleLanguage, size: SampleSize, file: string): string {
  return [SAMPLES_FOLDER, language, size, file + HTML_EXTENSION].join(PATH_SEPARATOR);
}

async function loadText(path: string, abortSignal: AbortSignal): Promise<string> {
  const response = await fetch(path, { signal: abortSignal });

  if (!response.ok) {
    throw new Error(LOAD_ERROR, { cause: response });
  }

  return response.text();
}
