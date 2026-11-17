import { DiffKind } from '../samples';

/** Steps of the configurator, in the order of the sections of `docs/configuration.md`. */
export const StepId = {
  Diffs: 'diffs',
  Colors: 'colors',
  Lines: 'lines',
  Layout: 'layout',
  ChangeDetails: 'changeDetails',
  Fonts: 'fonts',
  Toolbar: 'toolbar',
  Comparison: 'comparison',
  Language: 'language',
  ViewSettings: 'viewSettings',
  Result: 'result',
} as const;

export type StepId = (typeof StepId)[keyof typeof StepId];

/** A step of the configurator. */
export interface ConfiguratorStep {
  readonly id: StepId;
  /** Name in the bar of steps and in the heading of the step. */
  readonly label: string;
  /** One sentence under the heading: what the step sets. */
  readonly description: string;
  /** The diffs whose options the step has; an app without any of them skips the step. */
  readonly diffKinds: readonly DiffKind[];
}

/** Both diffs. */
const ALL_DIFFS: readonly DiffKind[] = [DiffKind.Html, DiffKind.Text];

/** Every step, for an app with both diffs. */
export const STEPS: readonly ConfiguratorStep[] = [
  {
    id: StepId.Diffs,
    label: 'Your diffs',
    description: 'Which diffs your app shows, and a sample to preview them.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.Colors,
    label: 'Colors',
    description: 'Theme, colors of changes and how they are marked.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.Lines,
    label: 'Lines',
    description: 'Line numbers, the background of changed lines, and hiding unchanged lines.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.Layout,
    label: 'Layout',
    description: 'Two columns or one, and what stands between and above the versions.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.ChangeDetails,
    label: 'Change details',
    description: 'Tooltips and icons of changes besides the text.',
    diffKinds: [DiffKind.Html],
  },
  {
    id: StepId.Fonts,
    label: 'Fonts',
    description: 'The font of the diff and the sizes of its parts.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.Toolbar,
    label: 'Toolbar',
    description:
      'Arrows that step through the changes, numbers of changes, and identical versions.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.Comparison,
    label: 'Comparison',
    description: 'What the comparison ignores, such as whitespace or letter case.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.Language,
    label: 'Language and texts',
    description: 'The language of the interface, and texts of your own.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.ViewSettings,
    label: 'View settings',
    description: 'What users can change themselves, and whether their choices stay after a reload.',
    diffKinds: ALL_DIFFS,
  },
  {
    id: StepId.Result,
    label: 'Result',
    description:
      'Copy the configuration into app.config.ts of your app. Options with their defaults are left out.',
    diffKinds: ALL_DIFFS,
  },
];
