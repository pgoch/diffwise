import { APP_BASE_HREF } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseColorMode, DiffwiseLayout, DiffwiseUserSetting } from './config/option-values';
import { provideDiffwise } from './config/provide-diffwise';
import { Diffwise } from './diffwise';
import { DiffwiseHtml } from './diffwise-html';
import type { DiffwiseUserSettings } from './user-settings/user-settings';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const REMEMBER_INPUT = 'rememberUserSettings';
const OLD_HTML = '<p>First paragraph.</p><p>Second paragraph.</p>';
const NEW_HTML = '<p>First paragraph.</p><p>Second changed paragraph.</p>';
const REPORTS_KEY = 'reports';
const ADMIN_PATH = '/admin/';
const ROOT_ENTRY = 'diffwise:user-settings:/';
const REPORTS_ENTRY = 'diffwise:user-settings:reports';
const ADMIN_ENTRY = 'diffwise:user-settings:/admin/';
const SERVER_PLATFORM = 'server';
const WARN_METHOD = 'warn';
const GET_ITEM_METHOD = 'getItem';
const SET_ITEM_METHOD = 'setItem';
const REMOVE_ITEM_METHOD = 'removeItem';
const SECURITY_ERROR = 'SecurityError';
const CHOICE_SELECTOR = '.diffwise-diff__view-settings-choice';
const RESET_SELECTOR = '.diffwise-diff__view-settings-reset';
const INLINE_LAYOUT_CLASS = 'diffwise-diff--layout-inline';
const DARK_THEME_CLASS = 'diffwise-diff--dark-theme';
const SINGLE_COLUMN_TEXT = 'Single column';
const LIGHT_TEXT = 'Light';
const DARK_TEXT = 'Dark';

/** Choices of the single column, as the diff saves them. */
const SINGLE_COLUMN_SETTINGS: DiffwiseUserSettings = {
  version: 1,
  settings: { layout: DiffwiseLayout.Inline },
};

/** Renders the diff of two versions with its options. */
function render(options: DiffwiseConfigOptions = {}): ComponentFixture<DiffwiseHtml> {
  const fixture = TestBed.createComponent(DiffwiseHtml);

  fixture.componentRef.setInput(OLD_HTML_INPUT, OLD_HTML);
  fixture.componentRef.setInput(NEW_HTML_INPUT, NEW_HTML);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

/** Clicks the button of a value in the view settings and lets the diff show the choice. */
function choose(fixture: ComponentFixture<DiffwiseHtml>, text: string): void {
  const choices = elementOf(fixture).querySelectorAll<HTMLButtonElement>(CHOICE_SELECTOR);

  Array.from(choices)
    .find((button) => button.textContent?.trim() === text)
    ?.click();
  fixture.detectChanges();
}

function restoreDefaults(fixture: ComponentFixture<DiffwiseHtml>): void {
  elementOf(fixture).querySelector<HTMLElement>(RESET_SELECTOR)?.click();
  fixture.detectChanges();
}

function elementOf(fixture: ComponentFixture<DiffwiseHtml>): HTMLElement {
  return fixture.nativeElement;
}

function showsSingleColumn(fixture: ComponentFixture<DiffwiseHtml>): boolean {
  return elementOf(fixture).classList.contains(INLINE_LAYOUT_CLASS);
}

/** The value saved in the localStorage entry; `null` without the entry. */
function savedEntry(name: string): unknown {
  const text = localStorage.getItem(name);
  return text === null ? null : JSON.parse(text);
}

function saveEntry(name: string, value: unknown): void {
  localStorage.setItem(name, JSON.stringify(value));
}

/** Starts the app again, as after a reload: the choices in memory are gone, localStorage stays. */
function reload(): void {
  TestBed.resetTestingModule();
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('DiffwiseHtml remembered choices', () => {
  it('brings the choices back after a reload when the diff remembers them', () => {
    choose(render({ rememberUserSettings: true }), SINGLE_COLUMN_TEXT);

    expect(savedEntry(ROOT_ENTRY)).toEqual(SINGLE_COLUMN_SETTINGS);

    reload();

    expect(showsSingleColumn(render({ rememberUserSettings: true }))).toBe(true);
  });

  it('keeps nothing in localStorage when the diff does not remember the choices', () => {
    choose(render(), SINGLE_COLUMN_TEXT);

    expect(localStorage.length).toBe(0);
  });

  it('reads no saved choices when the diff does not remember them', () => {
    saveEntry(ROOT_ENTRY, SINGLE_COLUMN_SETTINGS);

    expect(showsSingleColumn(render())).toBe(false);
  });

  it('keeps the choices under the key of the diff, apart from the choices of other keys', () => {
    const reports = render({ rememberUserSettings: true, userSettingsKey: REPORTS_KEY });
    const other = render({ rememberUserSettings: true });

    choose(reports, SINGLE_COLUMN_TEXT);
    other.detectChanges();

    expect(showsSingleColumn(other)).toBe(false);
    expect(savedEntry(REPORTS_ENTRY)).toEqual(SINGLE_COLUMN_SETTINGS);
    expect(localStorage.length).toBe(1);
  });

  it('keeps the choices under the base path of the app without a key', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: APP_BASE_HREF, useValue: ADMIN_PATH }],
    });

    choose(render({ rememberUserSettings: true }), SINGLE_COLUMN_TEXT);

    expect(savedEntry(ADMIN_ENTRY)).toEqual(SINGLE_COLUMN_SETTINGS);
  });

  it('saves the choices made before remembering them was turned on', async () => {
    const fixture = render();

    choose(fixture, SINGLE_COLUMN_TEXT);
    fixture.componentRef.setInput(REMEMBER_INPUT, true);
    await fixture.whenStable();

    expect(savedEntry(ROOT_ENTRY)).toEqual(SINGLE_COLUMN_SETTINGS);
  });

  it('takes the saved choices out of localStorage with "Restore defaults"', () => {
    saveEntry(ROOT_ENTRY, SINGLE_COLUMN_SETTINGS);
    const fixture = render({ rememberUserSettings: true });

    expect(showsSingleColumn(fixture)).toBe(true);

    restoreDefaults(fixture);

    expect(showsSingleColumn(fixture)).toBe(false);
    expect(localStorage.getItem(ROOT_ENTRY)).toBeNull();
  });

  it('applies only the saved choices of the options the app allows now, and keeps the others saved', () => {
    saveEntry(ROOT_ENTRY, {
      version: 1,
      settings: { layout: DiffwiseLayout.Inline, colorMode: DiffwiseColorMode.Dark },
    });
    const fixture = render({
      rememberUserSettings: true,
      allowedUserSettings: [DiffwiseUserSetting.ColorMode],
    });

    choose(fixture, LIGHT_TEXT);

    expect(showsSingleColumn(fixture)).toBe(false);
    expect(elementOf(fixture).classList).not.toContain(DARK_THEME_CLASS);
    expect(savedEntry(ROOT_ENTRY)).toEqual({
      version: 1,
      settings: { layout: DiffwiseLayout.Inline, colorMode: DiffwiseColorMode.Light },
    });
  });

  it('works as usual when the browser blocks localStorage', () => {
    for (const method of [GET_ITEM_METHOD, SET_ITEM_METHOD, REMOVE_ITEM_METHOD] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new DOMException(SECURITY_ERROR, SECURITY_ERROR);
      });
    }

    const fixture = render({ rememberUserSettings: true });

    choose(fixture, SINGLE_COLUMN_TEXT);

    expect(showsSingleColumn(fixture)).toBe(true);

    restoreDefaults(fixture);

    expect(showsSingleColumn(fixture)).toBe(false);
  });

  it('renders on the server with the options of the app, without localStorage', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: SERVER_PLATFORM }],
    });
    saveEntry(ROOT_ENTRY, SINGLE_COLUMN_SETTINGS);
    const getItem = vi.spyOn(Storage.prototype, GET_ITEM_METHOD);

    expect(showsSingleColumn(render({ rememberUserSettings: true }))).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
  });

  it('remembers the choices when the global configuration says so', () => {
    TestBed.configureTestingModule({
      providers: [provideDiffwise({ rememberUserSettings: true })],
    });

    choose(render(), SINGLE_COLUMN_TEXT);

    expect(savedEntry(ROOT_ENTRY)).toEqual(SINGLE_COLUMN_SETTINGS);
  });
});

describe('Diffwise choices of the user', () => {
  it('exports the same object as the last event of the diff', () => {
    const fixture = render();
    const emitted: DiffwiseUserSettings[] = [];

    fixture.componentInstance.userSettingsChange.subscribe((settings) => emitted.push(settings));
    choose(fixture, SINGLE_COLUMN_TEXT);
    choose(fixture, DARK_TEXT);

    expect(TestBed.inject(Diffwise).exportUserSettings()).toEqual(emitted.at(-1));
  });

  it('exports no choices before the first one, and the saved ones when the app remembers them', () => {
    expect(TestBed.inject(Diffwise).exportUserSettings()).toEqual({ version: 1, settings: {} });

    reload();
    saveEntry(ROOT_ENTRY, SINGLE_COLUMN_SETTINGS);
    TestBed.configureTestingModule({
      providers: [provideDiffwise({ rememberUserSettings: true })],
    });

    expect(TestBed.inject(Diffwise).exportUserSettings()).toEqual(SINGLE_COLUMN_SETTINGS);
  });

  it('imports choices that the diffs follow at once, without an event', () => {
    const fixture = render();
    const emitted: DiffwiseUserSettings[] = [];

    fixture.componentInstance.userSettingsChange.subscribe((settings) => emitted.push(settings));
    TestBed.inject(Diffwise).importUserSettings(SINGLE_COLUMN_SETTINGS);
    fixture.detectChanges();

    expect(showsSingleColumn(fixture)).toBe(true);
    expect(emitted).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it('imports choices in place of the current ones, and saves them when the app remembers them', () => {
    TestBed.configureTestingModule({
      providers: [provideDiffwise({ rememberUserSettings: true })],
    });
    const diffwise = TestBed.inject(Diffwise);
    const darkSettings = { version: 1, settings: { colorMode: DiffwiseColorMode.Dark } };

    diffwise.importUserSettings(SINGLE_COLUMN_SETTINGS);
    diffwise.importUserSettings(darkSettings);

    expect(diffwise.exportUserSettings()).toEqual(darkSettings);
    expect(savedEntry(ROOT_ENTRY)).toEqual(darkSettings);
  });

  it('leaves out of an import invalid values and options the app does not allow', () => {
    TestBed.configureTestingModule({
      providers: [provideDiffwise({ allowedUserSettings: [DiffwiseUserSetting.Layout] })],
    });
    const diffwise = TestBed.inject(Diffwise);
    const settings = {
      version: 1,
      settings: { layout: DiffwiseLayout.Inline, colorMode: DiffwiseColorMode.Dark },
    };

    diffwise.importUserSettings(settings);

    expect(diffwise.exportUserSettings()).toEqual(SINGLE_COLUMN_SETTINGS);

    diffwise.importUserSettings({ version: 1, settings: { layout: 'columns' } as object });

    expect(diffwise.exportUserSettings()).toEqual({ version: 1, settings: {} });
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('ignores an import in a format of an unknown version, with a warning', () => {
    const diffwise = TestBed.inject(Diffwise);

    diffwise.importUserSettings(SINGLE_COLUMN_SETTINGS);
    diffwise.importUserSettings({ version: 2, settings: { colorMode: DiffwiseColorMode.Dark } });

    expect(diffwise.exportUserSettings()).toEqual(SINGLE_COLUMN_SETTINGS);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('resets the choices, also in localStorage, and the diffs follow at once', () => {
    saveEntry(ROOT_ENTRY, SINGLE_COLUMN_SETTINGS);
    const fixture = render({ rememberUserSettings: true });

    TestBed.inject(Diffwise).resetUserSettings();
    fixture.detectChanges();

    expect(showsSingleColumn(fixture)).toBe(false);
    expect(localStorage.getItem(ROOT_ENTRY)).toBeNull();
  });

  it('exports, imports and resets the choices under the given key only', () => {
    const diffwise = TestBed.inject(Diffwise);
    const reports = render({ userSettingsKey: REPORTS_KEY });
    const other = render();

    diffwise.importUserSettings(SINGLE_COLUMN_SETTINGS, REPORTS_KEY);
    reports.detectChanges();
    other.detectChanges();

    expect(showsSingleColumn(reports)).toBe(true);
    expect(showsSingleColumn(other)).toBe(false);
    expect(diffwise.exportUserSettings()).toEqual({ version: 1, settings: {} });

    diffwise.resetUserSettings();

    expect(diffwise.exportUserSettings(REPORTS_KEY)).toEqual(SINGLE_COLUMN_SETTINGS);

    diffwise.resetUserSettings(REPORTS_KEY);

    expect(diffwise.exportUserSettings(REPORTS_KEY)).toEqual({ version: 1, settings: {} });
  });

  it('takes the key of the global configuration without a given key', () => {
    TestBed.configureTestingModule({
      providers: [provideDiffwise({ userSettingsKey: REPORTS_KEY })],
    });
    const fixture = render();

    TestBed.inject(Diffwise).importUserSettings(SINGLE_COLUMN_SETTINGS, REPORTS_KEY);
    fixture.detectChanges();

    expect(showsSingleColumn(fixture)).toBe(true);
    expect(TestBed.inject(Diffwise).exportUserSettings()).toEqual(SINGLE_COLUMN_SETTINGS);
  });
});
