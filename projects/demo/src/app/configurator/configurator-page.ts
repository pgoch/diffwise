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
import { NgTemplateOutlet } from '@angular/common';
import { DiffwiseColorMode, DiffwiseHtml, DiffwiseLayout, DiffwiseText } from 'ngx-diffwise';

import type { Choice } from '../choice';
import { ownOptions } from '../diff-options';
import {
  DiffKind,
  LANGUAGE_CHOICES,
  type SampleLanguage,
  TEXT_LANGUAGE_CHOICES,
  TEXT_SAMPLE_LANGUAGES,
  loadedSample,
} from '../samples';
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

/** The themes of the preview while the theme of the configuration is Auto. */
const PREVIEW_THEME_CHOICES: readonly Choice<DiffwiseColorMode>[] = [
  { value: DiffwiseColorMode.Auto, label: 'Auto theme' },
  { value: DiffwiseColorMode.Light, label: 'Light theme' },
  { value: DiffwiseColorMode.Dark, label: 'Dark theme' },
];

/** The layouts of the preview while the layout of the configuration is Auto. */
const PREVIEW_LAYOUT_CHOICES: readonly Choice<DiffwiseLayout>[] = [
  { value: DiffwiseLayout.Auto, label: 'Auto layout' },
  { value: DiffwiseLayout.SideBySide, label: 'Side by side' },
  { value: DiffwiseLayout.Inline, label: 'Single column' },
];

/** Why a list of the preview does not work: the configuration sets the theme or the layout. */
const ONLY_WITH_AUTO_THEME = 'Only with the theme Auto in the step General.';
const ONLY_WITH_AUTO_LAYOUT = 'Only with the layout Auto in the step General.';

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
  imports: [DiffKindsStep, DiffwiseHtml, DiffwiseText, NgTemplateOutlet, ResultStep, StepOptions],
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

  /** The themes and the layouts of the preview, and the notes of their lists. */
  protected readonly previewLists = {
    themes: PREVIEW_THEME_CHOICES,
    layouts: PREVIEW_LAYOUT_CHOICES,
    themeNote: ONLY_WITH_AUTO_THEME,
    layoutNote: ONLY_WITH_AUTO_LAYOUT,
  };

  /** True when the theme of the configuration is Auto, so the preview can show either theme. */
  protected readonly hasAutoTheme = computed(
    () => this.state.valueOf('colorMode') === DiffwiseColorMode.Auto,
  );

  /** True when the layout of the configuration is Auto, so the preview can show either layout. */
  protected readonly hasAutoLayout = computed(
    () => this.state.valueOf('layout') === DiffwiseLayout.Auto,
  );

  /** The theme of the preview: the one of the configuration, or the one chosen for Auto. */
  protected readonly previewColorMode = computed(() =>
    this.hasAutoTheme() ? this.state.previewColorMode() : this.state.valueOf('colorMode'),
  );

  /** The layout of the preview: the one of the configuration, or the one chosen for Auto. */
  protected readonly previewLayout = computed(() =>
    this.hasAutoLayout() ? this.state.previewLayout() : this.state.valueOf('layout'),
  );

  /**
   * The options of the preview: the chosen ones over every default, so those the demo sets do not
   * change it. The choices made in its view settings start over after each change of an option,
   * so they do not hide the change, and they are never remembered.
   */
  protected readonly previewConfig = computed(() => {
    const userSettingsKey = PREVIEW_SETTINGS_KEY + KEY_SEPARATOR + this.state.optionsVersion();
    const options = {
      ...this.state.options(),
      colorMode: this.previewColorMode(),
      layout: this.previewLayout(),
      rememberUserSettings: false,
    };

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

  /** Languages of the sample: every language, or those of plain text for an app with it alone. */
  protected readonly languages = computed(() =>
    this.state.appDiffs() === AppDiffs.Text ? TEXT_LANGUAGE_CHOICES : LANGUAGE_CHOICES,
  );

  /** True when the preview shows plain text in English, as the chosen language has no sample. */
  protected readonly showsTextInEnglish = computed(() => {
    const showsText = this.state.previewKind() === DiffKind.Text;
    const hasTextSample = TEXT_SAMPLE_LANGUAGES.includes(this.state.sampleLanguage());

    return showsText && !hasTextSample;
  });

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

  /** Shows the preview in the chosen theme. */
  protected choosePreviewTheme(event: Event): void {
    this.state.previewColorMode.set(selectedValueOf(event) as DiffwiseColorMode);
  }

  /** Shows the preview in the chosen layout. */
  protected choosePreviewLayout(event: Event): void {
    this.state.previewLayout.set(selectedValueOf(event) as DiffwiseLayout);
  }

  /** Shows the sample in the chosen language. */
  protected chooseLanguage(event: Event): void {
    this.state.sampleLanguage.set(selectedValueOf(event) as SampleLanguage);
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

/** The value of the option chosen in a list. */
function selectedValueOf(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}
