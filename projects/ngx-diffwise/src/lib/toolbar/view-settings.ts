import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import type { DiffwiseConfig } from '../config/diffwise-config';
import {
  DiffwiseColorMode,
  DiffwiseInlineDiffStyle,
  DiffwiseLayout,
  DiffwisePalette,
  DiffwiseTextFont,
  DiffwiseUserSetting,
} from '../config/option-values';
import type { UiTexts } from '../i18n/texts';
import type { UserChoices } from '../user-settings/user-settings';

/** Options the view settings show as a group of buttons, one for each value. */
type ChoiceSetting =
  | typeof DiffwiseUserSetting.ColorMode
  | typeof DiffwiseUserSetting.DiffPalette
  | typeof DiffwiseUserSetting.TextFont
  | typeof DiffwiseUserSetting.Layout
  | typeof DiffwiseUserSetting.InlineDiffStyle;

/** Options the view settings show as a checkbox. */
type CheckboxSetting =
  | typeof DiffwiseUserSetting.HideUnchangedLines
  | typeof DiffwiseUserSetting.WrapLines
  | typeof DiffwiseUserSetting.ShowAllWhitespace;

/** A value of an option with the text of its button. */
interface ChoiceDefinition {
  readonly value: string;
  readonly label: keyof UiTexts;
}

/** An option the view settings show as a group of buttons, with the text of its name. */
interface ChoiceGroupDefinition {
  readonly setting: ChoiceSetting;
  readonly label: keyof UiTexts;
  readonly choices: readonly ChoiceDefinition[];
  /** True for buttons two in a row. */
  readonly isInPairs?: boolean;
}

/**
 * The value of the button of the colors of the app, which is not a palette: it takes back the
 * palette the user has chosen.
 */
const CUSTOM_COLORS_CHOICE = 'custom';

/** The groups of buttons, in the order the view settings show them. */
const CHOICE_GROUPS: readonly ChoiceGroupDefinition[] = [
  {
    setting: DiffwiseUserSetting.ColorMode,
    label: 'colorModeLabel',
    choices: [
      { value: DiffwiseColorMode.Auto, label: 'autoColorModeLabel' },
      { value: DiffwiseColorMode.Light, label: 'lightColorModeLabel' },
      { value: DiffwiseColorMode.Dark, label: 'darkColorModeLabel' },
    ],
  },
  {
    setting: DiffwiseUserSetting.DiffPalette,
    label: 'diffPaletteLabel',
    choices: [
      { value: DiffwisePalette.Default, label: 'defaultDiffPaletteLabel' },
      { value: DiffwisePalette.Colorblind, label: 'colorblindDiffPaletteLabel' },
      { value: DiffwisePalette.HighContrast, label: 'highContrastDiffPaletteLabel' },
      { value: CUSTOM_COLORS_CHOICE, label: 'customDiffPaletteLabel' },
    ],
    isInPairs: true,
  },
  {
    setting: DiffwiseUserSetting.TextFont,
    label: 'textFontLabel',
    choices: [
      { value: DiffwiseTextFont.Monospace, label: 'monospaceTextFontLabel' },
      { value: DiffwiseTextFont.Proportional, label: 'proportionalTextFontLabel' },
    ],
  },
  {
    setting: DiffwiseUserSetting.Layout,
    label: 'layoutLabel',
    choices: [
      { value: DiffwiseLayout.Auto, label: 'autoLayoutLabel' },
      { value: DiffwiseLayout.SideBySide, label: 'sideBySideLayoutLabel' },
      { value: DiffwiseLayout.Inline, label: 'inlineLayoutLabel' },
    ],
  },
  {
    setting: DiffwiseUserSetting.InlineDiffStyle,
    label: 'inlineDiffStyleLabel',
    choices: [
      { value: DiffwiseInlineDiffStyle.Merged, label: 'mergedInlineDiffLabel' },
      { value: DiffwiseInlineDiffStyle.Strikethrough, label: 'strikethroughInlineDiffLabel' },
      { value: DiffwiseInlineDiffStyle.Stacked, label: 'stackedInlineDiffLabel' },
    ],
  },
];

/** An option the view settings show as a checkbox, with the text of its name. */
interface CheckboxDefinition {
  readonly setting: CheckboxSetting;
  readonly label: keyof UiTexts;
}

/** The checkboxes, in the order the view settings show them, under the groups of buttons. */
const CHECKBOXES: readonly CheckboxDefinition[] = [
  { setting: DiffwiseUserSetting.HideUnchangedLines, label: 'hideUnchangedLinesLabel' },
  { setting: DiffwiseUserSetting.WrapLines, label: 'wrapLinesLabel' },
  { setting: DiffwiseUserSetting.ShowAllWhitespace, label: 'showAllWhitespaceLabel' },
];

/** A checkbox as the template shows it. */
interface ShownCheckbox {
  readonly setting: CheckboxSetting;
  readonly label: string;
  readonly isChecked: boolean;
}

/** A button of one value as the template shows it. */
interface ShownChoice {
  readonly value: string;
  readonly label: string;
  readonly isChosen: boolean;
  /** True while the button does nothing, such as the colors of an app that gives none. */
  readonly isDisabled: boolean;
}

/** A group of buttons as the template shows it. */
interface ShownChoiceGroup {
  readonly setting: ChoiceSetting;
  readonly label: string;
  /** Id of the name of the group, which names the group for screen readers. */
  readonly labelId: string;
  readonly choices: readonly ShownChoice[];
  readonly isInPairs: boolean;
}

const VIEW_SETTINGS_ID_END = '-view-settings';
const ID_SEPARATOR = '-';
const OPEN_STATE = 'open';
const RIGHT_TO_LEFT = 'rtl';
const SCROLL_EVENT = 'scroll';
const RESIZE_EVENT = 'resize';
const PIXEL_UNIT = 'px';

/** Space between the view settings and their button, in px. */
const BUTTON_GAP = 6;

/** Least space between the view settings and the edges of the window, in px. */
const WINDOW_MARGIN = 8;

/** Names of the elements in the template that the class reads. */
const BUTTON_REFERENCE = 'button';
const VIEW_SETTINGS_REFERENCE = 'viewSettings';

/**
 * The button of the view settings in the toolbar and the settings it opens, in the top layer of the
 * page: the options the app allows the user to change, and a button that takes the choices back.
 * The browser closes them on Escape, which brings the focus back to the button, and on a click
 * elsewhere.
 */
@Component({
  selector: 'diffwise-view-settings',
  templateUrl: './view-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ViewSettings {
  /** Starts the ids of the view settings, so that each diff on the page has its own. */
  readonly idPrefix = input.required<string>();

  /** Options the user can change. */
  readonly allowed = input.required<readonly DiffwiseUserSetting[]>();

  /** The options in effect, with the choices of the user; the chosen buttons show them. */
  readonly config = input.required<DiffwiseConfig>();

  /** True when the diff shows a single column, where the style of its changed lines shows. */
  readonly showsSingleColumn = input.required<boolean>();

  /** True when the app gives colors of changes for the theme shown, which the user can choose. */
  readonly hasCustomColors = input.required<boolean>();

  /** True while the colors of the app are in effect: the user has chosen no palette. */
  readonly showsCustomColors = input.required<boolean>();

  /** Texts of the interface in its language. */
  readonly texts = input.required<UiTexts>();

  /** The user chooses a value of an option. */
  readonly settingsChange = output<UserChoices>();

  /** The user takes back the choice of an option: the palette, to see the colors of the app. */
  readonly settingWithdraw = output<DiffwiseUserSetting>();

  /** The user takes back all choices. */
  readonly settingsReset = output<void>();

  /** The view settings open. */
  readonly opened = output<void>();

  /** Id of the view settings, which their button opens. */
  protected readonly viewSettingsId = computed(() => this.idPrefix() + VIEW_SETTINGS_ID_END);

  /** True while the view settings are open. */
  protected readonly isOpen = signal(false);

  /** The groups of buttons of the allowed options. */
  protected readonly choiceGroups = computed<readonly ShownChoiceGroup[]>(() => {
    const allowed = this.allowed();
    const allowedGroups = CHOICE_GROUPS.filter(({ setting }) => allowed.includes(setting));

    return allowedGroups.map((group) => this.shownGroup(group));
  });

  /** The checkboxes of the allowed options. */
  protected readonly checkboxes = computed<readonly ShownCheckbox[]>(() => {
    const allowed = this.allowed();
    const texts = this.texts();
    const config = this.config();
    const allowedCheckboxes = CHECKBOXES.filter(({ setting }) => allowed.includes(setting));

    return allowedCheckboxes.map(({ setting, label }) => ({
      setting,
      label: texts[label],
      isChecked: config[setting],
    }));
  });

  private readonly button = viewChild.required<ElementRef<HTMLElement>>(BUTTON_REFERENCE);
  private readonly viewSettings =
    viewChild.required<ElementRef<HTMLElement>>(VIEW_SETTINGS_REFERENCE);

  /** Listens to the page while the view settings are open: they follow their button. */
  private pageListeners: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopFollowingButton());
  }

  /**
   * Chooses a value of an option; the values of the buttons are values of their options, except
   * the colors of the app, which take back the chosen palette.
   */
  protected choose(setting: ChoiceSetting, value: string): void {
    if (value === CUSTOM_COLORS_CHOICE) {
      this.settingWithdraw.emit(setting);
    } else {
      this.settingsChange.emit({ [setting]: value } as UserChoices);
    }
  }

  /** Passes on the choice of a checkbox. */
  protected chooseCheckbox(setting: CheckboxSetting, event: Event): void {
    const { checked } = event.target as HTMLInputElement;
    this.settingsChange.emit({ [setting]: checked } as UserChoices);
  }

  /**
   * Places the view settings by their button when they open, and moves the focus into them, as
   * into a dialog; the browser opens and closes them.
   */
  protected followToggle(event: Event): void {
    const isOpen = (event as ToggleEvent).newState === OPEN_STATE;

    this.isOpen.set(isOpen);

    if (isOpen) {
      this.placeByButton();
      this.followButton();
      this.viewSettings().nativeElement.focus({ preventScroll: true });
      this.opened.emit();
    } else {
      this.stopFollowingButton();
    }
  }

  /** A group of choices as the view settings show it, in the language of the interface. */
  private shownGroup(group: ChoiceGroupDefinition): ShownChoiceGroup {
    const { setting, label, choices, isInPairs = false } = group;
    const texts = this.texts();
    const chosenValue = this.chosenValue(setting);
    const isGroupDisabled =
      setting === DiffwiseUserSetting.InlineDiffStyle && !this.showsSingleColumn();
    const labelId = this.viewSettingsId() + ID_SEPARATOR + setting;
    const shownChoices = choices.map(({ value, label: choiceLabel }) => {
      const isChosen = value === chosenValue;
      const isDisabled =
        isGroupDisabled || (value === CUSTOM_COLORS_CHOICE && !this.hasCustomColors());

      return { value, label: texts[choiceLabel], isChosen, isDisabled };
    });

    return { setting, label: texts[label], labelId, choices: shownChoices, isInPairs };
  }

  /** The value in effect: of the option, or the colors of the app in place of a palette. */
  private chosenValue(setting: ChoiceSetting): string {
    const isPalette = setting === DiffwiseUserSetting.DiffPalette;
    const isCustomPalette = isPalette && this.showsCustomColors();

    return isCustomPalette ? CUSTOM_COLORS_CHOICE : this.config()[setting];
  }

  /** Places the view settings again when the page scrolls or the window changes its size. */
  private followButton(): void {
    this.stopFollowingButton();
    this.pageListeners = new AbortController();

    const page = this.button().nativeElement.ownerDocument;
    const { signal } = this.pageListeners;
    const options = { capture: true, passive: true, signal };

    page.addEventListener(SCROLL_EVENT, () => this.placeByButton(), options);
    page.defaultView?.addEventListener(RESIZE_EVENT, () => this.placeByButton(), options);
  }

  /** Stops placing the view settings again when the page scrolls or the window changes size. */
  private stopFollowingButton(): void {
    this.pageListeners?.abort();
    this.pageListeners = null;
  }

  /**
   * Puts the view settings under their button, with the same end, inside the window; above the
   * button when the window has room only there.
   */
  private placeByButton(): void {
    const button = this.button().nativeElement;
    const viewSettings = this.viewSettings().nativeElement;
    const buttonBox = button.getBoundingClientRect();
    const viewport = button.ownerDocument.documentElement;
    const width = viewSettings.offsetWidth;
    const height = viewSettings.offsetHeight;
    const isRightToLeft = getComputedStyle(button).direction === RIGHT_TO_LEFT;
    const alignedLeft = isRightToLeft ? buttonBox.left : buttonBox.right - width;
    const maxLeft = viewport.clientWidth - width - WINDOW_MARGIN;
    const maxTop = viewport.clientHeight - height - WINDOW_MARGIN;
    const topBelow = buttonBox.bottom + BUTTON_GAP;
    const topAbove = buttonBox.top - height - BUTTON_GAP;
    const opensBelow = topBelow <= maxTop || topAbove < WINDOW_MARGIN;
    const preferredTop = opensBelow ? topBelow : topAbove;
    const left = Math.max(WINDOW_MARGIN, Math.min(alignedLeft, maxLeft));
    const top = Math.max(WINDOW_MARGIN, Math.min(preferredTop, maxTop));

    viewSettings.style.left = left + PIXEL_UNIT;
    viewSettings.style.top = top + PIXEL_UNIT;
  }
}
