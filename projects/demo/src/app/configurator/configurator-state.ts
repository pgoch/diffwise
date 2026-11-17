import { Injectable, computed, signal } from '@angular/core';
import {
  DiffwiseColorMode,
  type DiffwiseConfigOptions,
  DiffwiseLanguage,
  DiffwiseLayout,
} from 'ngx-diffwise';

import { DEFAULT_OPTIONS } from '../diff-options';
import {
  DiffKind,
  type SampleChoice,
  type SampleLanguage,
  SampleSize,
  TEXT_SAMPLE_LANGUAGES,
} from '../samples';
import {
  type ConfiguratorStep,
  type OptionCondition,
  type OptionName,
  STEPS,
  StepId,
  type StepOption,
} from './steps';

/** The diffs an app shows: one of them or both. */
export const AppDiffs = {
  Html: 'html',
  Text: 'text',
  Both: 'both',
} as const;

export type AppDiffs = (typeof AppDiffs)[keyof typeof AppDiffs];

/** The diffs of each choice of the first step. */
const DIFF_KINDS_OF: Readonly<Record<AppDiffs, readonly DiffKind[]>> = {
  [AppDiffs.Html]: [DiffKind.Html],
  [AppDiffs.Text]: [DiffKind.Text],
  [AppDiffs.Both]: [DiffKind.Html, DiffKind.Text],
};

/** A changed option with its step, for the result. */
export interface ChangedOption {
  readonly step: ConfiguratorStep;
  readonly option: StepOption;
}

/** Language of a plain text sample when the chosen language has none. */
const FALLBACK_TEXT_LANGUAGE: SampleLanguage = DiffwiseLanguage.EN;

/**
 * The choices made in the configurator. They stay while the app runs, also on the other pages,
 * and a reload starts over.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguratorState {
  /** The diffs the app shows; steps and options of the other diff are left out. */
  readonly appDiffs = signal<AppDiffs>(AppDiffs.Both);

  /** Language of the sample in the preview. */
  readonly sampleLanguage = signal<SampleLanguage>(DiffwiseLanguage.EN);

  /** The theme of the preview while the theme of the configuration is Auto; not part of it. */
  readonly previewColorMode = signal<DiffwiseColorMode>(DiffwiseColorMode.Auto);

  /** The layout of the preview while the layout of the configuration is Auto; not part of it. */
  readonly previewLayout = signal<DiffwiseLayout>(DiffwiseLayout.Auto);

  /** The diff in the preview of an app with both diffs. */
  readonly chosenPreviewKind = signal<DiffKind>(DiffKind.Html);

  /** The diffs of the app. */
  readonly diffKinds = computed(() => DIFF_KINDS_OF[this.appDiffs()]);

  /** The steps for the diffs of the app, in their order. */
  readonly steps = computed(() => {
    const diffKinds = this.diffKinds();

    return STEPS.filter((step) => step.diffKinds.some((kind) => diffKinds.includes(kind)));
  });

  /** The step that shows: the chosen one, or the first one when the chosen one is left out. */
  readonly step = computed(() => {
    const steps = this.steps();

    return steps.find((step) => step.id === this.stepId()) ?? steps[0];
  });

  /** The position of the step that shows, from 0. */
  readonly stepIndex = computed(() => this.steps().indexOf(this.step()));

  /** The diff in the preview: the only diff of the app, or the chosen one of both. */
  readonly previewKind = computed(() => {
    const diffKinds = this.diffKinds();

    return diffKinds.includes(this.chosenPreviewKind()) ? this.chosenPreviewKind() : diffKinds[0];
  });

  /**
   * The sample in the preview: the long one, which has every kind of content. Plain text samples
   * are in fewer languages, so a language without one gets the English one.
   */
  readonly sample = computed<SampleChoice>(() => {
    const kind = this.previewKind();
    const language = this.sampleLanguage();
    const hasTextSample = TEXT_SAMPLE_LANGUAGES.includes(language);
    const isFallback = kind === DiffKind.Text && !hasTextSample;
    const sampleLanguage = isFallback ? FALLBACK_TEXT_LANGUAGE : language;

    return { kind, language: sampleLanguage, size: SampleSize.Long };
  });

  /** The options chosen with another value than their default, which go into the configuration. */
  readonly options = signal<DiffwiseConfigOptions>({});

  /** Grows with each change of an option. */
  readonly optionsVersion = signal(0);

  /** The steps with options chosen in them. */
  readonly changedSteps = computed(() => {
    const changed = Object.keys(this.options());
    const steps = STEPS.filter((step) =>
      step.options.some((option) => changed.includes(option.name)),
    );

    return new Set(steps.map((step) => step.id));
  });

  /** The changed options for the diffs of the app, with their steps, in the order of the steps. */
  readonly changedOptions = computed<readonly ChangedOption[]>(() =>
    this.steps().flatMap((step) =>
      this.optionsOf(step)
        .filter((option) => this.isChanged(option.name))
        .map((option) => ({ step, option })),
    ),
  );

  /**
   * The configuration of the result: the changed options for the diffs of the app, in the order
   * of the steps. Options of a diff the app does not show are left out, as they change nothing.
   */
  readonly resultOptions = computed<DiffwiseConfigOptions>(() => {
    const options = this.options();
    const names = this.changedOptions().map(({ option }) => option.name);

    return Object.fromEntries(names.map((name) => [name, options[name]]));
  });

  /** The chosen step. */
  private readonly stepId = signal<StepId>(StepId.General);

  /** The options of the step for the diffs of the app. */
  optionsOf(step: ConfiguratorStep): readonly StepOption[] {
    const diffKinds = this.diffKinds();

    return step.options.filter((option) =>
      option.diffKinds.some((kind) => diffKinds.includes(kind)),
    );
  }

  /** The value of the option: the chosen one, or its default. */
  valueOf<K extends OptionName>(name: K): DiffwiseConfigOptions[K] {
    return this.options()[name] ?? DEFAULT_OPTIONS[name];
  }

  /**
   * Why an option or a step does not work now, as another option has another value; `null` when
   * it works.
   */
  disabledNote(condition: OptionCondition | null): string | null {
    if (condition === null) {
      return null;
    }

    const works = condition.values.includes(this.valueOf(condition.option));

    return works ? null : condition.note;
  }

  /** True when the option has another value than its default. */
  isChanged(name: OptionName): boolean {
    return Object.hasOwn(this.options(), name);
  }

  /** Chooses the value of the option; its default takes the option out of the configuration. */
  setOption<K extends OptionName>(name: K, value: DiffwiseConfigOptions[K]): void {
    const isDefault = sameValues(value, DEFAULT_OPTIONS[name]);

    this.options.update((options) => {
      const others = withoutOption(options, name);

      return isDefault ? others : { ...others, [name]: value };
    });
    this.optionsVersion.update((version) => version + 1);
  }

  /** Shows the step. */
  goTo(step: ConfiguratorStep): void {
    this.stepId.set(step.id);
  }

  /** Takes back every chosen option and shows the first step; the diffs and the sample stay. */
  startOver(): void {
    this.options.set({});
    this.optionsVersion.update((version) => version + 1);
    this.stepId.set(StepId.General);
  }

  /** Shows the nearest working step before the one that shows, if there is one. */
  goBack(): void {
    const before = this.steps().slice(0, this.stepIndex()).reverse();

    this.goToFirstWorking(before);
  }

  /** Shows the nearest working step after the one that shows, if there is one. */
  goNext(): void {
    const after = this.steps().slice(this.stepIndex() + 1);

    this.goToFirstWorking(after);
  }

  /**
   * Shows the steps and the preview of the diffs of an app. An app with plain text alone gets a
   * sample in English when its language has no plain text sample.
   */
  chooseAppDiffs(appDiffs: AppDiffs): void {
    const hasTextSample = TEXT_SAMPLE_LANGUAGES.includes(this.sampleLanguage());

    this.appDiffs.set(appDiffs);

    if (appDiffs === AppDiffs.Text && !hasTextSample) {
      this.sampleLanguage.set(FALLBACK_TEXT_LANGUAGE);
    }
  }

  /** Shows the first of the steps that works now, when there is one. */
  private goToFirstWorking(steps: readonly ConfiguratorStep[]): void {
    const step = steps.find(({ enabledWhen }) => this.disabledNote(enabledWhen) === null);

    if (step !== undefined) {
      this.goTo(step);
    }
  }
}

/** True when two values of an option are the same, also lists and objects with the same items. */
function sameValues(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

/** The options without one of them. */
function withoutOption(options: DiffwiseConfigOptions, name: OptionName): DiffwiseConfigOptions {
  const others = Object.entries(options).filter(([key]) => key !== name);

  return Object.fromEntries(others);
}
