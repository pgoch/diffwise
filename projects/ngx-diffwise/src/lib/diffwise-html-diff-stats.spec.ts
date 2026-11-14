import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseColorMode,
  DiffwiseLanguage,
  DiffwiseLayout,
  DiffwiseNoChangesView,
} from './config/option-values';
import type { DiffwiseDiffStats } from './diff-stats';
import { DiffwiseHtmlDiff } from './diffwise-html-diff';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const IGNORE_CASE_INPUT = 'ignoreCase';
const COLOR_MODE_INPUT = 'colorMode';
const LAYOUT_INPUT = 'layout';
const WARN_METHOD = 'warn';
const TOOLBAR_SELECTOR = '.diffwise-html-diff__toolbar';
const DIFF_STAT_SELECTOR = '.diffwise-html-diff__diff-stat';
const NO_CHANGES_SELECTOR = '.diffwise-html-diff__no-changes';
const TOOLTIP_SELECTOR = '.diffwise-html-diff__tooltip';
const TOOLTIP_TITLE_SELECTOR = '.diffwise-html-diff__tooltip-title';
const NO_CHANGES_CLASS = 'diffwise-html-diff--no-changes';
const TOOLBAR_FONT_SIZE_VARIABLE = '--diffwise-toolbar-font-size';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const ROLE_ATTRIBUTE = 'role';
const TABINDEX_ATTRIBUTE = 'tabindex';
const MOUSEOVER_EVENT = 'mouseover';
const ROW_SELECTOR = '.diffwise-html-diff__row';
const LINE_NUMBER_SELECTOR = '.diffwise-html-diff__line-number';
const CONTENT_SELECTOR = '.diffwise-html-diff__content';
const NEW_CONTENT_SELECTOR = '.diffwise-html-diff__content--new';
const VERSION_HEADERS_SELECTOR = '.diffwise-html-diff__version-headers';
const COLLAPSED_LINES_SELECTOR = '.diffwise-html-diff__collapsed-lines';
const DOCUMENT_VIEW_CLASS = 'diffwise-html-diff--no-changes-view-document';
const DIFF_VIEW_CLASS = 'diffwise-html-diff--no-changes-view-diff';
const TERMS_LINES = ['Old intro.', 'Terms of use.', 'Reply within 24 hours.'];
const DOCUMENT_VIEW = { noChangesView: DiffwiseNoChangesView.Document };

/** One line removed, one unchanged, one changed and one added. */
const OLD_TERMS_HTML = '<p>Old intro.</p><p>Terms of use.</p><p>Reply within 24 hours.</p>';
const NEW_TERMS_HTML = '<p>Terms of use.</p><p>Reply within 48 hours.</p><p>New outro.</p>';

/** The same text, with other letter case in the new version. */
const LOWER_CASE_HTML = '<p>Reply within 24 hours.</p>';
const UPPER_CASE_HTML = '<p>REPLY within 24 hours.</p>';

const TERMS_STATS: DiffwiseDiffStats = {
  addedLines: 1,
  removedLines: 1,
  changedLines: 1,
  hasChanges: true,
};

const NO_CHANGES_STATS: DiffwiseDiffStats = {
  addedLines: 0,
  removedLines: 0,
  changedLines: 0,
  hasChanges: false,
};

/** Open popovers; jsdom has no Popover API, so tests define it and record the calls instead. */
const openPopovers = new Set<Element>();

HTMLElement.prototype.showPopover = function (this: HTMLElement) {
  openPopovers.add(this);
};

HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
  openPopovers.delete(this);
};

/** A rendered diff and the statistics it has emitted so far. */
interface RenderedStats {
  readonly fixture: ComponentFixture<DiffwiseHtmlDiff>;
  readonly emitted: DiffwiseDiffStats[];
}

/** Renders the diff of the versions with its options, and records each emitted statistics. */
function render(
  oldHtml = OLD_TERMS_HTML,
  newHtml = NEW_TERMS_HTML,
  options: DiffwiseConfigOptions = {},
): RenderedStats {
  const fixture = TestBed.createComponent(DiffwiseHtmlDiff);
  const emitted: DiffwiseDiffStats[] = [];

  fixture.componentInstance.diffStatsComputed.subscribe((stats) => emitted.push(stats));
  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return { fixture, emitted };
}

/** Sets an input and lets the diff show the change. */
function change(fixture: ComponentFixture<DiffwiseHtmlDiff>, name: string, value: unknown): void {
  fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
}

function elementOf(fixture: ComponentFixture<DiffwiseHtmlDiff>): HTMLElement {
  return fixture.nativeElement;
}

function textsOf(element: HTMLElement, selector: string) {
  return Array.from(element.querySelectorAll(selector), (found) => found.textContent?.trim());
}

function attributesOf(element: HTMLElement, selector: string, attribute: string) {
  return Array.from(element.querySelectorAll(selector), (found) => found.getAttribute(attribute));
}

/** Rows as `[line numbers, texts of the content]`. */
function rowsOf(element: HTMLElement) {
  return Array.from(element.querySelectorAll(ROW_SELECTOR), (row) => [
    textsOf(row as HTMLElement, LINE_NUMBER_SELECTOR),
    textsOf(row as HTMLElement, CONTENT_SELECTOR),
  ]);
}

function tooltipTitleOf(element: HTMLElement) {
  const tooltip = element.querySelector(TOOLTIP_SELECTOR);
  const isShown = tooltip !== null && openPopovers.has(tooltip);

  return isShown ? tooltip.querySelector(TOOLTIP_TITLE_SELECTOR)?.textContent : null;
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  openPopovers.clear();
});

describe('DiffwiseHtmlDiff statistics', () => {
  it('emits the numbers of changed lines after the first comparison', () => {
    const { emitted } = render();

    expect(emitted).toEqual([TERMS_STATS]);
  });

  it('emits no changes for the same versions', () => {
    const { emitted } = render(OLD_TERMS_HTML, OLD_TERMS_HTML);

    expect(emitted).toEqual([NO_CHANGES_STATS]);
  });

  it('emits again after a change of a version', () => {
    const { fixture, emitted } = render();

    change(fixture, NEW_HTML_INPUT, OLD_TERMS_HTML);

    expect(emitted).toEqual([TERMS_STATS, NO_CHANGES_STATS]);
  });

  it('emits again after a change of an option of the comparison', () => {
    const { fixture, emitted } = render(LOWER_CASE_HTML, UPPER_CASE_HTML);

    change(fixture, IGNORE_CASE_INPUT, true);

    expect(emitted).toEqual([
      { ...NO_CHANGES_STATS, changedLines: 1, hasChanges: true },
      NO_CHANGES_STATS,
    ]);
  });

  it('emits nothing after a change of the look, even one that compares the versions again', () => {
    const { fixture, emitted } = render();

    change(fixture, COLOR_MODE_INPUT, DiffwiseColorMode.Dark);
    change(fixture, LAYOUT_INPUT, DiffwiseLayout.Inline);

    expect(emitted).toEqual([TERMS_STATS]);
  });

  it('emits the numbers when the toolbar does not show them', () => {
    const options = { showDiffStats: false, showNavigationToolbar: false };
    const { fixture, emitted } = render(OLD_TERMS_HTML, NEW_TERMS_HTML, options);

    expect(elementOf(fixture).querySelector(TOOLBAR_SELECTOR)).toBeNull();
    expect(emitted).toEqual([TERMS_STATS]);
  });
});

describe('DiffwiseHtmlDiff toolbar', () => {
  it('shows the numbers of changed lines in a toolbar above the diff', () => {
    const element = elementOf(render().fixture);

    expect(element.firstElementChild?.matches(TOOLBAR_SELECTOR)).toBe(true);
    expect(textsOf(element, DIFF_STAT_SELECTOR)).toEqual(['+1', '\u22121', '~1']);
    expect(element.querySelector(NO_CHANGES_SELECTOR)).toBeNull();
  });

  it('names each number for screen readers and lets it take the focus', () => {
    const element = elementOf(render().fixture);

    expect(attributesOf(element, DIFF_STAT_SELECTOR, ARIA_LABEL_ATTRIBUTE)).toEqual([
      'Added lines: 1',
      'Removed lines: 1',
      'Changed lines: 1',
    ]);
    expect(attributesOf(element, DIFF_STAT_SELECTOR, ROLE_ATTRIBUTE)).toEqual([
      'img',
      'img',
      'img',
    ]);
    expect(attributesOf(element, DIFF_STAT_SELECTOR, TABINDEX_ATTRIBUTE)).toEqual(['0', '0', '0']);
  });

  it('shows the name of a number in the tooltip on hover', () => {
    const element = elementOf(render().fixture);
    const [, removed] = Array.from(element.querySelectorAll(DIFF_STAT_SELECTOR));

    removed.dispatchEvent(new MouseEvent(MOUSEOVER_EVENT, { bubbles: true }));

    expect(tooltipTitleOf(element)).toBe('Removed lines: 1');
  });

  it('shows only a text that nothing changed when the versions are the same', () => {
    const element = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML).fixture);

    expect(textsOf(element, TOOLBAR_SELECTOR)).toEqual(['No changes']);
    expect(element.querySelector(DIFF_STAT_SELECTOR)).toBeNull();
    expect(element.classList).toContain(NO_CHANGES_CLASS);
  });

  it('shows the text that nothing changed also without the numbers', () => {
    const options = { showDiffStats: false };
    const element = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML, options).fixture);

    expect(textsOf(element, TOOLBAR_SELECTOR)).toEqual(['No changes']);
  });

  it('takes the class of the same versions away when a version changes', () => {
    const { fixture } = render(OLD_TERMS_HTML, OLD_TERMS_HTML);

    change(fixture, NEW_HTML_INPUT, NEW_TERMS_HTML);

    expect(elementOf(fixture).classList).not.toContain(NO_CHANGES_CLASS);
    expect(textsOf(elementOf(fixture), DIFF_STAT_SELECTOR)).toEqual(['+1', '\u22121', '~1']);
  });

  it('shows the texts of the toolbar in Polish', () => {
    const language = { language: DiffwiseLanguage.PL };
    const changed = elementOf(render(OLD_TERMS_HTML, NEW_TERMS_HTML, language).fixture);
    const same = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML, language).fixture);

    expect(attributesOf(changed, DIFF_STAT_SELECTOR, ARIA_LABEL_ATTRIBUTE)).toEqual([
      'Dodane linie: 1',
      'Usunięte linie: 1',
      'Zmienione linie: 1',
    ]);
    expect(textsOf(same, TOOLBAR_SELECTOR)).toEqual(['Brak zmian']);
  });

  it('sets the font size of the toolbar, and ignores a size out of range', () => {
    const sized = elementOf(
      render(OLD_TERMS_HTML, NEW_TERMS_HTML, { toolbarFontSize: 1.2 }).fixture,
    );
    const tooLarge = elementOf(
      render(OLD_TERMS_HTML, NEW_TERMS_HTML, { toolbarFontSize: 11 }).fixture,
    );

    expect(sized.style.getPropertyValue(TOOLBAR_FONT_SIZE_VARIABLE)).toBe('1.2rem');
    expect(tooLarge.style.getPropertyValue(TOOLBAR_FONT_SIZE_VARIABLE)).toBe('');
    expect(console.warn).toHaveBeenCalledOnce();
  });
});

describe('DiffwiseHtmlDiff identical versions', () => {
  it('shows nothing under the toolbar, by default', () => {
    const element = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML).fixture);

    expect(element.querySelector(ROW_SELECTOR)).toBeNull();
    expect(element.querySelector(VERSION_HEADERS_SELECTOR)).toBeNull();
    expect(textsOf(element, TOOLBAR_SELECTOR)).toEqual(['No changes']);
  });

  it('shows the document once on request, with one number and the new line in each row', () => {
    const element = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML, DOCUMENT_VIEW).fixture);

    expect(rowsOf(element)).toEqual(
      TERMS_LINES.map((line, index) => [[String(index + 1)], [line]]),
    );
    expect(element.querySelectorAll(CONTENT_SELECTOR)).toHaveLength(TERMS_LINES.length);
    expect(element.querySelectorAll(NEW_CONTENT_SELECTOR)).toHaveLength(TERMS_LINES.length);
    expect(element.querySelector(VERSION_HEADERS_SELECTOR)).toBeNull();
    expect(element.classList).toContain(NO_CHANGES_CLASS);
    expect(element.classList).toContain(DOCUMENT_VIEW_CLASS);
  });

  it('shows the document once in the single column too', () => {
    const options = { ...DOCUMENT_VIEW, layout: DiffwiseLayout.Inline };
    const element = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML, options).fixture);

    expect(rowsOf(element)).toEqual(
      TERMS_LINES.map((line, index) => [[String(index + 1)], [line]]),
    );
  });

  it('shows every line of the document once, without hiding unchanged lines', () => {
    const options = { ...DOCUMENT_VIEW, hideUnchangedLines: true };
    const element = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML, options).fixture);

    expect(element.querySelectorAll(ROW_SELECTOR)).toHaveLength(TERMS_LINES.length);
    expect(element.querySelector(COLLAPSED_LINES_SELECTOR)).toBeNull();
  });

  it('shows both versions as usual on request', () => {
    const options = { noChangesView: DiffwiseNoChangesView.Diff };
    const element = elementOf(render(OLD_TERMS_HTML, OLD_TERMS_HTML, options).fixture);

    expect(rowsOf(element)).toEqual(
      TERMS_LINES.map((line, index) => [
        [String(index + 1), String(index + 1)],
        [line, line],
      ]),
    );
    expect(element.querySelector(VERSION_HEADERS_SELECTOR)).not.toBeNull();
    expect(element.classList).toContain(DIFF_VIEW_CLASS);
  });

  it('changes nothing for versions that differ, but keeps the class of the option', () => {
    const element = elementOf(render(OLD_TERMS_HTML, NEW_TERMS_HTML, DOCUMENT_VIEW).fixture);
    const usual = elementOf(render(OLD_TERMS_HTML, NEW_TERMS_HTML).fixture);

    expect(rowsOf(element)).toEqual(rowsOf(usual));
    expect(element.classList).toContain(DOCUMENT_VIEW_CLASS);
    expect(element.classList).not.toContain(NO_CHANGES_CLASS);
  });

  it('shows the changes again when a version changes', () => {
    const { fixture } = render(OLD_TERMS_HTML, OLD_TERMS_HTML, DOCUMENT_VIEW);

    change(fixture, NEW_HTML_INPUT, NEW_TERMS_HTML);

    expect(rowsOf(elementOf(fixture))).toEqual(
      rowsOf(elementOf(render(OLD_TERMS_HTML, NEW_TERMS_HTML).fixture)),
    );
  });
});
