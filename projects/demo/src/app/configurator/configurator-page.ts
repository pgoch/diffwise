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
import { type ConfiguratorStep, StepId } from './steps';

/** Keeps the choices made in the view settings of the preview apart from those of the demo. */
const PREVIEW_SETTINGS_KEY = 'diffwise-configurator-preview';

/** The options of the preview: every option, so those the demo sets do not change it. */
const PREVIEW_CONFIG = ownOptions(PREVIEW_SETTINGS_KEY);

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
  imports: [DiffKindsStep, DiffwiseHtml, DiffwiseText],
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

  /** The options of the preview. */
  protected readonly previewConfig = PREVIEW_CONFIG;

  /** The goal of the configurator, the last step. */
  protected readonly resultStep = computed(() => this.state.steps().at(-1));

  /** The number of the step that shows, from 1. */
  protected readonly stepNumber = computed(() => this.state.stepIndex() + 1);

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

  /** Moves the focus to the heading of the step once it shows, as a new page would. */
  private focusStep(): void {
    afterNextRender(() => this.stepHeading().nativeElement.focus(), { injector: this.injector });
  }
}
