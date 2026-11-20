import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { type DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseLayout, DiffwiseNoChangesView, DiffwiseUserSetting } from './config/option-values';
import { DiffwiseHtml } from './diffwise-html';
import { DiffwiseText } from './diffwise-text';

const OLD_TEXT_INPUT = 'oldText';
const NEW_TEXT_INPUT = 'newText';
const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const WRAP_LINES_INPUT = 'wrapLines';
const INPUT_TAG = 'input';
const WARN_METHOD = 'warn';
const NO_TEXT = '';
const ROW_SELECTOR = '.diffwise-diff__row';
const ROW_KIND_CLASS_START = 'diffwise-diff__row--';
const ROW_PART_SELECTOR = '.diffwise-diff__line-number, .diffwise-diff__gap';
const GAP_CLASS = 'diffwise-diff__gap';
const GAP = 'gap';
const NO_CHANGES_SELECTOR = '.diffwise-diff__no-changes';
const SPACE_SIGN_SELECTOR = '.diffwise-diff__whitespace--space';
const TAB_SIGN_SELECTOR = '.diffwise-diff__whitespace--tab';
const CHECKBOX_SELECTOR = '.diffwise-diff__view-settings-checkbox';
const RESET_SELECTOR = '.diffwise-diff__view-settings-reset';
const NO_WRAP_CLASS = 'diffwise-diff--no-wrap-lines';
const SCROLLBARS_SELECTOR = '.diffwise-diff__line-scrollbars';
const SCROLLBAR_SIZE_SELECTOR = '.diffwise-diff__line-scrollbar-size';
const HIDE_UNCHANGED_LINES = 'Hide unchanged lines';
const WRAP_LINES = 'Wrap lines';
const SHOW_ALL_WHITESPACE = 'Show all spaces and tabs';
const SETTINGS_OLD_TEXT = 'name:\tSync\nSync every hour';
const SETTINGS_NEW_TEXT = 'name:\tSync\nSync every day';
const LONG_LINE = 'id,name,email,plan,storage,created,last_login';

/** jsdom has no Popover API; the view settings only need the methods to exist. */
HTMLElement.prototype.showPopover = function () {
  return undefined;
};

HTMLElement.prototype.hidePopover = function () {
  return undefined;
};

/** Renders the text diff of two versions with its options. */
function render(
  oldText: string,
  newText: string,
  options: DiffwiseConfigOptions = {},
): ComponentFixture<DiffwiseText> {
  const fixture = TestBed.createComponent(DiffwiseText);

  fixture.componentRef.setInput(OLD_TEXT_INPUT, oldText);
  fixture.componentRef.setInput(NEW_TEXT_INPUT, newText);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Rows as `[kind, old number, new number]`; the place opposite a line of one version is `gap`. */
function rowsOf(fixture: ComponentFixture<unknown>) {
  return Array.from(elementOf(fixture).querySelectorAll(ROW_SELECTOR), (row) => [
    rowKind(row),
    ...Array.from(row.querySelectorAll(ROW_PART_SELECTOR), partText),
  ]);
}

function rowKind(row: Element) {
  const kindClass = Array.from(row.classList).find((name) => name.startsWith(ROW_KIND_CLASS_START));
  return kindClass?.slice(ROW_KIND_CLASS_START.length);
}

/** A line number, `null` for the empty cell of a number, or `gap` for the place opposite a line. */
function partText(part: Element) {
  if (part.classList.contains(GAP_CLASS)) {
    return GAP;
  }

  const number = part.textContent?.trim() ?? NO_TEXT;

  return number.length === 0 ? null : Number(number);
}

function countOf(fixture: ComponentFixture<unknown>, selector: string): number {
  return elementOf(fixture).querySelectorAll(selector).length;
}

/** Names of the checkboxes of the view settings, in order. */
function checkboxNamesOf(fixture: ComponentFixture<unknown>): (string | undefined)[] {
  const checkboxes = elementOf(fixture).querySelectorAll(CHECKBOX_SELECTOR);
  return Array.from(checkboxes, (checkbox) => checkbox.textContent?.trim());
}

/** The checkbox of the view settings with the name. */
function checkboxOf(fixture: ComponentFixture<unknown>, name: string): HTMLInputElement {
  const checkboxes = elementOf(fixture).querySelectorAll(CHECKBOX_SELECTOR);
  const checkbox = Array.from(checkboxes).find((label) => label.textContent?.trim() === name);
  const input = checkbox?.querySelector(INPUT_TAG);

  if (input === null || input === undefined) {
    throw new Error(`No checkbox "${name}" in the view settings.`);
  }

  return input;
}

/** Clicks a checkbox of the view settings and lets the diff show the choice. */
function toggle(fixture: ComponentFixture<unknown>, name: string): void {
  checkboxOf(fixture, name).click();
  fixture.detectChanges();
}

function restoreDefaults(fixture: ComponentFixture<unknown>): void {
  elementOf(fixture).querySelector<HTMLElement>(RESET_SELECTOR)?.click();
  fixture.detectChanges();
}

/** Signs of spaces and tabs in the whole diff. */
function signCountsOf(fixture: ComponentFixture<unknown>) {
  return {
    spaces: countOf(fixture, SPACE_SIGN_SELECTOR),
    tabs: countOf(fixture, TAB_SIGN_SELECTOR),
  };
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiffwiseText lines', () => {
  it('shows a blank line added or removed as unchanged with ignoreBlankLines, and counts no change', () => {
    const options = { noChangesView: DiffwiseNoChangesView.Diff };
    const ignoring = render('first\n\nlast', 'first\nlast', { ...options, ignoreBlankLines: true });
    const counting = render('first\n\nlast', 'first\nlast', options);

    expect(rowsOf(ignoring)).toEqual([
      ['unchanged', 1, 1],
      ['unchanged', 2, GAP],
      ['unchanged', 3, 2],
    ]);
    expect(countOf(ignoring, NO_CHANGES_SELECTOR)).toBe(1);
    expect(rowsOf(counting)).toEqual([
      ['unchanged', 1, 1],
      ['removed', 2, GAP],
      ['unchanged', 3, 2],
    ]);
    expect(countOf(counting, NO_CHANGES_SELECTOR)).toBe(0);
  });

  it('shows a blank line of one version alone in the single column, under its number', () => {
    const fixture = render('first\n\nlast', 'first\nlast', {
      ignoreBlankLines: true,
      layout: DiffwiseLayout.Inline,
      noChangesView: DiffwiseNoChangesView.Diff,
    });

    expect(rowsOf(fixture)).toEqual([
      ['unchanged', 1, 1],
      ['unchanged', 2, null],
      ['unchanged', 3, 2],
    ]);
  });

  it('shows a sign in every space and tab with showAllWhitespace, or in changed text only', () => {
    const allSigns = render(SETTINGS_OLD_TEXT, SETTINGS_NEW_TEXT, { showAllWhitespace: true });
    const changedSigns = render('Sync every hour', 'Sync  every day');

    expect(signCountsOf(allSigns)).toEqual({ spaces: 4, tabs: 2 });
    expect(signCountsOf(changedSigns)).toEqual({ spaces: 3, tabs: 0 });
  });

  it('keeps each line in one row with wrapLines false, with scrollbars as long as the longest lines', () => {
    const fixture = render(`${LONG_LINE}\nshort`, `${LONG_LINE}\nshorter`, { wrapLines: false });
    const element = elementOf(fixture);
    const sizes = element.querySelectorAll(SCROLLBAR_SIZE_SELECTOR);

    expect(element.classList).toContain(NO_WRAP_CLASS);
    expect(countOf(fixture, SCROLLBARS_SELECTOR)).toBe(1);
    expect(Array.from(sizes, (size) => size.textContent)).toEqual([
      [LONG_LINE, LONG_LINE, 'shorter', 'short'].join('\n'),
      [LONG_LINE, LONG_LINE, 'shorter', 'short'].join('\n'),
    ]);

    fixture.componentRef.setInput(WRAP_LINES_INPUT, true);
    fixture.detectChanges();

    expect(element.classList).not.toContain(NO_WRAP_CLASS);
    expect(countOf(fixture, SCROLLBARS_SELECTOR)).toBe(0);
  });

  it('switches wrapping and the signs of all spaces and tabs in the view settings of the text diff', () => {
    const fixture = render(SETTINGS_OLD_TEXT, SETTINGS_NEW_TEXT);

    expect(checkboxNamesOf(fixture)).toEqual([
      HIDE_UNCHANGED_LINES,
      WRAP_LINES,
      SHOW_ALL_WHITESPACE,
    ]);
    expect(checkboxOf(fixture, WRAP_LINES).checked).toBe(true);
    expect(checkboxOf(fixture, SHOW_ALL_WHITESPACE).checked).toBe(false);

    toggle(fixture, WRAP_LINES);
    toggle(fixture, SHOW_ALL_WHITESPACE);

    expect(elementOf(fixture).classList).toContain(NO_WRAP_CLASS);
    expect(signCountsOf(fixture)).toEqual({ spaces: 4, tabs: 2 });
    expect(checkboxOf(fixture, WRAP_LINES).checked).toBe(false);
    expect(checkboxOf(fixture, SHOW_ALL_WHITESPACE).checked).toBe(true);

    restoreDefaults(fixture);

    expect(elementOf(fixture).classList).not.toContain(NO_WRAP_CLASS);
    expect(signCountsOf(fixture)).toEqual({ spaces: 0, tabs: 0 });
  });

  it('leaves the checkboxes of the text diff out of the HTML diff and out of the allowed settings', async () => {
    const htmlFixture = TestBed.createComponent(DiffwiseHtml);
    const allowedFixture = render(SETTINGS_OLD_TEXT, SETTINGS_NEW_TEXT, {
      allowedUserSettings: [DiffwiseUserSetting.WrapLines],
    });

    htmlFixture.componentRef.setInput(OLD_HTML_INPUT, '<p>Sync every hour</p>');
    htmlFixture.componentRef.setInput(NEW_HTML_INPUT, '<p>Sync every day</p>');
    htmlFixture.detectChanges();
    await htmlFixture.whenStable();
    allowedFixture.detectChanges();

    expect(checkboxNamesOf(htmlFixture)).toEqual([HIDE_UNCHANGED_LINES]);
    expect(checkboxNamesOf(allowedFixture)).toEqual([WRAP_LINES]);
  });
});
