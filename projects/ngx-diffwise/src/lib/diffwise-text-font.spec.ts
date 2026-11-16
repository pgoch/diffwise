import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { type DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseNoChangesView,
  DiffwiseTextFont,
  DiffwiseUserSetting,
} from './config/option-values';
import { Diffwise } from './diffwise';
import { DiffwiseHtml } from './diffwise-html';
import { DiffwiseText } from './diffwise-text';
import { type DiffwiseUserSettings } from './user-settings/user-settings';

const OLD_TEXT_INPUT = 'oldText';
const NEW_TEXT_INPUT = 'newText';
const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const WARN_METHOD = 'warn';
const PROPORTIONAL_CLASS = 'diffwise-diff--text-font-proportional';
const CONTENT_SELECTOR = '.diffwise-diff__content';
const CHOICE_SELECTOR = '.diffwise-diff__view-settings-choice';
const GROUP_LABEL_SELECTOR = '.diffwise-diff__view-settings-label';
const RESET_SELECTOR = '.diffwise-diff__view-settings-reset';
const PRESSED_SELECTOR = '[aria-pressed="true"]';
const FIXED_WIDTH = 'Fixed width';
const REGULAR = 'Regular';
const OLD_TEXT = 'sync:\n  interval: 15 minutes';
const NEW_TEXT = 'sync:\n    interval: 30 minutes';
const USER_SETTINGS_VERSION = 1;

/** jsdom has no Popover API; the view settings only need the methods to exist. */
HTMLElement.prototype.showPopover = function () {
  return undefined;
};

HTMLElement.prototype.hidePopover = function () {
  return undefined;
};

/** Renders the text diff of two versions of settings with its options. */
function render(options: DiffwiseConfigOptions = {}): ComponentFixture<DiffwiseText> {
  const fixture = TestBed.createComponent(DiffwiseText);

  fixture.componentRef.setInput(OLD_TEXT_INPUT, OLD_TEXT);
  fixture.componentRef.setInput(NEW_TEXT_INPUT, NEW_TEXT);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

/** Renders the HTML diff of two paragraphs with its options. */
function renderHtml(options: DiffwiseConfigOptions = {}): ComponentFixture<DiffwiseHtml> {
  const fixture = TestBed.createComponent(DiffwiseHtml);

  fixture.componentRef.setInput(OLD_HTML_INPUT, '<p>Sync every 15 minutes.</p>');
  fixture.componentRef.setInput(NEW_HTML_INPUT, '<p>Sync every 30 minutes.</p>');

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function textsOf(element: Element, selector: string): (string | undefined)[] {
  return Array.from(element.querySelectorAll(selector), (found) => found.textContent?.trim());
}

/** Clicks the button of a value in the view settings and lets the diff show the choice. */
function choose(fixture: ComponentFixture<unknown>, text: string): void {
  const choices = elementOf(fixture).querySelectorAll<HTMLButtonElement>(CHOICE_SELECTOR);
  const choice = Array.from(choices).find((button) => button.textContent?.trim() === text);

  if (choice === undefined) {
    throw new Error(`No button "${text}" in the view settings.`);
  }

  choice.click();
  fixture.detectChanges();
}

function restoreDefaults(fixture: ComponentFixture<unknown>): void {
  elementOf(fixture).querySelector<HTMLElement>(RESET_SELECTOR)?.click();
  fixture.detectChanges();
}

/** The texts of the chosen values, in the order of the view settings. */
function chosenOf(fixture: ComponentFixture<unknown>): (string | undefined)[] {
  return textsOf(elementOf(fixture), `${CHOICE_SELECTOR}${PRESSED_SELECTOR}`);
}

function showsProportionalFont(fixture: ComponentFixture<unknown>): boolean {
  return elementOf(fixture).classList.contains(PROPORTIONAL_CLASS);
}

/** HTML of the content of every line, in order. */
function contentHtmlOf(fixture: ComponentFixture<unknown>): string[] {
  const contents = elementOf(fixture).querySelectorAll(CONTENT_SELECTOR);
  return Array.from(contents, (content) => content.innerHTML);
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('DiffwiseText font of the lines', () => {
  it('shows the group of the text font between the colors of changes and the layout', () => {
    expect(textsOf(elementOf(render()), GROUP_LABEL_SELECTOR)).toEqual([
      'Theme',
      'Colors of changes',
      'Text font',
      'Layout',
      'Changes in a single column',
    ]);
  });

  it('shows the lines in a font of fixed width by default', () => {
    const fixture = render();

    expect(showsProportionalFont(fixture)).toBe(false);
    expect(chosenOf(fixture)).toContain(FIXED_WIDTH);
  });

  it('switches the lines to the font of the diff and back', () => {
    const fixture = render();

    choose(fixture, REGULAR);

    expect(showsProportionalFont(fixture)).toBe(true);
    expect(chosenOf(fixture)).toContain(REGULAR);

    choose(fixture, FIXED_WIDTH);

    expect(showsProportionalFont(fixture)).toBe(false);
  });

  it('takes the font from the options of the app, and the choice of the user wins over it', () => {
    const fixture = render({ textFont: DiffwiseTextFont.Proportional });

    expect(showsProportionalFont(fixture)).toBe(true);

    choose(fixture, FIXED_WIDTH);

    expect(showsProportionalFont(fixture)).toBe(false);
  });

  it('tells the app the choice of the font, and takes it back with "Restore defaults"', () => {
    const fixture = render();
    const emitted: DiffwiseUserSettings[] = [];

    fixture.componentInstance.userSettingsChange.subscribe((settings) => emitted.push(settings));
    choose(fixture, REGULAR);
    restoreDefaults(fixture);

    expect(emitted).toEqual([
      { version: USER_SETTINGS_VERSION, settings: { textFont: DiffwiseTextFont.Proportional } },
      { version: USER_SETTINGS_VERSION, settings: {} },
    ]);
    expect(showsProportionalFont(fixture)).toBe(false);
  });

  it('takes the font from the choices that the app imports, and exports it again', () => {
    const diffwise = TestBed.inject(Diffwise);
    const settings = {
      version: USER_SETTINGS_VERSION,
      settings: { textFont: DiffwiseTextFont.Proportional },
    };

    diffwise.importUserSettings(settings);

    expect(showsProportionalFont(render())).toBe(true);
    expect(diffwise.exportUserSettings()).toEqual(settings);
  });

  it('keeps the choice of the font after a reload when the diff remembers the choices', () => {
    choose(render({ rememberUserSettings: true }), REGULAR);
    TestBed.resetTestingModule();

    expect(showsProportionalFont(render({ rememberUserSettings: true }))).toBe(true);
  });

  it('ignores an invalid font, with a warning', () => {
    const fixture = render({ textFont: 'serif' as DiffwiseTextFont });

    expect(showsProportionalFont(fixture)).toBe(false);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('DiffwiseHtml font of text lines', () => {
  it('has no group of the text font, even when the app allows it', () => {
    const allowedUserSettings = [DiffwiseUserSetting.TextFont, DiffwiseUserSetting.Layout];
    const fixture = renderHtml({ allowedUserSettings });

    expect(textsOf(elementOf(fixture), GROUP_LABEL_SELECTOR)).toEqual(['Layout']);
  });

  it('shows the same lines whatever the text font', () => {
    const proportional = renderHtml({ textFont: DiffwiseTextFont.Proportional });

    expect(contentHtmlOf(proportional)).toEqual(contentHtmlOf(renderHtml()));
  });

  it('keeps the choice of the text font of the text diff, which it does not use', () => {
    const textFixture = render({ noChangesView: DiffwiseNoChangesView.Diff });
    const htmlFixture = renderHtml();

    choose(textFixture, REGULAR);
    htmlFixture.detectChanges();

    expect(TestBed.inject(Diffwise).exportUserSettings().settings).toEqual({
      textFont: DiffwiseTextFont.Proportional,
    });
    expect(textsOf(elementOf(htmlFixture), GROUP_LABEL_SELECTOR)).not.toContain('Text font');
  });
});
