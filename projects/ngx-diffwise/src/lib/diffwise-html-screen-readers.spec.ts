import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseInlineDiffStyle, DiffwiseLanguage, DiffwiseLayout } from './config/option-values';
import { provideDiffwiseLanguages } from './config/provide-diffwise-languages';
import { DiffwiseHtml } from './diffwise-html';
import { diffwisePolish } from './i18n/languages';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const WARN_METHOD = 'warn';
const DESCRIPTION_SELECTOR = '[data-diffwise-line-description]';
const LINE_NUMBER_SELECTOR = '.diffwise-diff__line-number';
const OLD_COPY_SELECTOR = '.diffwise-diff__row--unchanged > .diffwise-diff__content--old';
const NEW_COPY_SELECTOR = '.diffwise-diff__row--unchanged > .diffwise-diff__content--new';
const CHANGED_OLD_SELECTOR = '.diffwise-diff__row--changed > .diffwise-diff__content--old';
const TABLE_COPY_SELECTOR = '[data-diffwise-table-copy]';
const TABLE_LINE_SELECTOR = '.diffwise-diff__content--new[data-diffwise-table]';
const CONTENT_SELECTOR = '.diffwise-diff__content';
const TOOLBAR_TAG = 'diffwise-diff-toolbar';
const TOOLTIP_TAG = 'diffwise-change-tooltip';
const VERSION_HEADERS_SELECTOR = '.diffwise-diff__version-headers';
const LINK_TAG = 'a';
const ARIA_HIDDEN_ATTRIBUTE = 'aria-hidden';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const TABINDEX_ATTRIBUTE = 'tabindex';
const ROLE_ATTRIBUTE = 'role';
const LANG_ATTRIBUTE = 'lang';
const SCROLL_WIDTH = 'scrollWidth';
const CLIENT_WIDTH = 'clientWidth';

/** Line 2 changed, line 3 removed, line 4 of the new version added; the others the same. */
const OLD_HTML =
  '<p>Shared introduction.</p><p>The price is 10 euro.</p><p>Old warranty terms apply.</p><p>Read the <a href="https://example.com/guide">guide</a>.</p>';
const NEW_HTML =
  '<p>Shared introduction.</p><p>The price is 12 euro.</p><p>Read the <a href="https://example.com/guide">guide</a>.</p><p>Contact support any day.</p>';

/** A table with one changed price. */
const OLD_TABLE =
  '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Pro</td><td>49</td></tr></table>';
const NEW_TABLE =
  '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Pro</td><td>59</td></tr></table>';

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

function descriptionsOf(element: HTMLElement): (string | undefined)[] {
  return Array.from(element.querySelectorAll(DESCRIPTION_SELECTOR), (description) =>
    description.textContent?.trim(),
  );
}

function attributesOf(
  element: HTMLElement,
  selector: string,
  attribute: string,
): (string | null)[] {
  return Array.from(element.querySelectorAll(selector), (found) => found.getAttribute(attribute));
}

/** Makes every element wider inside than outside, as a table wider than its column. */
function makeEverythingWide(): void {
  vi.spyOn(Element.prototype, SCROLL_WIDTH, 'get').mockReturnValue(600);
  vi.spyOn(Element.prototype, CLIENT_WIDTH, 'get').mockReturnValue(300);
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiffwiseHtml for screen readers', () => {
  it('describes each changed line beside the other version, with its number', () => {
    const element = elementOf(render({ layout: DiffwiseLayout.SideBySide }));

    expect(descriptionsOf(element)).toEqual([
      'Changed line 2, before',
      'Changed line 2, after',
      'Removed line 3',
      'Added line 4',
    ]);
  });

  it('describes the changed lines of the single column in each of its looks', () => {
    const merged = elementOf(render({ layout: DiffwiseLayout.Inline }));
    const stacked = elementOf(
      render({ layout: DiffwiseLayout.Inline, inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked }),
    );

    expect(descriptionsOf(merged)).toEqual(['Changed line 2', 'Removed line 3', 'Added line 4']);
    expect(descriptionsOf(stacked)).toEqual([
      'Changed line 2, before',
      'Changed line 2, after',
      'Removed line 3',
      'Added line 4',
    ]);
  });

  it('hides the line numbers from screen readers, which hear them in the descriptions', () => {
    const element = elementOf(render({ layout: DiffwiseLayout.SideBySide }));
    const hidden = attributesOf(element, LINE_NUMBER_SELECTOR, ARIA_HIDDEN_ATTRIBUTE);

    expect(hidden.length).toBeGreaterThan(0);
    expect(hidden.every((value) => value === 'true')).toBe(true);
  });

  it('reads each unchanged line once: its old copy is hidden and out of the order of Tab, its link still there', async () => {
    const fixture = render({ layout: DiffwiseLayout.SideBySide });
    const element = elementOf(fixture);

    await fixture.whenStable();

    const oldCopies = Array.from(element.querySelectorAll(OLD_COPY_SELECTOR));
    const oldLink = element.querySelector(`${OLD_COPY_SELECTOR} ${LINK_TAG}`);
    const newLink = element.querySelector(`${NEW_COPY_SELECTOR} ${LINK_TAG}`);

    expect(oldCopies).toHaveLength(2);
    expect(oldCopies.every((copy) => copy.getAttribute(ARIA_HIDDEN_ATTRIBUTE) === 'true')).toBe(
      true,
    );
    expect(oldLink?.getAttribute(TABINDEX_ATTRIBUTE)).toBe('-1');
    expect(newLink?.hasAttribute(TABINDEX_ATTRIBUTE)).toBe(false);
    expect(element.querySelector(CHANGED_OLD_SELECTOR)?.hasAttribute(ARIA_HIDDEN_ATTRIBUTE)).toBe(
      false,
    );
  });

  it('shows the lines of a table to screen readers as lines, not as tables of one row', () => {
    const element = elementOf(render({ layout: DiffwiseLayout.SideBySide }, OLD_TABLE, NEW_TABLE));
    const roles = attributesOf(element, TABLE_COPY_SELECTOR, ROLE_ATTRIBUTE);

    expect(roles.length).toBeGreaterThan(0);
    expect(roles.every((role) => role === 'presentation')).toBe(true);
  });

  it('gives a table wider than its column one named stop of Tab, its last line', async () => {
    makeEverythingWide();

    const fixture = render({ layout: DiffwiseLayout.SideBySide }, OLD_TABLE, NEW_TABLE);
    const element = elementOf(fixture);

    await fixture.whenStable();

    const lines = Array.from(element.querySelectorAll(TABLE_LINE_SELECTOR));
    const lastLine = lines[lines.length - 1];

    expect(attributesOf(element, TABLE_LINE_SELECTOR, TABINDEX_ATTRIBUTE)).toEqual(['-1', '0']);
    expect(lastLine.getAttribute(ROLE_ATTRIBUTE)).toBe('group');
    expect(lastLine.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Wide table, scroll sideways');
    expect(lines[0].hasAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(false);
  });

  it('gives no stop of Tab to a table that fits its column', async () => {
    const fixture = render({ layout: DiffwiseLayout.SideBySide }, OLD_TABLE, NEW_TABLE);
    const element = elementOf(fixture);

    await fixture.whenStable();

    expect(attributesOf(element, TABLE_LINE_SELECTOR, TABINDEX_ATTRIBUTE)).toEqual(['-1', '-1']);
  });

  it('marks the texts of the interface with its language, and leaves the content in the language of the page', () => {
    TestBed.configureTestingModule({ providers: [provideDiffwiseLanguages(diffwisePolish)] });

    const element = elementOf(
      render({ layout: DiffwiseLayout.SideBySide, language: DiffwiseLanguage.PL }),
    );
    const interfaceParts = [
      element.querySelector(TOOLBAR_TAG),
      element.querySelector(VERSION_HEADERS_SELECTOR),
      element.querySelector(TOOLTIP_TAG),
      element.querySelector(DESCRIPTION_SELECTOR),
    ];

    expect(interfaceParts.map((part) => part?.getAttribute(LANG_ATTRIBUTE))).toEqual([
      'pl',
      'pl',
      'pl',
      'pl',
    ]);
    expect(
      attributesOf(element, CONTENT_SELECTOR, LANG_ATTRIBUTE).every((lang) => lang === null),
    ).toBe(true);
  });

  it('describes changed lines in Polish', () => {
    TestBed.configureTestingModule({ providers: [provideDiffwiseLanguages(diffwisePolish)] });

    const element = elementOf(
      render({ layout: DiffwiseLayout.Inline, language: DiffwiseLanguage.PL }),
    );

    expect(descriptionsOf(element)).toEqual([
      'Zmieniona linia 2',
      'Usunięta linia 3',
      'Dodana linia 4',
    ]);
  });
});
