import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { Choice } from '../choice';
import {
  LANGUAGE_CHOICES,
  SIZE_CHOICES,
  type SampleLanguage,
  type SampleSize,
  TEXT_LANGUAGE_CHOICES,
  TEXT_SAMPLE_LANGUAGES,
} from '../samples';
import { AppDiffs, ConfiguratorState } from './configurator-state';
import { OptionControl } from './option-control';

const APP_DIFFS_CHOICES: readonly Choice<AppDiffs>[] = [
  { value: AppDiffs.Html, label: 'HTML documents' },
  { value: AppDiffs.Text, label: 'Plain text' },
  { value: AppDiffs.Both, label: 'Both' },
];

/**
 * The first step: the diffs of the app, and the sample in the preview. The steps and options of a
 * diff the app does not show are left out.
 */
@Component({
  selector: 'demo-diff-kinds-step',
  imports: [OptionControl],
  template: `
    <demo-option-control
      name="Diffs in your app"
      description="Steps and options of a diff your app does not show are left out."
      [choices]="appDiffsChoices"
      [value]="state.appDiffs()"
      [defaultValue]="defaultAppDiffs"
      [isConfigured]="false"
      (chosen)="state.chooseAppDiffs($event)"
    />
    <demo-option-control
      name="Sample in the preview"
      description="Only for the preview; it is not part of the configuration."
      [isConfigured]="false"
    >
      <label class="sample-field">
        Language
        <select (change)="chooseLanguage($event)">
          @for (choice of languages(); track choice.value) {
            <option [value]="choice.value" [selected]="choice.value === state.sampleLanguage()">
              {{ choice.label }}
            </option>
          }
        </select>
      </label>
      <label class="sample-field">
        Size
        <select (change)="chooseSize($event)">
          @for (choice of sizes; track choice.value) {
            <option [value]="choice.value" [selected]="choice.value === state.sampleSize()">
              {{ choice.label }}
            </option>
          }
        </select>
      </label>
    </demo-option-control>
    @if (showsTextInEnglish()) {
      <p class="sample-hint">
        Plain text samples are in English and Polish, so the plain text preview is in English.
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .sample-field {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-inline-end: 12px;
      color: var(--site-muted);
      font-size: 13px;
    }

    select {
      padding: 4px 6px;
      border: 1px solid var(--site-border);
      border-radius: 6px;
      background: #fff;
      color: var(--site-text);
      font: inherit;
      font-size: 13.5px;
    }

    .sample-hint {
      margin: -8px 0 16px;
      color: var(--site-muted);
      font-size: 13px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffKindsStep {
  /** The choices of the configurator. */
  protected readonly state = inject(ConfiguratorState);

  /** The choices of the diffs of the app. */
  protected readonly appDiffsChoices = APP_DIFFS_CHOICES;

  /** The diffs a configuration applies to without being told: both. */
  protected readonly defaultAppDiffs = AppDiffs.Both;

  /** Sizes of the sample. */
  protected readonly sizes = SIZE_CHOICES;

  /** Languages with samples: every language, or those of plain text for an app with it alone. */
  protected readonly languages = computed(() =>
    this.state.appDiffs() === AppDiffs.Text ? TEXT_LANGUAGE_CHOICES : LANGUAGE_CHOICES,
  );

  /** True when an app with both diffs has chosen a language without a plain text sample. */
  protected readonly showsTextInEnglish = computed(() => {
    const usesBoth = this.state.appDiffs() === AppDiffs.Both;
    const hasTextSample = TEXT_SAMPLE_LANGUAGES.includes(this.state.sampleLanguage());

    return usesBoth && !hasTextSample;
  });

  /** Shows the sample in the chosen language. */
  protected chooseLanguage(event: Event): void {
    this.state.sampleLanguage.set(selectedValueOf(event) as SampleLanguage);
  }

  /** Shows the sample of the chosen size. */
  protected chooseSize(event: Event): void {
    this.state.sampleSize.set(selectedValueOf(event) as SampleSize);
  }
}

/** The value of the option chosen in a list. */
function selectedValueOf(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}
