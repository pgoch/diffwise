import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  type DiffwiseConfigOptions,
  DiffwiseFontFamily,
  DiffwiseUserSetting,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
} from 'ngx-diffwise';

import type { Choice } from '../choice';
import { DEFAULT_OPTIONS } from '../diff-options';
import { DiffKind } from '../samples';
import { ConfiguratorState } from './configurator-state';
import { CustomColorsEditor } from './custom-colors-editor';
import { CustomTextsEditor } from './custom-texts-editor';
import { OptionControl } from './option-control';
import { type ConfiguratorStep, OptionKind, type OptionName, type StepOption } from './steps';

/** Fonts of the font buttons: the one around the diff, the built-in one, or a font of the app. */
const FontChoice = {
  Inherit: DiffwiseFontFamily.Inherit,
  Builtin: DiffwiseFontFamily.Builtin,
  Named: 'named',
} as const;

type FontChoice = (typeof FontChoice)[keyof typeof FontChoice];

const FONT_CHOICES: readonly Choice<FontChoice>[] = [
  { value: FontChoice.Inherit, label: 'Font of your app' },
  { value: FontChoice.Builtin, label: 'Built-in' },
  { value: FontChoice.Named, label: 'Named font' },
];

/** The font a named font starts with, until another name is written. */
const FIRST_FONT_NAME = 'Inter';

/** Headers of the header buttons: those of the interface, icons, or texts of the app. */
const HeadersChoice = {
  Default: DiffwiseVersionHeaders.Default,
  Icons: DiffwiseVersionHeaders.Icons,
  Texts: 'texts',
} as const;

type HeadersChoice = (typeof HeadersChoice)[keyof typeof HeadersChoice];

const HEADERS_CHOICES: readonly Choice<HeadersChoice>[] = [
  { value: HeadersChoice.Default, label: 'Default' },
  { value: HeadersChoice.Icons, label: 'Icons' },
  { value: HeadersChoice.Texts, label: 'Texts of your app' },
];

/** The texts that the headers of an app start with, until others are written. */
const FIRST_HEADER_TEXTS: DiffwiseVersionHeaderTexts = { old: 'Version 3', new: 'Version 4' };

/** The options the user can change in the view settings, in their order there. */
const USER_SETTING_CHOICES: readonly Choice<DiffwiseUserSetting>[] = [
  { value: DiffwiseUserSetting.ColorMode, label: 'Theme' },
  { value: DiffwiseUserSetting.DiffPalette, label: 'Colors of changes' },
  { value: DiffwiseUserSetting.TextFont, label: 'Text font' },
  { value: DiffwiseUserSetting.Layout, label: 'Layout' },
  { value: DiffwiseUserSetting.InlineDiffStyle, label: 'Changes in a single column' },
  { value: DiffwiseUserSetting.HideUnchangedLines, label: 'Hide unchanged lines' },
];

const OBJECT_TYPE = 'object';

/**
 * The options of a step, each as its kind shows it: buttons, a number or a text field, a list,
 * or the fields of the font, the headers and the options for the user.
 */
@Component({
  selector: 'demo-step-options',
  imports: [CustomColorsEditor, CustomTextsEditor, OptionControl],
  templateUrl: './step-options.html',
  styleUrl: './step-options.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepOptions {
  /** The step whose options show. */
  readonly step = input.required<ConfiguratorStep>();

  /** The choices of the configurator. */
  protected readonly state = inject(ConfiguratorState);

  /** Kinds of options, for the template. */
  protected readonly kinds = OptionKind;

  /** Choices of the special options, for the template. */
  protected readonly choices = {
    fonts: FONT_CHOICES,
    headers: HEADERS_CHOICES,
    namedFont: FontChoice.Named,
    headerTexts: HeadersChoice.Texts,
    defaultFont: fontChoiceOf(DEFAULT_OPTIONS.fontFamily),
    defaultHeaders: headersChoiceOf(DEFAULT_OPTIONS.versionHeaders),
  };

  /** The options of the step for the diffs of the app. */
  protected readonly options = computed(() => {
    const diffKinds = this.state.diffKinds();

    return this.step().options.filter((option) =>
      option.diffKinds.some((kind) => diffKinds.includes(kind)),
    );
  });

  /** The options the user can change, without the text font in an app without plain text. */
  protected readonly userSettings = computed(() => {
    const showsText = this.state.diffKinds().includes(DiffKind.Text);

    return USER_SETTING_CHOICES.filter(
      ({ value }) => showsText || value !== DiffwiseUserSetting.TextFont,
    );
  });

  /** The font of the font buttons. */
  protected readonly fontChoice = computed(() => fontChoiceOf(this.state.valueOf('fontFamily')));

  /** The headers of the header buttons. */
  protected readonly headersChoice = computed(() =>
    headersChoiceOf(this.state.valueOf('versionHeaders')),
  );

  /** The texts of the headers of an app, or the first texts while the headers are others. */
  protected readonly headerTexts = computed(() => {
    const headers = this.state.valueOf('versionHeaders');

    return typeof headers === OBJECT_TYPE
      ? (headers as DiffwiseVersionHeaderTexts)
      : FIRST_HEADER_TEXTS;
  });

  /** The value of the option. */
  protected valueOf(option: StepOption): unknown {
    return this.state.valueOf(option.name);
  }

  /** The default of the option. */
  protected defaultOf(option: StepOption): unknown {
    return DEFAULT_OPTIONS[option.name];
  }

  /** Why the option does not work now, as its other option has another value; `null` if it works. */
  protected disabledNote({ enabledWhen }: StepOption): string | null {
    if (enabledWhen === null) {
      return null;
    }

    const works = this.state.valueOf(enabledWhen.option) === enabledWhen.value;

    return works ? null : enabledWhen.note;
  }

  /** Chooses the value of a button or of a list. */
  protected choose(option: StepOption, value: unknown): void {
    this.set(option.name, value);
  }

  /** Chooses the value of a list from its text, such as `'en'`. */
  protected chooseFromList(option: StepOption, event: Event): void {
    const text = (event.target as HTMLSelectElement).value;
    const choice = option.choices.find(({ value }) => String(value) === text);

    if (choice !== undefined) {
      this.set(option.name, choice.value);
    }
  }

  /** Chooses a number of a field, once it is a number within the limits of the option. */
  protected chooseNumber(option: StepOption, event: Event): void {
    const number = (event.target as HTMLInputElement).valueAsNumber;
    const { min = -Infinity, max = Infinity } = option.field ?? {};
    const isInLimits = number >= min && number <= max;

    if (isInLimits) {
      this.set(option.name, number);
    }
  }

  /** Chooses the text of a field; an empty one gives `null`, the default. */
  protected chooseText(option: StepOption, event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const value = text.length === 0 ? null : text;

    this.set(option.name, value);
  }

  /** Chooses a font; a named font starts with the name in its field. */
  protected chooseFont(choice: FontChoice, nameField: HTMLInputElement | null): void {
    const name = nameField?.value.trim() || FIRST_FONT_NAME;
    const fontFamily = choice === FontChoice.Named ? name : choice;

    this.state.setOption('fontFamily', fontFamily);
  }

  /** Chooses the font of the name field, once it is not blank. */
  protected nameFont(event: Event): void {
    const name = (event.target as HTMLInputElement).value.trim();

    if (name.length > 0) {
      this.state.setOption('fontFamily', name);
    }
  }

  /** Chooses headers; the texts of an app start with the texts of their fields. */
  protected chooseHeaders(choice: HeadersChoice): void {
    const versionHeaders = choice === HeadersChoice.Texts ? this.headerTexts() : choice;

    this.state.setOption('versionHeaders', versionHeaders);
  }

  /** Changes one text of the headers of an app. */
  protected writeHeaderText(version: keyof DiffwiseVersionHeaderTexts, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    const versionHeaders = { ...this.headerTexts(), [version]: text };

    this.state.setOption('versionHeaders', versionHeaders);
  }

  /** True when the user can change the option in the view settings. */
  protected isAllowed(setting: DiffwiseUserSetting): boolean {
    return this.state.valueOf('allowedUserSettings')?.includes(setting) ?? false;
  }

  /** Lets the user change the option, or takes it away, keeping the order of the view settings. */
  protected allow(setting: DiffwiseUserSetting, event: Event): void {
    const { checked } = event.target as HTMLInputElement;
    const allowedUserSettings = USER_SETTING_CHOICES.map(({ value }) => value).filter((value) =>
      value === setting ? checked : this.isAllowed(value),
    );

    this.state.setOption('allowedUserSettings', allowedUserSettings);
  }

  /** Chooses the value of an option by its name. */
  private set(name: OptionName, value: unknown): void {
    this.state.setOption(name, value as DiffwiseConfigOptions[OptionName]);
  }
}

/** The font button of a value of `fontFamily`. */
function fontChoiceOf(fontFamily: string | undefined): FontChoice {
  switch (fontFamily) {
    case FontChoice.Inherit:
    case FontChoice.Builtin:
      return fontFamily;
    default:
      return FontChoice.Named;
  }
}

/** The header button of a value of `versionHeaders`. */
function headersChoiceOf(versionHeaders: DiffwiseConfigOptions['versionHeaders']): HeadersChoice {
  return typeof versionHeaders === OBJECT_TYPE
    ? HeadersChoice.Texts
    : (versionHeaders as HeadersChoice);
}
