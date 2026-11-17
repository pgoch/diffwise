import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  DiffwiseCustomTexts,
  DiffwiseDiffColors,
  DiffwiseUserSetting,
  DiffwiseVersionHeaderTexts,
} from 'ngx-diffwise';

import type { Choice } from '../choice';
import { ConfigForm, configCode } from './config-code';
import { ConfiguratorState } from './configurator-state';
import { FONT_CHOICES, HEADERS_CHOICES, USER_SETTING_CHOICES } from './step-options';
import { type ConfiguratorStep, OptionKind, type StepOption } from './steps';

/** The forms of the configuration, one tab each. */
const FORM_CHOICES: readonly Choice<ConfigForm>[] = [
  { value: ConfigForm.PlainObject, label: 'Plain object' },
  { value: ConfigForm.DiffwiseConfig, label: 'DiffwiseConfig' },
];

/** How long the copy button says "Copied", in ms. */
const COPIED_TIME = 2000;

/** Name of the code in the template. */
const CODE_REFERENCE = 'codeBlock';

/** Starts the name of an "Edit" button, before the name of its option. */
const EDIT_LABEL_START = 'Edit: ';

/** The value of a list of options the user can change when it is empty. */
const NO_SETTINGS = 'None';

/** Joins the options the user can change, and the texts of the headers. */
const LIST_SEPARATOR = ', ';
const VERSION_ARROW = ' → ';

/** Words after a number of colors or texts: one, and more. */
const COLOR_WORDS = ['color', 'colors'] as const;
const TEXT_WORDS = ['text', 'texts'] as const;

const OBJECT_TYPE = 'object';

/** A changed option as the list of the result shows it. */
interface ShownChange {
  readonly step: ConfiguratorStep;
  readonly option: StepOption;
  /** The value as people read it, such as "Dark" or "1.25 rem". */
  readonly value: string;
  /** Name of its "Edit" button, with the name of the option. */
  readonly editLabel: string;
}

/**
 * The last step: the configuration ready to copy, as a plain object or as a `DiffwiseConfig`, and
 * the list of changed options, each with a button back to its step.
 */
@Component({
  selector: 'demo-result-step',
  templateUrl: './result-step.html',
  styleUrl: './result-step.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultStep {
  /** The step of an option to change again. */
  readonly edit = output<ConfiguratorStep>();

  /** Asks to take back every chosen option. */
  readonly startOver = output();

  /** The choices of the configurator. */
  protected readonly state = inject(ConfiguratorState);

  /** The forms of the configuration. */
  protected readonly forms = FORM_CHOICES;

  /** The form that shows. */
  protected readonly form = signal<ConfigForm>(ConfigForm.PlainObject);

  /** The text of `app.config.ts` in the form that shows. */
  protected readonly code = computed(() => configCode(this.state.resultOptions(), this.form()));

  /** The changed options, with their values as people read them. */
  protected readonly changes = computed<readonly ShownChange[]>(() =>
    this.state.changedOptions().map(({ step, option }) => ({
      step,
      option,
      value: valueLabelOf(option, this.state.valueOf(option.name)),
      editLabel: EDIT_LABEL_START + option.label,
    })),
  );

  /** True for a while after the code was copied. */
  protected readonly isCopied = signal(false);

  /** The code on the page, which gets selected when the browser does not let it be copied. */
  private readonly codeElement = viewChild.required<ElementRef<HTMLElement>>(CODE_REFERENCE);

  /** Copies the code, or selects it for copying by hand when the browser does not allow it. */
  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
    } catch {
      selectContent(this.codeElement().nativeElement);
      return;
    }

    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), COPIED_TIME);
  }
}

/** The value of a changed option as people read it, such as "Dark", "1.25 rem" or "3 colors". */
function valueLabelOf(option: StepOption, value: unknown): string {
  switch (option.kind) {
    case OptionKind.Number:
      return [value, option.field?.unit].filter((part) => part !== undefined).join(' ');
    case OptionKind.Text:
      return String(value);
    case OptionKind.Font:
      return labelOf(FONT_CHOICES, value) ?? String(value);
    case OptionKind.VersionHeaders:
      return typeof value === OBJECT_TYPE
        ? headerTextsOf(value as DiffwiseVersionHeaderTexts)
        : (labelOf(HEADERS_CHOICES, value) ?? String(value));
    case OptionKind.UserSettings:
      return userSettingsOf(value as readonly DiffwiseUserSetting[]);
    case OptionKind.Colors:
      return countOf(colorCountOf(value as DiffwiseDiffColors), COLOR_WORDS);
    case OptionKind.Texts:
      return countOf(Object.keys(value as DiffwiseCustomTexts).length, TEXT_WORDS);
    default:
      return labelOf(option.choices, value) ?? String(value);
  }
}

/** The label of the choice with the value, if there is one. */
function labelOf(choices: readonly Choice<unknown>[], value: unknown): string | undefined {
  return choices.find((choice) => choice.value === value)?.label;
}

/** The texts of the headers of an app, as "Version 3 → Version 4". */
function headerTextsOf(texts: DiffwiseVersionHeaderTexts): string {
  return texts.old + VERSION_ARROW + texts.new;
}

/** The options the user can change, by their labels, or "None". */
function userSettingsOf(settings: readonly DiffwiseUserSetting[]): string {
  const labels = settings.map((setting) => labelOf(USER_SETTING_CHOICES, setting) ?? setting);

  return labels.length === 0 ? NO_SETTINGS : labels.join(LIST_SEPARATOR);
}

/** How many colors of both themes the app gives. */
function colorCountOf({ light = {}, dark = {} }: DiffwiseDiffColors): number {
  return Object.keys(light).length + Object.keys(dark).length;
}

/** A number with its word, such as "1 color" or "3 colors". */
function countOf(count: number, [one, more]: readonly [string, string]): string {
  return `${count} ${count === 1 ? one : more}`;
}

/** Selects the text of the element, as a triple click does. */
function selectContent(element: HTMLElement): void {
  const selection = element.ownerDocument.getSelection();

  selection?.selectAllChildren(element);
}
