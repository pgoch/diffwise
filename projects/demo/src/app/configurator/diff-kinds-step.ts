import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import type { Choice } from '../choice';
import { AppDiffs, ConfiguratorState } from './configurator-state';
import { OptionControl } from './option-control';

const APP_DIFFS_CHOICES: readonly Choice<AppDiffs>[] = [
  { value: AppDiffs.Html, label: 'HTML documents' },
  { value: AppDiffs.Text, label: 'Plain text' },
  { value: AppDiffs.Both, label: 'Both' },
];

/** The first step: the diffs of the app. The steps and options of another diff are left out. */
@Component({
  selector: 'demo-diff-kinds-step',
  imports: [OptionControl],
  template: `
    <demo-option-control
      name="Diffs in your app"
      description="Steps and options of a diff your app does not show are left out."
      howTo="Choose Plain text: the step Change details and the options of HTML documents disappear, and the preview shows plain text. HTML documents leaves out the options of plain text, such as Text font."
      [choices]="appDiffsChoices"
      [value]="state.appDiffs()"
      [defaultValue]="defaultAppDiffs"
      (chosen)="state.chooseAppDiffs($event)"
    />
  `,
  styles: `
    :host {
      display: block;
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
}
