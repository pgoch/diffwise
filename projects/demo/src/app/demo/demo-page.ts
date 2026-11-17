import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  Diffwise,
  DiffwiseActiveChangeStyle,
  DiffwiseAlignment,
  DiffwiseChangeDetails,
  DiffwiseChangeDetailsIconStyle,
  DiffwiseColorMode,
  type DiffwiseConfig,
  type DiffwiseConfigOptions,
  type DiffwiseDiffColors,
  type DiffwiseDiffStats,
  DiffwiseDividerStyle,
  DiffwiseFontFamily,
  DiffwiseGapStyle,
  DiffwiseHighlightStyle,
  DiffwiseHtml,
  DiffwiseLanguage,
  DiffwiseInlineDiffStyle,
  DiffwiseLayout,
  type DiffwiseLevel,
  DiffwiseLineNumberStyle,
  DiffwiseNoChangesView,
  DiffwisePalette,
  DiffwiseText,
  DiffwiseTextFont,
  DiffwiseTooltipColorMode,
  DiffwiseUserSetting,
  type DiffwiseUserSettings,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
  DiffwiseVerticalAlignment,
} from 'ngx-diffwise';

import type { Choice } from '../choice';
import {
  DiffKind,
  LANGUAGE_CHOICES,
  SIZE_CHOICES,
  type SampleLanguage,
  SampleSize,
  TEXT_LANGUAGE_CHOICES,
  TEXT_SAMPLE_LANGUAGES,
  loadedSample,
} from '../samples';
import { ChoiceButtons } from './choice-buttons';

const DIFF_KIND_CHOICES: readonly Choice<DiffKind>[] = [
  { value: DiffKind.Html, label: 'HTML' },
  { value: DiffKind.Text, label: 'Text' },
];

const COLOR_MODE_CHOICES: readonly Choice<DiffwiseColorMode>[] = [
  { value: DiffwiseColorMode.Light, label: 'Light' },
  { value: DiffwiseColorMode.Dark, label: 'Dark' },
  { value: DiffwiseColorMode.Auto, label: 'Auto' },
];

const PALETTE_CHOICES: readonly Choice<DiffwisePalette>[] = [
  { value: DiffwisePalette.Default, label: 'Standard' },
  { value: DiffwisePalette.Colorblind, label: 'Colorblind-friendly' },
  { value: DiffwisePalette.HighContrast, label: 'High contrast' },
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

/** Versions the demo compares: the two versions of the sample, or its old version with itself. */
const ComparedVersions = {
  Different: 'different',
  Same: 'same',
} as const;

type ComparedVersions = (typeof ComparedVersions)[keyof typeof ComparedVersions];

const COMPARED_VERSIONS_CHOICES: readonly Choice<ComparedVersions>[] = [
  { value: ComparedVersions.Different, label: 'Before and after' },
  { value: ComparedVersions.Same, label: 'Before twice' },
];

const NO_CHANGES_VIEW_CHOICES: readonly Choice<DiffwiseNoChangesView>[] = [
  { value: DiffwiseNoChangesView.Message, label: 'Message' },
  { value: DiffwiseNoChangesView.Document, label: 'Document once' },
  { value: DiffwiseNoChangesView.Diff, label: 'Diff' },
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

const ACTIVE_CHANGE_STYLE_CHOICES: readonly Choice<DiffwiseActiveChangeStyle>[] = [
  { value: DiffwiseActiveChangeStyle.Outline, label: 'Outline' },
  { value: DiffwiseActiveChangeStyle.Indicator, label: 'Indicator' },
];

/** Name of the localStorage entry where the demo keeps its "Remember choices" box. */
const REMEMBER_CHOICES_ENTRY = 'diffwise-demo:remember-choices';

/** Value of the entry while the box is ticked. */
const TICKED = 'true';

/** Error under the field of the choices when its text is not JSON. */
const NOT_JSON_ERROR = 'The text is not JSON.';

/** Spaces before each level of the exported choices. */
const JSON_INDENT = 2;

/** Options the user can change in the view settings of the diff, in the order they show there. */
const USER_SETTING_CHOICES: readonly Choice<DiffwiseUserSetting>[] = [
  { value: DiffwiseUserSetting.ColorMode, label: 'Theme' },
  { value: DiffwiseUserSetting.DiffPalette, label: 'Colors of changes' },
  { value: DiffwiseUserSetting.TextFont, label: 'Text font' },
  { value: DiffwiseUserSetting.Layout, label: 'Layout' },
  { value: DiffwiseUserSetting.InlineDiffStyle, label: 'Changes in a single column' },
  { value: DiffwiseUserSetting.HideUnchangedLines, label: 'Hide unchanged lines' },
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

/** The header choice that hides the headers, with the option `showVersionHeaders`. */
const NO_HEADERS = 'none';

/** A choice of the headers: a value of the `versionHeaders` option, or no headers. */
type VersionHeaders = DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts | typeof NO_HEADERS;

/** Header texts that show how an app can name its versions. */
const CUSTOM_HEADER_TEXTS: DiffwiseVersionHeaderTexts = {
  old: 'Version 3 · 12.10.2026',
  new: 'Version 4 · 05.11.2026',
};

const VERSION_HEADER_CHOICES: readonly Choice<VersionHeaders>[] = [
  { value: DiffwiseVersionHeaders.Default, label: 'Default' },
  { value: DiffwiseVersionHeaders.Icons, label: 'Icons' },
  { value: CUSTOM_HEADER_TEXTS, label: 'Custom texts' },
  { value: NO_HEADERS, label: 'None' },
];

/** What `typeof` gives for header texts, which are an object. */
const OBJECT_TYPE = 'object';

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

const TEXT_FONT_CHOICES: readonly Choice<DiffwiseTextFont>[] = [
  { value: DiffwiseTextFont.Monospace, label: 'Fixed width' },
  { value: DiffwiseTextFont.Proportional, label: 'Regular' },
];

const FONT_CHOICES: readonly Choice<FontChoice>[] = [
  { value: FontChoice.App, label: 'App' },
  { value: FontChoice.Builtin, label: 'Built-in' },
  { value: FontChoice.Custom, label: 'Custom' },
];

/** The buttons of each group of the panel. */
const PANEL_CHOICES = {
  diffKinds: DIFF_KIND_CHOICES,
  interfaceLanguages: LANGUAGE_CHOICES,
  sizes: SIZE_CHOICES,
  comparedVersions: COMPARED_VERSIONS_CHOICES,
  colorModes: COLOR_MODE_CHOICES,
  palettes: PALETTE_CHOICES,
  highlightStyles: HIGHLIGHT_STYLE_CHOICES,
  levels: LEVEL_CHOICES,
  layouts: LAYOUT_CHOICES,
  diffWidths: DIFF_WIDTH_CHOICES,
  inlineDiffStyles: INLINE_DIFF_STYLE_CHOICES,
  dividerStyles: DIVIDER_STYLE_CHOICES,
  gapStyles: GAP_STYLE_CHOICES,
  versionHeaders: VERSION_HEADER_CHOICES,
  alignments: ALIGNMENT_CHOICES,
  lineNumberStyles: LINE_NUMBER_STYLE_CHOICES,
  verticalAlignments: VERTICAL_ALIGNMENT_CHOICES,
  changeDetails: CHANGE_DETAILS_CHOICES,
  changeDetailsIconStyles: CHANGE_DETAILS_ICON_STYLE_CHOICES,
  tooltipColorModes: TOOLTIP_COLOR_MODE_CHOICES,
  fonts: FONT_CHOICES,
  textFonts: TEXT_FONT_CHOICES,
  activeChangeStyles: ACTIVE_CHANGE_STYLE_CHOICES,
  noChangesViews: NO_CHANGES_VIEW_CHOICES,
  userSettings: USER_SETTING_CHOICES,
} as const;

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

/**
 * The demo: a sample in a diff, and a panel with every option of the global configuration. The
 * panel starts from the configuration, so it shows the options set before, also on another visit.
 */
@Component({
  selector: 'demo-demo-page',
  imports: [ChoiceButtons, DiffwiseHtml, DiffwiseText],
  templateUrl: './demo-page.html',
  styleUrl: './demo-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoPage {
  /** The buttons of each group of the panel. */
  protected readonly choices = PANEL_CHOICES;

  /** Kinds of diff, for the template. */
  protected readonly diffKinds = DiffKind;

  /** Fonts of the panel, for the template. */
  protected readonly fontChoices = FontChoice;

  /** Changes the global configuration while the app runs; the panel shows its values. */
  protected readonly diffwise = inject(Diffwise);

  /** The kind of diff, which compares the HTML samples or the plain text samples. */
  protected readonly diffKind = signal<DiffKind>(DiffKind.Html);

  /** Languages of the samples of the kind of diff. */
  protected readonly languages = computed(() =>
    this.diffKind() === DiffKind.Text ? TEXT_LANGUAGE_CHOICES : LANGUAGE_CHOICES,
  );

  /** Language of the sample. */
  protected readonly language = signal<SampleLanguage>(DiffwiseLanguage.EN);

  /** Size of the sample. */
  protected readonly size = signal<SampleSize>(SampleSize.Short);

  /** The versions the diff compares; the same ones show what a diff of identical versions shows. */
  protected readonly comparedVersions = signal<ComparedVersions>(ComparedVersions.Different);

  /** True when the diff compares the old version of the sample with itself. */
  protected readonly comparesSameVersions = computed(
    () => this.comparedVersions() === ComparedVersions.Same,
  );

  /** Width of the diff, which the page narrows to show the automatic layout. */
  protected readonly diffWidth = signal<DiffWidth>(DiffWidth.Full);

  /**
   * Language of the diff interface, set through an input of the diff: the one of the sample, until
   * the panel chooses another.
   */
  protected readonly interfaceLanguage = signal<DiffwiseLanguage>(DiffwiseLanguage.EN);

  /** The chosen headers; the first choice is set in `app.config.ts`. */
  protected readonly versionHeaders = signal<VersionHeaders>(
    versionHeadersChoiceOf(this.diffwise.config()),
  );

  /** The numbers of the last comparison, from the event of the diff. */
  protected readonly lastStats = signal<DiffwiseDiffStats | null>(null);

  /** The choices of the user from the last event of the diff, as the app could keep them. */
  protected readonly lastUserSettings = signal<DiffwiseUserSettings | null>(null);

  /** The last choices of the user as text. */
  protected readonly lastUserSettingsText = computed(() => JSON.stringify(this.lastUserSettings()));

  /** The choices of the user as JSON: from "Export", or written for "Import". */
  protected readonly choicesText = signal('');

  /** Why the last import failed; `null` after an import that worked. */
  protected readonly choicesError = signal<string | null>(null);

  /** The diff of an HTML sample, while it shows. */
  private readonly htmlDiff = viewChild(DiffwiseHtml);

  /** The diff of a plain text sample, while it shows. */
  private readonly textDiff = viewChild(DiffwiseText);

  /** The diff of the sample, whose methods step between the blocks of changes. */
  private readonly diff = computed(() => this.htmlDiff() ?? this.textDiff());

  /** True while the global configuration has the example colors. */
  protected readonly showsExampleColors = signal(hasDiffColors(this.diffwise.config().diffColors));

  /** Name of the custom font, kept while another font is chosen. */
  protected readonly customFontName = signal(customFontNameOf(this.diffwise.config().fontFamily));

  /** The chosen font, from the global configuration. */
  protected readonly fontChoice = computed(() => fontChoiceOf(this.diffwise.config().fontFamily));

  /** The selected pair of samples from `test-data/`, HTML documents or plain texts, as it loads. */
  private readonly loaded = loadedSample(() => ({
    kind: this.diffKind(),
    language: this.language(),
    size: this.size(),
  }));

  /** The selected pair of samples; its error tells when it could not be loaded. */
  protected readonly sample = this.loaded.sample;

  /** The last loaded pair of samples, which stays while another one loads. */
  protected readonly shownSample = this.loaded.shownSample;

  constructor() {
    this.update({ rememberUserSettings: demoRemembersChoices() });
  }

  /** Changes options of the global configuration, as an app can do while it runs. */
  protected update(changes: DiffwiseConfigOptions): void {
    this.diffwise.updateConfig(changes);
  }

  /** Steps to the previous block of changes with the method of the diff, as an app can. */
  protected goToPreviousChange(): void {
    this.diff()?.goToPreviousChange();
  }

  /** Steps to the next block of changes with the method of the diff, as an app can. */
  protected goToNextChange(): void {
    this.diff()?.goToNextChange();
  }

  /** True when the user can change the option in the view settings of the diff. */
  protected isAllowed(setting: DiffwiseUserSetting): boolean {
    return this.diffwise.config().allowedUserSettings.includes(setting);
  }

  /** Lets the user change the option in the view settings of the diff, or takes it away. */
  protected allowUserSetting(setting: DiffwiseUserSetting, allowed: boolean): void {
    const allowedUserSettings = USER_SETTING_CHOICES.map(({ value }) => value).filter((option) =>
      option === setting ? allowed : this.isAllowed(option),
    );

    this.update({ allowedUserSettings });
  }

  /**
   * Lets the diff remember the choices of the user in localStorage. The demo keeps the box too,
   * so the diff reads the choices back after a reload.
   */
  protected rememberChoices(remembers: boolean): void {
    this.update({ rememberUserSettings: remembers });
    keepDemoRemembersChoices(remembers);
  }

  /** Puts the choices of the user in the field, as an app could keep them in the account of the user. */
  protected exportChoices(): void {
    const settings = this.diffwise.exportUserSettings();

    this.choicesText.set(JSON.stringify(settings, null, JSON_INDENT));
    this.choicesError.set(null);
  }

  /** Gives the user the choices from the field, as an app could after the user signs in. */
  protected importChoices(): void {
    let settings: DiffwiseUserSettings;

    try {
      settings = JSON.parse(this.choicesText());
    } catch {
      this.choicesError.set(NOT_JSON_ERROR);
      return;
    }

    this.choicesError.set(null);
    this.diffwise.importUserSettings(settings);
  }

  /** Takes back every choice of the user, also from localStorage. */
  protected resetChoices(): void {
    this.diffwise.resetUserSettings();
  }

  /**
   * Shows the samples of the kind of diff; a language without plain text samples gives way to
   * English. The language of the interface stays.
   */
  protected chooseDiffKind(kind: DiffKind): void {
    const hasSamples = kind === DiffKind.Html || TEXT_SAMPLE_LANGUAGES.includes(this.language());

    this.diffKind.set(kind);

    if (!hasSamples) {
      this.language.set(DiffwiseLanguage.EN);
    }
  }

  /** Shows the sample in the chosen language, with the interface in the same language. */
  protected chooseSampleLanguage(event: Event): void {
    const language = selectedValueOf(event) as SampleLanguage;

    this.language.set(language);
    this.interfaceLanguage.set(language);
  }

  /** Sets the language of the diff interface through the input of the diff. */
  protected chooseInterfaceLanguage(event: Event): void {
    this.interfaceLanguage.set(selectedValueOf(event) as DiffwiseLanguage);
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

  /** Shows the chosen headers in the diff, or hides them. */
  protected chooseVersionHeaders(choice: VersionHeaders): void {
    const options =
      choice === NO_HEADERS
        ? { showVersionHeaders: false }
        : { showVersionHeaders: true, versionHeaders: choice };

    this.versionHeaders.set(choice);
    this.update(options);
  }

  /** Gives the example colors to the global configuration, or takes them away with `null`. */
  protected showExampleColors(shown: boolean): void {
    const diffColors = shown ? EXAMPLE_DIFF_COLORS : null;

    this.showsExampleColors.set(shown);
    this.update({ diffColors });
  }

  /** Shows the chosen font in the diff. */
  protected chooseFont(choice: FontChoice): void {
    this.update({ fontFamily: fontFamilyOf(choice, this.customFontName()) });
  }

  /** Shows the named font at once; the diff ignores a blank name. */
  protected nameCustomFont(event: Event): void {
    const name = (event.target as HTMLInputElement).value;

    this.customFontName.set(name);
    this.update({ fontFamily: name });
  }

  /** The text of a text field. */
  protected textOf(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  /** True when the checkbox of the event is ticked. */
  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  /** The number in a field; an empty field gives `NaN`, which the diff ignores. */
  protected numberOf(event: Event): number {
    return (event.target as HTMLInputElement).valueAsNumber;
  }
}

/** The header choice of a configuration; texts of the app are the example texts. */
function versionHeadersChoiceOf({
  showVersionHeaders,
  versionHeaders,
}: DiffwiseConfig): VersionHeaders {
  if (!showVersionHeaders) {
    return NO_HEADERS;
  }

  return typeof versionHeaders === OBJECT_TYPE ? CUSTOM_HEADER_TEXTS : versionHeaders;
}

/** True when an app gives colors for the light theme or for the dark one. */
function hasDiffColors({ light, dark }: DiffwiseDiffColors): boolean {
  return light !== undefined || dark !== undefined;
}

/** The custom font of the configuration, or the default custom font when another font is set. */
function customFontNameOf(fontFamily: string): string {
  const isCustom = fontChoiceOf(fontFamily) === FontChoice.Custom;

  return isCustom ? fontFamily : DEFAULT_CUSTOM_FONT;
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

/** True when the "Remember choices" box was ticked before the reload. */
function demoRemembersChoices(): boolean {
  try {
    return localStorage.getItem(REMEMBER_CHOICES_ENTRY) === TICKED;
  } catch {
    return false;
  }
}

/** Keeps the "Remember choices" box for the next reload. */
function keepDemoRemembersChoices(remembers: boolean): void {
  try {
    if (remembers) {
      localStorage.setItem(REMEMBER_CHOICES_ENTRY, TICKED);
    } else {
      localStorage.removeItem(REMEMBER_CHOICES_ENTRY);
    }
  } catch {
    // Without localStorage the box stays only until the reload.
  }
}

/** The value of the option chosen in a list. */
function selectedValueOf(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}
