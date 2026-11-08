import { TestBed } from '@angular/core/testing';

import { ColorScheme, isDarkColorMode, watchDarkMarker } from './color-scheme';
import { DiffwiseColorMode } from './config/option-values';

const CHANGE_EVENT = 'change';
const MATCH_MEDIA = 'matchMedia';
const DIV_TAG = 'div';
const PARAGRAPH_TAG = 'p';
const DARK_CLASS = 'dark';
const DARK_SELECTOR = '.dark';

/** The dark color scheme query of the system, switched by a test as by a user in the settings. */
class FakeDarkSchemeQuery extends EventTarget {
  matches = false;

  switchTo(dark: boolean): void {
    this.matches = dark;
    this.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/** Lets the browser of the tests answer media queries with the fake query. */
function answerMediaQueriesWith(query: FakeDarkSchemeQuery): void {
  Object.defineProperty(window, MATCH_MEDIA, { configurable: true, value: () => query });
}

describe('ColorScheme', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, MATCH_MEDIA);
    document.documentElement.classList.remove(DARK_CLASS);
  });

  it('follows the color scheme of the system', () => {
    const query = new FakeDarkSchemeQuery();

    answerMediaQueriesWith(query);

    const colorScheme = TestBed.inject(ColorScheme);

    expect(colorScheme.systemPrefersDark()).toBe(false);

    query.switchTo(true);

    expect(colorScheme.systemPrefersDark()).toBe(true);
  });

  it('is light where the browser cannot tell the color scheme', () => {
    expect(TestBed.inject(ColorScheme).systemPrefersDark()).toBe(false);
  });

  it('tells whether the automatic mode is dark, by the page marker or by the system', () => {
    const colorScheme = TestBed.inject(ColorScheme);

    expect(colorScheme.autoModeIsDark(DARK_SELECTOR)).toBe(false);

    document.documentElement.classList.add(DARK_CLASS);

    expect(colorScheme.autoModeIsDark(DARK_SELECTOR)).toBe(true);
    expect(colorScheme.autoModeIsDark(null)).toBe(false);
  });
});

describe('isDarkColorMode', () => {
  it('is dark in the dark mode, light in the light one, and asks in the automatic one', () => {
    expect(isDarkColorMode(DiffwiseColorMode.Dark, () => false)).toBe(true);
    expect(isDarkColorMode(DiffwiseColorMode.Light, () => true)).toBe(false);
    expect(isDarkColorMode(DiffwiseColorMode.Auto, () => true)).toBe(true);
  });
});

describe('watchDarkMarker', () => {
  it('reports the marker of an ancestor now and after each change, until it stops', async () => {
    const wrapper = document.createElement(DIV_TAG);
    const element = document.createElement(PARAGRAPH_TAG);
    const reports: boolean[] = [];

    wrapper.append(element);
    document.body.append(wrapper);

    const stopWatching = watchDarkMarker(element, DARK_SELECTOR, (isInside) =>
      reports.push(isInside),
    );

    wrapper.classList.add(DARK_CLASS);
    await Promise.resolve();
    stopWatching();
    wrapper.classList.remove(DARK_CLASS);
    await Promise.resolve();
    wrapper.remove();

    expect(reports).toEqual([false, true]);
  });
});
