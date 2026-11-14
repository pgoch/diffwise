import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';

import { withCount } from '../i18n/texts';

/** The tag of the bar, which stands among the rows of the diff. */
export const COLLAPSED_LINES_BAR_TAG = 'diffwise-collapsed-lines-bar';

/**
 * The bar in place of hidden unchanged lines: one button with their number, which shows them. Its
 * look follows what stands between the versions.
 */
@Component({
  selector: COLLAPSED_LINES_BAR_TAG,
  templateUrl: './collapsed-lines-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CollapsedLinesBar {
  /** Number of the hidden lines. */
  readonly count = input.required<number>();

  /** Text of the bar, in which `{count}` stands for the number of hidden lines. */
  readonly text = input.required<string>();

  /** Asks the diff to show the hidden lines. */
  readonly showLines = output();

  /** Text of the bar with the number of hidden lines; it also names the button. */
  protected readonly label = computed(() => withCount(this.text(), this.count()));
}
