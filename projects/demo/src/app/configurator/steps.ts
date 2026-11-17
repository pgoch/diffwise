import {
  DiffwiseActiveChangeStyle,
  DiffwiseAlignment,
  DiffwiseChangeDetails,
  DiffwiseChangeDetailsIconStyle,
  DiffwiseColorMode,
  type DiffwiseConfigOptions,
  DiffwiseDividerStyle,
  DiffwiseGapStyle,
  DiffwiseHighlightStyle,
  DiffwiseInlineDiffStyle,
  DiffwiseLanguage,
  DiffwiseLayout,
  type DiffwiseLevel,
  DiffwiseLineNumberStyle,
  DiffwiseNoChangesView,
  DiffwisePalette,
  DiffwiseTextFont,
  DiffwiseTooltipColorMode,
  DiffwiseVerticalAlignment,
} from 'ngx-diffwise';

import type { Choice } from '../choice';
import { DiffKind, LANGUAGE_CHOICES } from '../samples';

/** Steps of the configurator, in the order of the sections of `docs/configuration.md`. */
export const StepId = {
  Diffs: 'diffs',
  Colors: 'colors',
  Lines: 'lines',
  Layout: 'layout',
  ChangeDetails: 'changeDetails',
  Fonts: 'fonts',
  Toolbar: 'toolbar',
  IdenticalVersions: 'identicalVersions',
  Comparison: 'comparison',
  Language: 'language',
  ViewSettings: 'viewSettings',
  Result: 'result',
} as const;

export type StepId = (typeof StepId)[keyof typeof StepId];

/** The name of an option of the configuration. */
export type OptionName = keyof DiffwiseConfigOptions;

/** How a step shows an option. */
export const OptionKind = {
  /** A button for each value. */
  Buttons: 'buttons',
  /** A number field. */
  Number: 'number',
  /** A text field; an empty one gives `null`. */
  Text: 'text',
  /** A list to choose from. */
  List: 'list',
  /** Buttons for the fonts, and a field for the name of a font of the app. */
  Font: 'font',
  /** Buttons for the headers, and two fields for texts of the app. */
  VersionHeaders: 'versionHeaders',
  /** A check box for each option the user can change. */
  UserSettings: 'userSettings',
  /** Six colors of changes in the light and in the dark theme. */
  Colors: 'colors',
  /** The texts of the interface, in groups. */
  Texts: 'texts',
} as const;

export type OptionKind = (typeof OptionKind)[keyof typeof OptionKind];

/** When an option that depends on another one works, and the note that says so otherwise. */
export interface OptionCondition {
  readonly option: OptionName;
  /** The value of the other option with which this one works. */
  readonly value: unknown;
  readonly note: string;
}

/** An option of a step. */
export interface StepOption {
  readonly kind: OptionKind;
  readonly name: OptionName;
  /** Name of the option as people say it, such as "Theme". */
  readonly label: string;
  /** One sentence: what the option does. */
  readonly description: string;
  /** The diffs the option works in; an app without any of them does not see it. */
  readonly diffKinds: readonly DiffKind[];
  /** The values of buttons and lists, in their order. */
  readonly choices: readonly Choice<unknown>[];
  /** When the option works; `null` for an option that always does. */
  readonly enabledWhen: OptionCondition | null;
  /** Limits and unit of a number field, or an example of a text field. */
  readonly field: OptionField | null;
}

/** Limits and unit of a number field, or an example in an empty text field. */
export interface OptionField {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly unit?: string;
  readonly placeholder?: string;
}

/** A step of the configurator. */
export interface ConfiguratorStep {
  readonly id: StepId;
  /** Name in the bar of steps and in the heading of the step. */
  readonly label: string;
  /** One sentence under the heading: what the step sets. */
  readonly description: string;
  /** The diffs whose options the step has; an app without any of them skips the step. */
  readonly diffKinds: readonly DiffKind[];
  /** The options of the step, in their order. */
  readonly options: readonly StepOption[];
  /** When the step works; `null` for a step that always does. */
  readonly enabledWhen: OptionCondition | null;
}

/** Both diffs. */
const ALL_DIFFS: readonly DiffKind[] = [DiffKind.Html, DiffKind.Text];

const HTML_DIFF: readonly DiffKind[] = [DiffKind.Html];
const TEXT_DIFF: readonly DiffKind[] = [DiffKind.Text];

const ON_OFF: readonly Choice<boolean>[] = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
];

const SHOWN_HIDDEN: readonly Choice<boolean>[] = [
  { value: true, label: 'Shown' },
  { value: false, label: 'Hidden' },
];

/** Levels of the intensity and the contrast, from the weakest to the strongest. */
const LEVELS: readonly Choice<DiffwiseLevel>[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

const ALIGNMENTS: readonly Choice<DiffwiseAlignment>[] = [
  { value: DiffwiseAlignment.Start, label: 'Start' },
  { value: DiffwiseAlignment.Center, label: 'Center' },
  { value: DiffwiseAlignment.End, label: 'End' },
];

/** Options of the headers work only while the diff shows headers. */
const WITH_HEADERS: OptionCondition = {
  option: 'showVersionHeaders',
  value: true,
  note: 'Only with the headers shown.',
};

/** Options of the toolbar work only while the diff shows it. */
const WITH_TOOLBAR: OptionCondition = {
  option: 'showToolbar',
  value: true,
  note: 'Only with the toolbar shown.',
};

/** Limits of the font sizes, in rem. */
const FONT_SIZE_FIELD: OptionField = { min: 0.5, max: 10, step: 0.05, unit: 'rem' };

/** The interface languages: the one of the app, or one of twelve, each named in itself. */
const LANGUAGES: readonly Choice<DiffwiseLanguage>[] = [
  { value: DiffwiseLanguage.Auto, label: 'Auto: the language of your app' },
  ...LANGUAGE_CHOICES,
];

/** An option with buttons, in both diffs, that always works, unless the parts say otherwise. */
function option(
  parts: Partial<StepOption> & Pick<StepOption, 'name' | 'label' | 'description'>,
): StepOption {
  const base = {
    kind: OptionKind.Buttons,
    diffKinds: ALL_DIFFS,
    choices: [],
    enabledWhen: null,
    field: null,
  };

  return { ...base, ...parts } as StepOption;
}

const COLOR_OPTIONS: readonly StepOption[] = [
  option({
    name: 'colorMode',
    label: 'Theme',
    description: 'Light or dark. Auto follows the system, or the dark mode of your app.',
    choices: [
      { value: DiffwiseColorMode.Auto, label: 'Auto' },
      { value: DiffwiseColorMode.Light, label: 'Light' },
      { value: DiffwiseColorMode.Dark, label: 'Dark' },
    ],
  }),
  option({
    kind: OptionKind.Text,
    name: 'darkModeSelector',
    label: 'Dark mode of your app',
    description: 'A CSS selector that matches your app in its dark mode; empty follows the system.',
    field: { placeholder: '.dark' },
    enabledWhen: {
      option: 'colorMode',
      value: DiffwiseColorMode.Auto,
      note: 'Only with the theme Auto.',
    },
  }),
  option({
    name: 'diffPalette',
    label: 'Colors of changes',
    description:
      'Red and green, orange and blue for colorblind readers, or high contrast without colored backgrounds.',
    choices: [
      { value: DiffwisePalette.Default, label: 'Standard' },
      { value: DiffwisePalette.Colorblind, label: 'Colorblind-friendly' },
      { value: DiffwisePalette.HighContrast, label: 'High contrast' },
    ],
  }),
  option({
    name: 'highlightStyle',
    label: 'Changed words',
    description: 'How changed words are marked; the text never moves.',
    choices: [
      { value: DiffwiseHighlightStyle.Outline, label: 'Outline' },
      { value: DiffwiseHighlightStyle.Background, label: 'Background' },
      { value: DiffwiseHighlightStyle.Underline, label: 'Underline' },
      { value: DiffwiseHighlightStyle.TopBottom, label: 'Top and bottom' },
    ],
  }),
  option({
    name: 'diffIntensity',
    label: 'Intensity',
    description: 'How strong the colors of changes are.',
    choices: LEVELS,
  }),
  option({
    name: 'uiContrast',
    label: 'Contrast of the interface',
    description:
      'How much the headers, the line numbers and the column between the versions stand out.',
    choices: LEVELS,
  }),
  option({
    kind: OptionKind.Colors,
    name: 'diffColors',
    label: 'Your own colors',
    description:
      'Colors of changes of your app; a color left out comes from the colors of changes above.',
  }),
];

const LINE_OPTIONS: readonly StepOption[] = [
  option({
    name: 'showLineNumbers',
    label: 'Line numbers',
    description: 'The number of each line; each version is numbered from 1.',
    choices: SHOWN_HIDDEN,
  }),
  option({
    name: 'lineNumberStyle',
    label: 'Numbers of changed lines',
    description: 'A colored number with a bar, or a colored background.',
    choices: [
      { value: DiffwiseLineNumberStyle.Bar, label: 'Colored bar' },
      { value: DiffwiseLineNumberStyle.Background, label: 'Colored background' },
    ],
  }),
  option({
    name: 'lineNumberAlignment',
    label: 'Numbers in their lines',
    description: 'Where a number sits next to a line of several rows.',
    choices: [
      { value: DiffwiseVerticalAlignment.Top, label: 'Top' },
      { value: DiffwiseVerticalAlignment.Middle, label: 'Middle' },
      { value: DiffwiseVerticalAlignment.Bottom, label: 'Bottom' },
    ],
  }),
  option({
    name: 'highlightChangedLines',
    label: 'Background of changed lines',
    description: 'A light background for each changed line.',
    choices: ON_OFF,
  }),
  option({
    name: 'highlightWholeLines',
    label: 'Whole added and removed lines',
    description: 'Marks an added or a removed line as a whole, like changed words.',
    choices: ON_OFF,
    enabledWhen: {
      option: 'highlightChangedLines',
      value: false,
      note: 'Only without the background of changed lines.',
    },
  }),
  option({
    name: 'hideUnchangedLines',
    label: 'Hide unchanged lines',
    description: 'Hides unchanged lines far from changes behind a bar that shows them.',
    choices: ON_OFF,
  }),
  option({
    kind: OptionKind.Number,
    name: 'contextLines',
    label: 'Lines around changes',
    description: 'Unchanged lines that stay shown above and below each change.',
    field: { min: 1, max: 100, step: 1, unit: 'lines' },
    enabledWhen: {
      option: 'hideUnchangedLines',
      value: true,
      note: 'Only when unchanged lines are hidden.',
    },
  }),
];

const LAYOUT_OPTIONS: readonly StepOption[] = [
  option({
    name: 'layout',
    label: 'Layout',
    description:
      'The versions side by side, a single column, or Auto: one column in a narrow diff.',
    choices: [
      { value: DiffwiseLayout.Auto, label: 'Auto' },
      { value: DiffwiseLayout.SideBySide, label: 'Side by side' },
      { value: DiffwiseLayout.Inline, label: 'Single column' },
    ],
  }),
  option({
    kind: OptionKind.Number,
    name: 'layoutBreakpoint',
    label: 'Width of a narrow diff',
    description: 'The width of the diff under which Auto shows a single column.',
    field: { min: 1, step: 1, unit: 'px' },
    enabledWhen: {
      option: 'layout',
      value: DiffwiseLayout.Auto,
      note: 'Only with the layout Auto.',
    },
  }),
  option({
    name: 'inlineDiffStyle',
    label: 'Changes in a single column',
    description:
      'Removed text right before the added text, the same struck through, or the old line above the new one.',
    choices: [
      { value: DiffwiseInlineDiffStyle.Merged, label: 'Merged' },
      { value: DiffwiseInlineDiffStyle.Strikethrough, label: 'Struck through' },
      { value: DiffwiseInlineDiffStyle.Stacked, label: 'Stacked' },
    ],
  }),
  option({
    name: 'dividerStyle',
    label: 'Between the versions',
    description: 'A gray column or a thin line.',
    choices: [
      { value: DiffwiseDividerStyle.Column, label: 'Gray column' },
      { value: DiffwiseDividerStyle.Line, label: 'Line' },
    ],
  }),
  option({
    name: 'gapStyle',
    label: 'Opposite added and removed lines',
    description: 'What fills the place opposite an added or a removed line.',
    choices: [
      { value: DiffwiseGapStyle.Stripes, label: 'Stripes' },
      { value: DiffwiseGapStyle.Gray, label: 'Gray' },
      { value: DiffwiseGapStyle.Empty, label: 'Empty' },
    ],
  }),
  option({
    name: 'showVersionHeaders',
    label: 'Headers',
    description: 'The headers above the two versions.',
    choices: SHOWN_HIDDEN,
  }),
  option({
    kind: OptionKind.VersionHeaders,
    name: 'versionHeaders',
    label: 'Header content',
    description: 'The names of the versions, icons named by them, or texts of your app.',
    enabledWhen: WITH_HEADERS,
  }),
  option({
    name: 'versionHeaderAlignment',
    label: 'Header alignment',
    description: 'Where the headers sit in their columns.',
    choices: ALIGNMENTS,
    enabledWhen: WITH_HEADERS,
  }),
];

const CHANGE_DETAIL_OPTIONS: readonly StepOption[] = [
  option({
    name: 'changeDetails',
    label: 'Where details show',
    description: 'In a tooltip of the marked change, from an icon between the versions, or both.',
    diffKinds: HTML_DIFF,
    choices: [
      { value: DiffwiseChangeDetails.Hover, label: 'Tooltip on the change' },
      { value: DiffwiseChangeDetails.Icon, label: 'Icon in the middle' },
      { value: DiffwiseChangeDetails.Both, label: 'Both' },
    ],
  }),
  option({
    name: 'changeDetailsIconStyle',
    label: 'Icons in the middle',
    description: 'A gray frame, a frame with a gradient, or a full gradient.',
    diffKinds: HTML_DIFF,
    choices: [
      { value: DiffwiseChangeDetailsIconStyle.Plain, label: 'Gray frame' },
      { value: DiffwiseChangeDetailsIconStyle.Gradient, label: 'Gradient frame' },
      { value: DiffwiseChangeDetailsIconStyle.Filled, label: 'Full gradient' },
    ],
  }),
  option({
    name: 'tooltipColorMode',
    label: 'Tooltip colors',
    description: 'The colors of the diff, or those of the opposite theme.',
    diffKinds: HTML_DIFF,
    choices: [
      { value: DiffwiseTooltipColorMode.Component, label: 'Colors of the diff' },
      { value: DiffwiseTooltipColorMode.Reversed, label: 'Reversed' },
    ],
  }),
  option({
    name: 'highlightTooltipChanges',
    label: 'Highlight the changed part',
    description: 'The part of a link address, a file name or an alternative text that changed.',
    diffKinds: HTML_DIFF,
    choices: ON_OFF,
  }),
  option({
    name: 'tooltipTitleAlignment',
    label: 'Tooltip title',
    description: 'Where the titles of the tooltips sit.',
    diffKinds: HTML_DIFF,
    choices: ALIGNMENTS,
  }),
];

const FONT_OPTIONS: readonly StepOption[] = [
  option({
    kind: OptionKind.Font,
    name: 'fontFamily',
    label: 'Font',
    description: 'The font around the diff, the font of the system, or a font your app loads.',
  }),
  option({
    name: 'textFont',
    label: 'Text font',
    description: 'The font of the lines of plain text; fixed width keeps columns in line.',
    diffKinds: TEXT_DIFF,
    choices: [
      { value: DiffwiseTextFont.Monospace, label: 'Fixed width' },
      { value: DiffwiseTextFont.Proportional, label: 'Regular' },
    ],
  }),
  option({
    kind: OptionKind.Number,
    name: 'versionHeaderFontSize',
    label: 'Header size',
    description: 'Font size of the headers, from 0.5 to 10.',
    field: FONT_SIZE_FIELD,
    enabledWhen: WITH_HEADERS,
  }),
  option({
    kind: OptionKind.Number,
    name: 'lineNumberFontSize',
    label: 'Line number size',
    description: 'Font size of the line numbers, from 0.5 to 10; their column grows with it.',
    field: FONT_SIZE_FIELD,
  }),
  option({
    kind: OptionKind.Number,
    name: 'tooltipFontSize',
    label: 'Tooltip size',
    description: 'Font size of the tooltips, from 0.5 to 10.',
    field: FONT_SIZE_FIELD,
  }),
  option({
    kind: OptionKind.Number,
    name: 'toolbarFontSize',
    label: 'Toolbar size',
    description: 'Font size of the toolbar and the view settings, from 0.5 to 10.',
    field: FONT_SIZE_FIELD,
  }),
];

const TOOLBAR_OPTIONS: readonly StepOption[] = [
  option({
    name: 'showToolbar',
    label: 'Toolbar',
    description:
      'The bar above the diff with the arrows, the numbers of changes and the view settings.',
    choices: SHOWN_HIDDEN,
  }),
  option({
    name: 'showNavigationToolbar',
    label: 'Arrows between changes',
    description: 'Arrows to the previous and the next change, with a counter, such as 2 / 3.',
    choices: SHOWN_HIDDEN,
    enabledWhen: WITH_TOOLBAR,
  }),
  option({
    name: 'activeChangeStyle',
    label: 'Active change',
    description: 'How the change the arrows stepped to shows: in a frame, or with an arrow.',
    choices: [
      { value: DiffwiseActiveChangeStyle.Outline, label: 'Outline' },
      { value: DiffwiseActiveChangeStyle.Indicator, label: 'Indicator' },
    ],
    enabledWhen: WITH_TOOLBAR,
  }),
  option({
    name: 'showDiffStats',
    label: 'Numbers of changes',
    description: 'The numbers of added, removed and changed lines, such as +3 −1 ~10.',
    choices: SHOWN_HIDDEN,
    enabledWhen: WITH_TOOLBAR,
  }),
];

const IDENTICAL_VERSION_OPTIONS: readonly StepOption[] = [
  option({
    name: 'noChangesView',
    label: 'Identical versions',
    description: 'What stands under "No changes": nothing, the document once, or both versions.',
    choices: [
      { value: DiffwiseNoChangesView.Message, label: 'Message' },
      { value: DiffwiseNoChangesView.Document, label: 'Document once' },
      { value: DiffwiseNoChangesView.Diff, label: 'Diff' },
    ],
  }),
];

const COMPARISON_OPTIONS: readonly StepOption[] = [
  option({
    name: 'ignoreWhitespace',
    label: 'Ignore whitespace',
    description: 'Differences in spaces, tabs and line breaks are not changes.',
    choices: ON_OFF,
  }),
  option({
    name: 'ignoreCase',
    label: 'Ignore letter case',
    description: 'Differences between capital and small letters are not changes.',
    choices: ON_OFF,
  }),
  option({
    name: 'ignoreFormatting',
    label: 'Ignore formatting',
    description: 'Changes of formatting alone, such as italic → bold, are not changes.',
    diffKinds: HTML_DIFF,
    choices: ON_OFF,
  }),
  option({
    name: 'ignoreLinkChanges',
    label: 'Ignore link changes',
    description: 'Links added, removed or pointing elsewhere around the same text are not changes.',
    diffKinds: HTML_DIFF,
    choices: ON_OFF,
  }),
];

const LANGUAGE_OPTIONS: readonly StepOption[] = [
  option({
    kind: OptionKind.List,
    name: 'language',
    label: 'Language',
    description: 'The language of the interface; Auto takes it from LOCALE_ID of your app.',
    choices: LANGUAGES,
  }),
  option({
    kind: OptionKind.Texts,
    name: 'customTexts',
    label: 'Your own texts',
    description:
      'Texts of the interface of your app; an empty field keeps the text of the language.',
  }),
];

const VIEW_SETTING_OPTIONS: readonly StepOption[] = [
  option({
    kind: OptionKind.UserSettings,
    name: 'allowedUserSettings',
    label: 'Options for the user',
    description: 'What users can change in the view settings; none hides their button.',
  }),
  option({
    name: 'rememberUserSettings',
    label: 'Remember choices',
    description: 'Keeps the choices of users in localStorage, so they stay after a reload.',
    choices: ON_OFF,
  }),
  option({
    kind: OptionKind.Text,
    name: 'userSettingsKey',
    label: 'Key of the choices',
    description: 'Diffs with one key share the choices; empty takes the base path of your app.',
    field: { placeholder: 'contract-history' },
  }),
];

/** Every step, for an app with both diffs. */
export const STEPS: readonly ConfiguratorStep[] = [
  {
    id: StepId.Diffs,
    label: 'Your diffs',
    description: 'Which diffs your app shows, and a sample to preview them.',
    diffKinds: ALL_DIFFS,
    options: [],
    enabledWhen: null,
  },
  {
    id: StepId.Colors,
    label: 'Colors',
    description: 'Theme, colors of changes and how they are marked.',
    diffKinds: ALL_DIFFS,
    options: COLOR_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.Lines,
    label: 'Lines',
    description: 'Line numbers, the background of changed lines, and hiding unchanged lines.',
    diffKinds: ALL_DIFFS,
    options: LINE_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.Layout,
    label: 'Layout',
    description: 'Two columns or one, and what stands between and above the versions.',
    diffKinds: ALL_DIFFS,
    options: LAYOUT_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.ChangeDetails,
    label: 'Change details',
    description: 'Tooltips and icons of changes besides the text.',
    diffKinds: HTML_DIFF,
    options: CHANGE_DETAIL_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.Fonts,
    label: 'Fonts',
    description: 'The font of the diff and the sizes of its parts.',
    diffKinds: ALL_DIFFS,
    options: FONT_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.Toolbar,
    label: 'Toolbar',
    description:
      'The bar above the diff, its arrows that step through the changes, and numbers of changes.',
    diffKinds: ALL_DIFFS,
    options: TOOLBAR_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.IdenticalVersions,
    label: 'Identical versions',
    description:
      'What the diff shows when the versions are the same. The preview compares the sample with itself here.',
    diffKinds: ALL_DIFFS,
    options: IDENTICAL_VERSION_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.Comparison,
    label: 'Comparison',
    description: 'What the comparison ignores, such as whitespace or letter case.',
    diffKinds: ALL_DIFFS,
    options: COMPARISON_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.Language,
    label: 'Language and texts',
    description: 'The language of the interface, and texts of your own.',
    diffKinds: ALL_DIFFS,
    options: LANGUAGE_OPTIONS,
    enabledWhen: null,
  },
  {
    id: StepId.ViewSettings,
    label: 'View settings',
    description: 'What users can change themselves, and whether their choices stay after a reload.',
    diffKinds: ALL_DIFFS,
    options: VIEW_SETTING_OPTIONS,
    enabledWhen: WITH_TOOLBAR,
  },
  {
    id: StepId.Result,
    label: 'Result',
    description:
      'Copy the configuration into app.config.ts of your app. Options with their defaults are left out.',
    diffKinds: ALL_DIFFS,
    options: [],
    enabledWhen: null,
  },
];
