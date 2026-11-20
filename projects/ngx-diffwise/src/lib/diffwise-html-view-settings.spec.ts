import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseColorMode,
  DiffwiseLanguage,
  DiffwiseLayout,
  DiffwisePalette,
  DiffwiseUserSetting,
} from './config/option-values';
import { provideDiffwiseLanguages } from './config/provide-diffwise-languages';
import { Diffwise } from './diffwise';
import { DiffwiseHtml } from './diffwise-html';
import { diffwisePolish } from './i18n/languages';
import type { DiffwiseUserSettings } from './user-settings/user-settings';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const LAYOUT_INPUT = 'layout';
const ALLOWED_USER_SETTINGS_INPUT = 'allowedUserSettings';
const WARN_METHOD = 'warn';
const PARAGRAPH_COUNT = 30;
const TOOLBAR_SELECTOR = '.diffwise-diff__toolbar';
const NAVIGATION_SELECTOR = '.diffwise-diff__navigation';
const VIEW_BUTTON_SELECTOR = '.diffwise-diff__view-button';
const VIEW_SETTINGS_SELECTOR = '.diffwise-diff__view-settings';
const GROUP_SELECTOR = '.diffwise-diff__view-settings-group';
const GROUP_LABEL_SELECTOR = '.diffwise-diff__view-settings-label';
const CHOICE_SELECTOR = '.diffwise-diff__view-settings-choice';
const CHECKBOX_SELECTOR = '.diffwise-diff__view-settings-checkbox';
const RESET_SELECTOR = '.diffwise-diff__view-settings-reset';
const COLLAPSED_LINES_SELECTOR = '.diffwise-diff__collapsed-lines';
const TOOLTIP_SELECTOR = '.diffwise-diff__tooltip';
const TOOLTIP_TITLE_SELECTOR = '.diffwise-diff__tooltip-title';
const INLINE_LAYOUT_CLASS = 'diffwise-diff--layout-inline';
const STACKED_CLASS = 'diffwise-diff--inline-diff-style-stacked';
const DARK_THEME_CLASS = 'diffwise-diff--dark-theme';
const COLORBLIND_PALETTE_CLASS = 'diffwise-diff--diff-palette-colorblind';
const HIGH_CONTRAST_PALETTE_CLASS = 'diffwise-diff--diff-palette-high-contrast';
const PAIRS_CLASS = 'diffwise-diff__view-settings-group--pairs';
const ADDED_ACCENT_VARIABLE = '--diffwise-added-accent';
const APP_ACCENT = '#0f766e';
const PRESSED_SELECTOR = '[aria-pressed="true"]';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const ARIA_LABELLEDBY_ATTRIBUTE = 'aria-labelledby';
const ARIA_EXPANDED_ATTRIBUTE = 'aria-expanded';
const ARIA_CONTROLS_ATTRIBUTE = 'aria-controls';
const POPOVER_TARGET_ATTRIBUTE = 'popovertarget';
const POPOVER_ATTRIBUTE = 'popover';
const ROLE_ATTRIBUTE = 'role';
const MOUSEOVER_EVENT = 'mouseover';
const TOGGLE_EVENT = 'toggle';
const OPEN_STATE = 'open';
const CLOSED_STATE = 'closed';

/** Labels of choices in English, by which the tests choose them and check which are chosen. */
const AUTO_CHOICE = 'Auto';
const LIGHT_CHOICE = 'Light';
const DARK_CHOICE = 'Dark';
const STANDARD_CHOICE = 'Standard';
const COLORBLIND_CHOICE = 'Colorblind-friendly';
const HIGH_CONTRAST_CHOICE = 'High contrast';
const CUSTOM_CHOICE = 'Custom';
const SIDE_BY_SIDE_CHOICE = 'Side by side';
const SINGLE_COLUMN_CHOICE = 'Single column';
const MERGED_CHOICE = 'Merged';
const STACKED_CHOICE = 'Stacked';

/** Thirty paragraphs with one change, in paragraph 15; lines far from it can hide. */
const OLD_HTML = paragraphs(null);
const NEW_HTML = paragraphs(15);

/** Open popovers; jsdom has no Popover API, so tests define it and record the calls instead. */
const openPopovers = new Set<Element>();

HTMLElement.prototype.showPopover = function (this: HTMLElement) {
  openPopovers.add(this);
};

HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
  openPopovers.delete(this);
};

/** Paragraphs numbered from 1, with another word in the paragraph of the given number. */
function paragraphs(changedNumber: number | null): string {
  return Array.from({ length: PARAGRAPH_COUNT }, (_, index) => {
    const number = index + 1;
    const word = number === changedNumber ? 'changed' : 'sample';

    return `<p>Paragraph ${number} of the ${word} text.</p>`;
  }).join('');
}

/** Renders the diff of the versions with its options. */
function render(
  options: DiffwiseConfigOptions = {},
  oldHtml = OLD_HTML,
  newHtml = NEW_HTML,
): ComponentFixture<DiffwiseHtml> {
  const fixture = TestBed.createComponent(DiffwiseHtml);

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<DiffwiseHtml>): HTMLElement {
  return fixture.nativeElement;
}

function viewButtonOf(element: HTMLElement): HTMLElement | null {
  return element.querySelector<HTMLElement>(VIEW_BUTTON_SELECTOR);
}

function viewSettingsOf(element: HTMLElement): HTMLElement | null {
  return element.querySelector<HTMLElement>(VIEW_SETTINGS_SELECTOR);
}

function textsOf(element: Element, selector: string): (string | undefined)[] {
  return Array.from(element.querySelectorAll(selector), (found) => found.textContent?.trim());
}

/** The button of a value in the view settings, by its text. */
function choiceOf(element: HTMLElement, text: string): HTMLButtonElement {
  const choices = element.querySelectorAll<HTMLButtonElement>(CHOICE_SELECTOR);
  const choice = Array.from(choices).find((button) => button.textContent?.trim() === text);

  if (choice === undefined) {
    throw new Error(`No button "${text}" in the view settings.`);
  }

  return choice;
}

/** Clicks the button of a value in the view settings and lets the diff show the choice. */
function choose(fixture: ComponentFixture<DiffwiseHtml>, text: string): void {
  choiceOf(elementOf(fixture), text).click();
  fixture.detectChanges();
}

/** Clicks the checkbox of hidden lines and lets the diff show the choice. */
function toggleHiddenLines(fixture: ComponentFixture<DiffwiseHtml>): void {
  elementOf(fixture).querySelector<HTMLInputElement>(`${CHECKBOX_SELECTOR} input`)?.click();
  fixture.detectChanges();
}

function restoreDefaults(fixture: ComponentFixture<DiffwiseHtml>): void {
  elementOf(fixture).querySelector<HTMLElement>(RESET_SELECTOR)?.click();
  fixture.detectChanges();
}

/** The texts of the chosen values, in the order of the view settings. */
function chosenOf(element: HTMLElement): (string | undefined)[] {
  return textsOf(element, `${CHOICE_SELECTOR}${PRESSED_SELECTOR}`);
}

/** Lets the view settings follow the browser, which fires `toggle` when it opens or closes them. */
function toggle(fixture: ComponentFixture<DiffwiseHtml>, newState: string): void {
  const event = Object.assign(new Event(TOGGLE_EVENT), { newState });

  viewSettingsOf(elementOf(fixture))?.dispatchEvent(event);
  fixture.detectChanges();
}

/** Collects the choices the diff emits after each change the user makes. */
function emittedBy(fixture: ComponentFixture<DiffwiseHtml>): DiffwiseUserSettings[] {
  const emitted: DiffwiseUserSettings[] = [];

  fixture.componentInstance.userSettingsChange.subscribe((settings) => emitted.push(settings));

  return emitted;
}

function hover(element: Element): void {
  element.dispatchEvent(new MouseEvent(MOUSEOVER_EVENT, { bubbles: true }));
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  openPopovers.clear();
});

describe('DiffwiseHtml view settings', () => {
  it('shows a named button at the end of the toolbar, which opens the view settings', () => {
    const element = elementOf(render());
    const toolbar = element.querySelector(TOOLBAR_SELECTOR);
    const button = viewButtonOf(element);
    const viewSettings = viewSettingsOf(element);

    expect(toolbar?.lastElementChild?.contains(button)).toBe(true);
    expect(button?.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('View');
    expect(button?.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe('false');
    expect(button?.getAttribute(POPOVER_TARGET_ATTRIBUTE)).toBe(viewSettings?.id);
    expect(button?.getAttribute(ARIA_CONTROLS_ATTRIBUTE)).toBe(viewSettings?.id);
    expect(viewSettings?.getAttribute(POPOVER_ATTRIBUTE)).toBe('auto');
    expect(viewSettings?.getAttribute(ROLE_ATTRIBUTE)).toBe('dialog');
    expect(viewSettings?.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('View settings');
  });

  it('shows the options with the values of the app chosen, each group named by its label', () => {
    const element = elementOf(render({ colorMode: DiffwiseColorMode.Light }));
    const groups = Array.from(element.querySelectorAll(GROUP_SELECTOR));

    expect(textsOf(element, GROUP_LABEL_SELECTOR)).toEqual([
      'Theme',
      'Colors of changes',
      'Layout',
      'Changes in a single column',
    ]);
    expect(textsOf(element, CHOICE_SELECTOR)).toEqual([
      'Auto',
      'Light',
      'Dark',
      'Standard',
      'Colorblind-friendly',
      'High contrast',
      'Custom',
      'Auto',
      'Side by side',
      'Single column',
      'Merged',
      'Struck through',
      'Stacked',
    ]);
    expect(chosenOf(element)).toEqual([LIGHT_CHOICE, STANDARD_CHOICE, AUTO_CHOICE, MERGED_CHOICE]);
    expect(textsOf(element, CHECKBOX_SELECTOR)).toEqual(['Hide unchanged lines']);
    expect(textsOf(element, RESET_SELECTOR)).toEqual(['Restore defaults']);

    for (const group of groups) {
      const label = element.querySelector(`#${group.getAttribute(ARIA_LABELLEDBY_ATTRIBUTE)}`);
      expect(label?.parentElement).toBe(group);
    }
  });

  it('changes the theme, the colors of changes, the layout, the changes in a single column and the hidden lines', () => {
    const fixture = render({ colorMode: DiffwiseColorMode.Light });
    const element = elementOf(fixture);

    choose(fixture, DARK_CHOICE);
    expect(element.classList).toContain(DARK_THEME_CLASS);

    choose(fixture, COLORBLIND_CHOICE);
    expect(element.classList).toContain(COLORBLIND_PALETTE_CLASS);

    choose(fixture, SINGLE_COLUMN_CHOICE);
    expect(element.classList).toContain(INLINE_LAYOUT_CLASS);

    choose(fixture, STACKED_CHOICE);
    expect(element.classList).toContain(STACKED_CLASS);

    toggleHiddenLines(fixture);
    expect(element.querySelectorAll(COLLAPSED_LINES_SELECTOR)).toHaveLength(2);
    expect(chosenOf(element)).toEqual([
      DARK_CHOICE,
      COLORBLIND_CHOICE,
      SINGLE_COLUMN_CHOICE,
      STACKED_CHOICE,
    ]);
  });

  it('lets a choice of the colors of changes win over the palette of the app', () => {
    const fixture = render({ diffPalette: DiffwisePalette.Colorblind });
    const element = elementOf(fixture);

    expect(element.classList).toContain(COLORBLIND_PALETTE_CLASS);
    expect(chosenOf(element)).toContain(COLORBLIND_CHOICE);

    choose(fixture, STANDARD_CHOICE);

    expect(element.classList).not.toContain(COLORBLIND_PALETTE_CLASS);
    expect(chosenOf(element)).toContain(STANDARD_CHOICE);
  });

  it('shows the colors of changes two in a row, and the high contrast palette', () => {
    const fixture = render();
    const element = elementOf(fixture);
    const pairGroups = element.querySelectorAll(`.${PAIRS_CLASS}`);

    expect(pairGroups).toHaveLength(1);
    expect(pairGroups[0]?.querySelector(GROUP_LABEL_SELECTOR)?.textContent?.trim()).toBe(
      'Colors of changes',
    );

    choose(fixture, HIGH_CONTRAST_CHOICE);

    expect(element.classList).toContain(HIGH_CONTRAST_PALETTE_CLASS);
    expect(chosenOf(element)).toContain(HIGH_CONTRAST_CHOICE);
  });

  it('disables the custom colors when the app gives none for the theme shown', () => {
    const fixture = render({
      colorMode: DiffwiseColorMode.Light,
      diffColors: { dark: { addedAccent: APP_ACCENT } },
    });
    const element = elementOf(fixture);

    expect(choiceOf(element, CUSTOM_CHOICE).disabled).toBe(true);
    expect(choiceOf(element, STANDARD_CHOICE).disabled).toBe(false);
    expect(chosenOf(element)).toContain(STANDARD_CHOICE);

    choose(fixture, DARK_CHOICE);

    expect(choiceOf(element, CUSTOM_CHOICE).disabled).toBe(false);
    expect(chosenOf(element)).toEqual([DARK_CHOICE, CUSTOM_CHOICE, AUTO_CHOICE, MERGED_CHOICE]);
  });

  it('chooses the colors of the app, until the user chooses a palette, and back', () => {
    const fixture = render({
      diffPalette: DiffwisePalette.Colorblind,
      diffColors: { light: { addedAccent: APP_ACCENT }, dark: { addedAccent: APP_ACCENT } },
    });
    const element = elementOf(fixture);
    const emitted = emittedBy(fixture);
    const accent = () => element.style.getPropertyValue(ADDED_ACCENT_VARIABLE);

    expect(chosenOf(element)).toContain(CUSTOM_CHOICE);
    expect(chosenOf(element)).not.toContain(COLORBLIND_CHOICE);
    expect(accent()).toBe(APP_ACCENT);

    choose(fixture, HIGH_CONTRAST_CHOICE);

    expect(element.classList).toContain(HIGH_CONTRAST_PALETTE_CLASS);
    expect(chosenOf(element)).not.toContain(CUSTOM_CHOICE);
    expect(accent()).toBe('');

    choose(fixture, CUSTOM_CHOICE);

    expect(element.classList).toContain(COLORBLIND_PALETTE_CLASS);
    expect(chosenOf(element)).toContain(CUSTOM_CHOICE);
    expect(accent()).toBe(APP_ACCENT);
    expect(emitted.map(({ settings }) => settings)).toEqual([
      { diffPalette: DiffwisePalette.HighContrast },
      {},
    ]);
  });

  it('keeps the colors of the app when the user cannot choose the colors of changes', () => {
    choose(render(), STANDARD_CHOICE);

    const element = elementOf(
      render({
        allowedUserSettings: [DiffwiseUserSetting.Layout],
        diffColors: { light: { addedAccent: APP_ACCENT }, dark: { addedAccent: APP_ACCENT } },
      }),
    );

    expect(element.style.getPropertyValue(ADDED_ACCENT_VARIABLE)).toBe(APP_ACCENT);
  });

  it('lets a choice win over an input of the diff and the global configuration', () => {
    TestBed.inject(Diffwise).updateConfig({ colorMode: DiffwiseColorMode.Dark });

    const fixture = render({ layout: DiffwiseLayout.SideBySide });
    const element = elementOf(fixture);

    choose(fixture, SINGLE_COLUMN_CHOICE);
    choose(fixture, LIGHT_CHOICE);
    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.SideBySide);
    TestBed.inject(Diffwise).updateConfig({ colorMode: DiffwiseColorMode.Dark });
    fixture.detectChanges();

    expect(element.classList).toContain(INLINE_LAYOUT_CLASS);
    expect(element.classList).not.toContain(DARK_THEME_CLASS);
  });

  it('takes back the choices with "Restore defaults", so the options of the app apply again', () => {
    const fixture = render({
      layout: DiffwiseLayout.SideBySide,
      colorMode: DiffwiseColorMode.Dark,
    });
    const element = elementOf(fixture);

    choose(fixture, SINGLE_COLUMN_CHOICE);
    choose(fixture, LIGHT_CHOICE);
    choose(fixture, COLORBLIND_CHOICE);
    toggleHiddenLines(fixture);
    restoreDefaults(fixture);

    expect(element.classList).not.toContain(INLINE_LAYOUT_CLASS);
    expect(element.classList).toContain(DARK_THEME_CLASS);
    expect(element.classList).not.toContain(COLORBLIND_PALETTE_CLASS);
    expect(element.querySelector(COLLAPSED_LINES_SELECTOR)).toBeNull();
    expect(chosenOf(element)).toEqual([
      DARK_CHOICE,
      STANDARD_CHOICE,
      SIDE_BY_SIDE_CHOICE,
      MERGED_CHOICE,
    ]);
  });

  it('shows only the options the app allows, and a choice of another option does nothing there', () => {
    const fixture = render({ colorMode: DiffwiseColorMode.Light });
    const element = elementOf(fixture);

    choose(fixture, DARK_CHOICE);
    fixture.componentRef.setInput(ALLOWED_USER_SETTINGS_INPUT, [
      DiffwiseUserSetting.Layout,
      DiffwiseUserSetting.HideUnchangedLines,
    ]);
    fixture.detectChanges();

    expect(textsOf(element, GROUP_LABEL_SELECTOR)).toEqual(['Layout']);
    expect(textsOf(element, CHECKBOX_SELECTOR)).toEqual(['Hide unchanged lines']);
    expect(element.classList).not.toContain(DARK_THEME_CLASS);

    fixture.componentRef.setInput(ALLOWED_USER_SETTINGS_INPUT, [DiffwiseUserSetting.ColorMode]);
    fixture.detectChanges();

    expect(textsOf(element, GROUP_LABEL_SELECTOR)).toEqual(['Theme']);
    expect(element.querySelector(CHECKBOX_SELECTOR)).toBeNull();
    expect(element.classList).toContain(DARK_THEME_CLASS);
  });

  it('shows no button without allowed options, and keeps the rest of the toolbar', () => {
    const element = elementOf(render({ allowedUserSettings: [] }));

    expect(viewButtonOf(element)).toBeNull();
    expect(viewSettingsOf(element)).toBeNull();
    expect(element.querySelector(NAVIGATION_SELECTOR)).not.toBeNull();
  });

  it('keeps the options the app allows when its list has another value too', () => {
    const allowedUserSettings = ['zoom', DiffwiseUserSetting.Layout] as DiffwiseUserSetting[];
    const element = elementOf(render({ allowedUserSettings }));

    expect(textsOf(element, GROUP_LABEL_SELECTOR)).toEqual(['Layout']);
    expect(console.warn).toHaveBeenCalled();
  });

  it('shows the toolbar with the button alone, without the arrows and the numbers', () => {
    const element = elementOf(render({ showNavigationToolbar: false, showDiffStats: false }));

    expect(element.querySelector(TOOLBAR_SELECTOR)).not.toBeNull();
    expect(viewButtonOf(element)).not.toBeNull();
  });

  it('shows no button when the versions are the same', () => {
    const element = elementOf(render({}, OLD_HTML, OLD_HTML));

    expect(element.querySelector(TOOLBAR_SELECTOR)).not.toBeNull();
    expect(viewButtonOf(element)).toBeNull();
  });

  it('disables the changes in a single column while the diff shows two columns, chosen by any layout', () => {
    const fixture = render();
    const element = elementOf(fixture);
    const stackedIsDisabled = () => choiceOf(element, STACKED_CHOICE).disabled;

    expect(stackedIsDisabled()).toBe(true);
    expect(choiceOf(element, SINGLE_COLUMN_CHOICE).disabled).toBe(false);

    choose(fixture, SINGLE_COLUMN_CHOICE);
    expect(stackedIsDisabled()).toBe(false);

    choose(fixture, SIDE_BY_SIDE_CHOICE);
    expect(stackedIsDisabled()).toBe(true);
  });

  it('shares the choices between the diffs of the app', () => {
    const first = render();
    const second = render();

    choose(first, SINGLE_COLUMN_CHOICE);
    second.detectChanges();

    expect(elementOf(second).classList).toContain(INLINE_LAYOUT_CLASS);

    restoreDefaults(second);
    first.detectChanges();

    expect(elementOf(first).classList).not.toContain(INLINE_LAYOUT_CLASS);
  });

  it('follows the browser that opens and closes the view settings, and takes the focus into them', () => {
    const fixture = render();
    const element = elementOf(fixture);
    const button = viewButtonOf(element);
    const viewSettings = viewSettingsOf(element);

    toggle(fixture, OPEN_STATE);

    expect(button?.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe('true');
    expect(document.activeElement).toBe(viewSettings);
    expect(viewSettings?.style.top).not.toBe('');

    toggle(fixture, CLOSED_STATE);

    expect(button?.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe('false');
  });

  it('shows the name of the button in a tooltip, but not while the view settings are open', () => {
    const fixture = render();
    const element = elementOf(fixture);
    const button = viewButtonOf(element) as HTMLElement;
    const tooltip = element.querySelector(TOOLTIP_SELECTOR) as HTMLElement;

    hover(button);
    expect(openPopovers.has(tooltip)).toBe(true);
    expect(tooltip.querySelector(TOOLTIP_TITLE_SELECTOR)?.textContent?.trim()).toBe('View');

    toggle(fixture, OPEN_STATE);
    expect(openPopovers.has(tooltip)).toBe(false);

    hover(button);
    expect(openPopovers.has(tooltip)).toBe(false);
  });

  it('names the button and the options in Polish', () => {
    TestBed.configureTestingModule({ providers: [provideDiffwiseLanguages(diffwisePolish)] });

    const element = elementOf(render({ language: DiffwiseLanguage.PL }));

    expect(viewButtonOf(element)?.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Widok');
    expect(viewSettingsOf(element)?.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Ustawienia widoku');
    expect(textsOf(element, GROUP_LABEL_SELECTOR)).toEqual([
      'Motyw',
      'Kolory zmian',
      'Układ',
      'Zmiany w jednej kolumnie',
    ]);
    expect(textsOf(element, CHOICE_SELECTOR)).toEqual([
      'Auto',
      'Jasny',
      'Ciemny',
      'Standardowe',
      'Dla daltonistów',
      'Wysoki kontrast',
      'Własne',
      'Auto',
      'Obok siebie',
      'Jedna kolumna',
      'Scalone',
      'Przekreślone',
      'Jedna pod drugą',
    ]);
    expect(textsOf(element, CHECKBOX_SELECTOR)).toEqual(['Ukryj niezmienione linie']);
    expect(textsOf(element, RESET_SELECTOR)).toEqual(['Przywróć domyślne']);
  });
});

describe('DiffwiseHtml choices of the user', () => {
  it('emits all choices after each change, with the number of their format', () => {
    const fixture = render();
    const emitted = emittedBy(fixture);

    choose(fixture, SINGLE_COLUMN_CHOICE);
    choose(fixture, DARK_CHOICE);
    toggleHiddenLines(fixture);
    restoreDefaults(fixture);

    expect(emitted).toEqual([
      { version: 1, settings: { layout: DiffwiseLayout.Inline } },
      {
        version: 1,
        settings: { layout: DiffwiseLayout.Inline, colorMode: DiffwiseColorMode.Dark },
      },
      {
        version: 1,
        settings: {
          layout: DiffwiseLayout.Inline,
          colorMode: DiffwiseColorMode.Dark,
          hideUnchangedLines: true,
        },
      },
      { version: 1, settings: {} },
    ]);
    expect(emitted.every((settings) => Object.isFrozen(settings))).toBe(true);
  });

  it('emits nothing before a choice, and after a change of the options of the app', () => {
    const fixture = render();
    const emitted = emittedBy(fixture);

    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    TestBed.inject(Diffwise).updateConfig({ colorMode: DiffwiseColorMode.Dark });
    fixture.detectChanges();

    expect(emitted).toEqual([]);
  });

  it('emits from the diff where the user chooses, with the choices made in other diffs', () => {
    const first = render();
    const second = render({ allowedUserSettings: [DiffwiseUserSetting.ColorMode] });
    const emittedByFirst = emittedBy(first);
    const emittedBySecond = emittedBy(second);

    choose(first, SINGLE_COLUMN_CHOICE);
    second.detectChanges();
    choose(second, LIGHT_CHOICE);

    expect(emittedByFirst).toEqual([{ version: 1, settings: { layout: DiffwiseLayout.Inline } }]);
    expect(emittedBySecond).toEqual([
      {
        version: 1,
        settings: { layout: DiffwiseLayout.Inline, colorMode: DiffwiseColorMode.Light },
      },
    ]);
    expect(elementOf(second).classList).not.toContain(INLINE_LAYOUT_CLASS);
  });
});
