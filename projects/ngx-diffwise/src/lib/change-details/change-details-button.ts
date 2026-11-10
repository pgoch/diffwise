import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';

import { type ChangeDetail, ChangeDetailKind } from '../../engine';
import type { ChangeDescriber } from './change-texts';

/** Icons of the button: one for each kind of change, and one for several changes. */
export const ChangeIconKind = {
  Formatting: ChangeDetailKind.Formatting,
  Link: ChangeDetailKind.Link,
  Image: ChangeDetailKind.Image,
  /** Several changes in one line, with their number. */
  Multiple: 'multiple',
} as const;

export type ChangeIconKind = (typeof ChangeIconKind)[keyof typeof ChangeIconKind];

/** The button between the versions in a row with changes besides text: their icon and name. */
@Component({
  selector: 'diffwise-change-details-button',
  templateUrl: './change-details-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ChangeDetailsButton {
  /** Changes of the row besides changed text. */
  readonly details = input.required<readonly ChangeDetail[]>();

  /** Describes the changes in the language of the interface. */
  readonly describer = input.required<ChangeDescriber>();

  protected readonly iconKinds = ChangeIconKind;

  /** The icon of the one change, or the icon of several changes. */
  protected readonly icon = computed(() => iconOf(this.details()));

  /** Name for screen readers: the title of the tooltip of the changes. */
  protected readonly label = computed(() => this.describer().title(this.details()));
}

function iconOf(details: readonly ChangeDetail[]): ChangeIconKind {
  return details.length === 1 ? details[0].kind : ChangeIconKind.Multiple;
}
