import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** A choice of a group of buttons, such as a value of an option. */
export interface Choice<T> {
  readonly value: T;
  readonly label: string;
}

/** Buttons for the choices of one option; the button of the current value is pressed. */
@Component({
  selector: 'demo-choice-buttons',
  template: `
    <fieldset>
      <legend>{{ label() }}</legend>
      <div class="demo-choices">
        @for (choice of choices(); track $index) {
          <button
            type="button"
            [attr.aria-pressed]="choice.value === value()"
            (click)="chosen.emit(choice.value)"
          >
            {{ choice.label }}
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
      margin: 0 0 12px;
    }

    fieldset {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      margin-bottom: 5px;
      padding: 0;
      color: #667085;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .demo-choices {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    button {
      flex: 1 1 auto;
      padding: 5px 8px;
      border: 1px solid #dfe3e8;
      border-radius: 6px;
      background: #f3f5f8;
      color: inherit;
      font: inherit;
      font-size: 12.5px;
      cursor: pointer;
    }

    button[aria-pressed='true'] {
      border-color: #1f2328;
      background: #1f2328;
      color: #fff;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoiceButtons<T> {
  /** Name of the group, above the buttons. */
  readonly label = input.required<string>();

  readonly choices = input.required<readonly Choice<T>[]>();

  /** The current value; its button is pressed. */
  readonly value = input<T>();

  /** The value of the clicked button. */
  readonly chosen = output<T>();
}
