import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseColorMode,
  DiffwiseLanguage,
  DiffwiseLayout,
  DiffwiseUserSetting,
} from './config/option-values';
import { Diffwise } from './diffwise';
import { DiffwiseHtmlDiff } from './diffwise-html-diff';
import type { DiffwiseUserSettings } from './user-settings/user-settings';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const LAYOUT_INPUT = 'layout';
const ALLOWED_USER_SETTINGS_INPUT = 'allowedUserSettings';
const WARN_METHOD = 'warn';
const PARAGRAPH_COUNT = 30;
const TOOLBAR_SELECTOR = '.diffwise-html-diff__toolbar';
const NAVIGATION_SELECTOR = '.diffwise-html-diff__navigation';
const VIEW_BUTTON_SELECTOR = '.diffwise-html-diff__view-button';
const VIEW_SETTINGS_SELECTOR = '.diffwise-html-diff__view-settings';
const GROUP_SELECTOR = '.diffwise-html-diff__view-settings-group';
const GROUP_LABEL_SELECTOR = '.diffwise-html-diff__view-settings-label';
const CHOICE_SELECTOR = '.diffwise-html-diff__view-settings-choice';
const CHECKBOX_SELECTOR = '.diffwise-html-diff__view-settings-checkbox';
const RESET_SELECTOR = '.diffwise-html-diff__view-settings-reset';
const COLLAPSED_LINES_SELECTOR = '.diffwise-html-diff__collapsed-lines';
const TOOLTIP_SELECTOR = '.diffwise-html-diff__tooltip';
const TOOLTIP_TITLE_SELECTOR = '.diffwise-html-diff__tooltip-title';
const INLINE_LAYOUT_CLASS = 'diffwise-html-diff--layout-inline';
const STACKED_CLASS = 'diffwise-html-diff--inline-diff-style-stacked';
const DARK_THEME_CLASS = 'diffwise-html-diff--dark-theme';
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
): ComponentFixture<DiffwiseHtmlDiff> {
  const fixture = TestBed.createComponent(DiffwiseHtmlDiff);

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<DiffwiseHtmlDiff>): HTMLElement {
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
function choose(fixture: ComponentFixture<DiffwiseHtmlDiff>, text: string): void {
  choiceOf(elementOf(fixture), text).click();
  fixture.detectChanges();
}

/** Clicks the checkbox of hidden lines and lets the diff show the choice. */
function toggleHiddenLines(fixture: ComponentFixture<DiffwiseHtmlDiff>): void {
  elementOf(fixture).querySelector<HTMLInputElement>(`${CHECKBOX_SELECTOR} input`)?.click();
  fixture.detectChanges();
}

function restoreDefaults(fixture: ComponentFixture<DiffwiseHtmlDiff>): void {
  elementOf(fixture).querySelector<HTMLElement>(RESET_SELECTOR)?.click();
  fixture.detectChanges();
}

/** The texts of the chosen values, in the order of the view settings. */
function chosenOf(element: HTMLElement): (string | undefined)[] {
  return textsOf(element, `${CHOICE_SELECTOR}${PRESSED_SELECTOR}`);
}

/** Lets the view settings follow the browser, which fires `toggle` when it opens or closes them. */
function toggle(fixture: ComponentFixture<DiffwiseHtmlDiff>, newState: string): void {
  const event = Object.assign(new Event(TOGGLE_EVENT), { newState });

  viewSettingsOf(elementOf(fixture))?.dispatchEvent(event);
  fixture.detectChanges();
}

/** Collects the choices the diff emits after each change the user makes. */
function emittedBy(fixture: ComponentFixture<DiffwiseHtmlDiff>): DiffwiseUserSettings[] {
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

describe('DiffwiseHtmlDiff view settings', () => {
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
      'Layout',
      'Changes in a single column',
      'Theme',
    ]);
    expect(textsOf(element, CHOICE_SELECTOR)).toEqual([
      'Auto',
      'Side by side',
      'Single column',
      'Merged',
      'Struck through',
      'Stacked',
      'Auto',
      'Light',
      'Dark',
    ]);
    expect(chosenOf(element)).toEqual(['Auto', 'Merged', 'Light']);
    expect(textsOf(element, CHECKBOX_SELECTOR)).toEqual(['Hide unchanged lines']);
    expect(textsOf(element, RESET_SELECTOR)).toEqual(['Restore defaults']);

    for (const group of groups) {
      const label = element.querySelector(`#${group.getAttribute(ARIA_LABELLEDBY_ATTRIBUTE)}`);
      expect(label?.parentElement).toBe(group);
    }
  });

  it('changes the layout, the changes in a single column, the theme and the hidden lines', () => {
    const fixture = render({ colorMode: DiffwiseColorMode.Light });
    const element = elementOf(fixture);

    choose(fixture, 'Single column');
    expect(element.classList).toContain(INLINE_LAYOUT_CLASS);

    choose(fixture, 'Stacked');
    expect(element.classList).toContain(STACKED_CLASS);

    choose(fixture, 'Dark');
    expect(element.classList).toContain(DARK_THEME_CLASS);

    toggleHiddenLines(fixture);
    expect(element.querySelectorAll(COLLAPSED_LINES_SELECTOR)).toHaveLength(2);
    expect(chosenOf(element)).toEqual(['Single column', 'Stacked', 'Dark']);
  });

  it('lets a choice win over an input of the diff and the global configuration', () => {
    TestBed.inject(Diffwise).updateConfig({ colorMode: DiffwiseColorMode.Dark });

    const fixture = render({ layout: DiffwiseLayout.SideBySide });
    const element = elementOf(fixture);

    choose(fixture, 'Single column');
    choose(fixture, 'Light');
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

    choose(fixture, 'Single column');
    choose(fixture, 'Light');
    toggleHiddenLines(fixture);
    restoreDefaults(fixture);

    expect(element.classList).not.toContain(INLINE_LAYOUT_CLASS);
    expect(element.classList).toContain(DARK_THEME_CLASS);
    expect(element.querySelector(COLLAPSED_LINES_SELECTOR)).toBeNull();
    expect(chosenOf(element)).toEqual(['Side by side', 'Merged', 'Dark']);
  });

  it('shows only the options the app allows, and a choice of another option does nothing there', () => {
    const fixture = render({ colorMode: DiffwiseColorMode.Light });
    const element = elementOf(fixture);

    choose(fixture, 'Dark');
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
    const stackedIsDisabled = () => choiceOf(element, 'Stacked').disabled;

    expect(stackedIsDisabled()).toBe(true);
    expect(choiceOf(element, 'Single column').disabled).toBe(false);

    choose(fixture, 'Single column');
    expect(stackedIsDisabled()).toBe(false);

    choose(fixture, 'Side by side');
    expect(stackedIsDisabled()).toBe(true);
  });

  it('shares the choices between the diffs of the app', () => {
    const first = render();
    const second = render();

    choose(first, 'Single column');
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
    const element = elementOf(render({ language: DiffwiseLanguage.PL }));

    expect(viewButtonOf(element)?.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Widok');
    expect(viewSettingsOf(element)?.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Ustawienia widoku');
    expect(textsOf(element, GROUP_LABEL_SELECTOR)).toEqual([
      'Układ',
      'Zmiany w jednej kolumnie',
      'Motyw',
    ]);
    expect(textsOf(element, CHOICE_SELECTOR)).toEqual([
      'Auto',
      'Obok siebie',
      'Jedna kolumna',
      'Scalone',
      'Przekreślone',
      'Jedna pod drugą',
      'Auto',
      'Jasny',
      'Ciemny',
    ]);
    expect(textsOf(element, CHECKBOX_SELECTOR)).toEqual(['Ukryj niezmienione linie']);
    expect(textsOf(element, RESET_SELECTOR)).toEqual(['Przywróć domyślne']);
  });
});

describe('DiffwiseHtmlDiff choices of the user', () => {
  it('emits all choices after each change, with the number of their format', () => {
    const fixture = render();
    const emitted = emittedBy(fixture);

    choose(fixture, 'Single column');
    choose(fixture, 'Dark');
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

    choose(first, 'Single column');
    second.detectChanges();
    choose(second, 'Light');

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
