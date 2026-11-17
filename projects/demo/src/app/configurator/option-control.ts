import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { Choice } from '../choice';

/** Makes the ids of the parts of each option unique on the page. */
let nextOptionNumber = 0;

const OPTION_ID_START = 'demo-option-';
const NAME_ID_END = '-name';
const DESCRIPTION_ID_END = '-description';
const NOTE_ID_END = '-note';

/** An option with fields of its own instead of buttons. */
const NO_CHOICES: readonly never[] = [];

/** Ids of the name, the description and the note of an option. */
interface OptionIds {
  readonly name: string;
  readonly description: string;
  readonly note: string;
}

/**
 * One option of a step: its name, one sentence about it, and a button for each value, or the
 * fields put inside it. The value that an app gets without the option is marked "default", a
 * changed option has a dot, and an option that works only with another one is disabled with a
 * note that says so.
 */
@Component({
  selector: 'demo-option-control',
  templateUrl: './option-control.html',
  styleUrl: './option-control.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.option--disabled]': 'isDisabled()',
  },
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

  /** True when the option goes into the configuration with another value than its default. */
  readonly changed = input(false);

  /** Why the option does not work now, such as "Only with the theme Auto"; `null` when it does. */
  readonly disabledNote = input<string | null>(null);

  /** The value of the clicked button. */
  readonly chosen = output<T>();

  /** Ids that name and describe the group of buttons or fields. */
  protected readonly ids = optionIds();

  /** True while the option does not work. */
  protected readonly isDisabled = computed(() => this.disabledNote() !== null);

  /** The ids that describe the group: the description, and the note while it shows. */
  protected readonly describedBy = computed(() => {
    const ids = this.ids;

    return this.isDisabled() ? `${ids.description} ${ids.note}` : ids.description;
  });
}

/** Ids of the parts of a new option. */
function optionIds(): OptionIds {
  const id = OPTION_ID_START + nextOptionNumber++;
  const name = id + NAME_ID_END;
  const description = id + DESCRIPTION_ID_END;
  const note = id + NOTE_ID_END;

  return { name, description, note };
}
