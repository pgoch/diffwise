import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { Choice } from '../choice';

/** Makes the ids of the parts of each option unique on the page. */
let nextOptionNumber = 0;

const OPTION_ID_START = 'demo-option-';
const NAME_ID_END = '-name';
const DESCRIPTION_ID_END = '-description';

/** An option with fields of its own instead of buttons. */
const NO_CHOICES: readonly never[] = [];

/**
 * One option of a step: its name, one sentence about it, and a button for each value, or the
 * fields put inside it. The value that an app gets without the option is marked "default", and a
 * changed option has a dot.
 */
@Component({
  selector: 'demo-option-control',
  templateUrl: './option-control.html',
  styleUrl: './option-control.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptionControl<T> {
  /** Name of the option, as people say it, such as "Theme". */
  readonly name = input.required<string>();

  /** One sentence: what the option does. */
  readonly description = input.required<string>();

  /** The values, one button each, in their order; without them, the fields inside show. */
  readonly choices = input<readonly Choice<T>[]>(NO_CHOICES);

  /** The chosen value; its button is pressed. */
  readonly value = input<T>();

  /** The value an app gets without the option. */
  readonly defaultValue = input<T>();

  /** True when the option goes into the configuration; a changed one then has a dot. */
  readonly isConfigured = input(true);

  /** The value of the clicked button. */
  readonly chosen = output<T>();

  /** True when the option goes into the configuration with another value than its default. */
  protected readonly isChanged = computed(
    () => this.isConfigured() && this.value() !== this.defaultValue(),
  );

  /** Ids that name and describe the group of buttons. */
  protected readonly ids = optionIds();
}

/** Ids of the name and the description of a new option. */
function optionIds(): { readonly name: string; readonly description: string } {
  const id = OPTION_ID_START + nextOptionNumber++;
  const name = id + NAME_ID_END;
  const description = id + DESCRIPTION_ID_END;

  return { name, description };
}
