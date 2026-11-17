import { Injectable, computed, signal } from '@angular/core';
import { type DiffwiseConfigOptions, DiffwiseLanguage } from 'ngx-diffwise';

import { DEFAULT_OPTIONS } from '../diff-options';
import {
  DiffKind,
  type SampleChoice,
  type SampleLanguage,
  SampleSize,
  TEXT_SAMPLE_LANGUAGES,
} from '../samples';
import { type ConfiguratorStep, type OptionName, STEPS, StepId } from './steps';

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

  /** Size of the sample in the preview. */
  readonly sampleSize = signal<SampleSize>(SampleSize.Medium);

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

  /** The sample in the preview; plain text samples are in fewer languages, else in English. */
  readonly sample = computed<SampleChoice>(() => {
    const kind = this.previewKind();
    const language = this.sampleLanguage();
    const hasTextSample = TEXT_SAMPLE_LANGUAGES.includes(language);
    const isFallback = kind === DiffKind.Text && !hasTextSample;
    const sampleLanguage = isFallback ? FALLBACK_TEXT_LANGUAGE : language;

    return { kind, language: sampleLanguage, size: this.sampleSize() };
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

  /** The chosen step. */
  private readonly stepId = signal<StepId>(StepId.Diffs);

  /** The value of the option: the chosen one, or its default. */
  valueOf<K extends OptionName>(name: K): DiffwiseConfigOptions[K] {
    return this.options()[name] ?? DEFAULT_OPTIONS[name];
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

  /** Shows the step before the one that shows, if there is one. */
  goBack(): void {
    this.goToIndex(this.stepIndex() - 1);
  }

  /** Shows the step after the one that shows, if there is one. */
  goNext(): void {
    this.goToIndex(this.stepIndex() + 1);
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

  /** Shows the step at the position, when there is one. */
  private goToIndex(index: number): void {
    const step = this.steps().at(index);
    const isInSteps = index >= 0 && step !== undefined;

    if (isInSteps) {
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
