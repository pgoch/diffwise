import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { DiffwiseHtml, DiffwiseText } from 'ngx-diffwise';

import type { Choice } from '../choice';
import { ownOptions } from '../diff-options';
import { DiffKind, loadedSample } from '../samples';
import { AppDiffs, ConfiguratorState } from './configurator-state';
import { DiffKindsStep } from './diff-kinds-step';
import { ResultStep } from './result-step';
import { StepOptions } from './step-options';
import { type ConfiguratorStep, StepId } from './steps';

/** Keeps the choices made in the view settings of the preview apart from those of the demo. */
const PREVIEW_SETTINGS_KEY = 'diffwise-configurator-preview';

/** Puts the version of the options after the key of the preview. */
const KEY_SEPARATOR = '-';

/** Name of the heading of the step in the template. */
const STEP_HEADING_REFERENCE = 'stepHeading';

/** The diffs the preview of an app with both diffs can show. */
const PREVIEW_KIND_CHOICES: readonly Choice<DiffKind>[] = [
  { value: DiffKind.Html, label: 'HTML' },
  { value: DiffKind.Text, label: 'Text' },
];

/**
 * The configurator: a bar of steps on top, the options of the current step on the left and a
 * preview of a diff with them on the right. The last step gives the configuration.
 */
@Component({
  selector: 'demo-configurator-page',
  imports: [DiffKindsStep, DiffwiseHtml, DiffwiseText, ResultStep, StepOptions],
  templateUrl: './configurator-page.html',
  styleUrl: './configurator-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguratorPage {
  /** The choices of the configurator. */
  protected readonly state = inject(ConfiguratorState);

  /** Steps of the configurator, for the template. */
  protected readonly stepIds = StepId;

  /** Kinds of diff, for the template. */
  protected readonly diffKinds = DiffKind;

  /** The diffs the preview of an app with both diffs can show. */
  protected readonly previewKinds = PREVIEW_KIND_CHOICES;

  /**
   * The options of the preview: the chosen ones over every default, so those the demo sets do not
   * change it. The choices made in its view settings start over after each change of an option,
   * so they do not hide the change, and they are never remembered.
   */
  protected readonly previewConfig = computed(() => {
    const userSettingsKey = PREVIEW_SETTINGS_KEY + KEY_SEPARATOR + this.state.optionsVersion();
    const options = { ...this.state.options(), rememberUserSettings: false };

    return ownOptions(userSettingsKey, options);
  });

  /** The goal of the configurator, the last step. */
  protected readonly resultStep = computed(() => this.state.steps().at(-1));

  /** True when the result shows; it takes the place of the preview too. */
  protected readonly showsResult = computed(() => this.state.step().id === StepId.Result);

  /** The number of the step that shows, from 1. */
  protected readonly stepNumber = computed(() => this.state.stepIndex() + 1);

  /** True when the preview compares the sample with itself, to show identical versions. */
  protected readonly comparesSampleWithItself = computed(
    () => this.state.step().id === StepId.IdenticalVersions,
  );

  /** True when a step comes before the one that shows. */
  protected readonly hasBack = computed(() => this.state.stepIndex() > 0);

  /** True when a step comes after the one that shows. */
  protected readonly hasNext = computed(() => this.stepNumber() < this.state.steps().length);

  /** True when the app shows both diffs, so the preview can show either. */
  protected readonly usesBothDiffs = computed(() => this.state.appDiffs() === AppDiffs.Both);

  /** The sample of the preview as it loads, and the last loaded one. */
  private readonly loaded = loadedSample(() => this.state.sample());

  /** The sample of the preview; its error tells when it could not be loaded. */
  protected readonly sample = this.loaded.sample;

  /** The last loaded sample, which stays while another one loads. */
  protected readonly shownSample = this.loaded.shownSample;

  /** The heading of the step, which takes the focus after each move to another step. */
  private readonly stepHeading =
    viewChild.required<ElementRef<HTMLElement>>(STEP_HEADING_REFERENCE);

  private readonly injector = inject(Injector);

  /** Shows the step. */
  protected goTo(step: ConfiguratorStep): void {
    this.state.goTo(step);
    this.focusStep();
  }

  /** Shows the step before. */
  protected goBack(): void {
    this.state.goBack();
    this.focusStep();
  }

  /** Shows the step after. */
  protected goNext(): void {
    this.state.goNext();
    this.focusStep();
  }

  /** Takes back every chosen option and shows the first step. */
  protected startOver(): void {
    this.state.startOver();
    this.focusStep();
  }

  /** Moves the focus to the heading of the step once it shows, as a new page would. */
  private focusStep(): void {
    afterNextRender(() => this.stepHeading().nativeElement.focus(), { injector: this.injector });
  }
}
