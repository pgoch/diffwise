import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseLanguage, DiffwiseLayout, DiffwiseNoChangesView } from './config/option-values';
import { provideDiffwiseLanguages } from './config/provide-diffwise-languages';
import { DiffwiseHtml } from './diffwise-html';
import { DiffwiseText } from './diffwise-text';
import { diffwisePolish } from './i18n/languages';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const OLD_TEXT_INPUT = 'oldText';
const NEW_TEXT_INPUT = 'newText';
const LAYOUT_INPUT = 'layout';
const LARGE_DOCUMENT_LINES_INPUT = 'largeDocumentLines';
const ROW_SELECTOR = '.diffwise-diff__row';
const ACTIVE_ROW_SELECTOR = '.diffwise-diff__row--active';
const DIFF_STAT_SELECTOR = '.diffwise-diff__diff-stat';
const PANEL_SELECTOR = '.diffwise-diff__large-document';
const TITLE_SELECTOR = '.diffwise-diff__large-document-title';
const BUTTON_SELECTOR = '.diffwise-diff__large-document-button';
const ARIA_BUSY_ATTRIBUTE = 'aria-busy';
const LANG_ATTRIBUTE = 'lang';
const BEFORE_PRINT_EVENT = 'beforeprint';
const NO_TEXT = '';
const LINE_BREAK = '\n';

/** Paragraphs of each version, more than the diff draws at once. */
const PARAGRAPH_COUNT = 400;

/** The limit of the tests: fewer lines than the versions have. */
const LARGE_DOCUMENT_LINES = 300;

/** Rows the diff draws at once after a comparison. */
const FIRST_DRAWN_ROWS = 120;

/** The number of the only changed paragraph. */
const CHANGED_PARAGRAPH = 350;

/** jsdom does not scroll; stepping to a change needs only the call. */
Element.prototype.scrollIntoView = () => undefined;

/** Paragraphs numbered from 1, with another word in the paragraph of `changedNumber`, if any. */
function paragraphs(count: number, changedNumber: number | null = null, extra = NO_TEXT): string {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const word = number === changedNumber ? 'changed' : 'sample';

    return `<p>Paragraph ${number} of the ${word} text${extra}.</p>`;
  }).join(NO_TEXT);
}

const OLD_HTML = paragraphs(PARAGRAPH_COUNT);
const NEW_HTML = paragraphs(PARAGRAPH_COUNT, CHANGED_PARAGRAPH);

/** Renders the diff of the versions with the options and runs the first drawing only. */
function render(
  options: DiffwiseConfigOptions = {},
  oldHtml = OLD_HTML,
  newHtml = NEW_HTML,
): ComponentFixture<DiffwiseHtml> {
  const fixture = TestBed.createComponent(DiffwiseHtml);
  const allOptions = { largeDocumentLines: LARGE_DOCUMENT_LINES, ...options };

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(allOptions)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<DiffwiseHtml | DiffwiseText>): HTMLElement {
  return fixture.nativeElement;
}

function rowCountOf(fixture: ComponentFixture<DiffwiseHtml | DiffwiseText>): number {
  return elementOf(fixture).querySelectorAll(ROW_SELECTOR).length;
}

function textOf(fixture: ComponentFixture<DiffwiseHtml | DiffwiseText>, selector: string): string {
  return elementOf(fixture).querySelector(selector)?.textContent?.trim() ?? NO_TEXT;
}

/** Clicks the button of the panel and runs the drawing that follows. */
function showRows(fixture: ComponentFixture<DiffwiseHtml | DiffwiseText>): void {
  elementOf(fixture).querySelector<HTMLElement>(BUTTON_SELECTOR)?.click();
  fixture.detectChanges();
}

describe('DiffwiseHtml large documents', () => {
  it('shows a panel with a sentence and a button in place of the rows', async () => {
    const fixture = render();

    await fixture.whenStable();

    expect(rowCountOf(fixture)).toBe(0);
    expect(textOf(fixture, TITLE_SELECTOR)).toBe(
      'The document is too large to load without confirmation.',
    );
    expect(textOf(fixture, BUTTON_SELECTOR)).toBe('Show the comparison');
    expect(elementOf(fixture).querySelector(PANEL_SELECTOR)?.children.length).toBe(2);
  });

  it('shows and emits the numbers of changes before the rows, and is not busy', async () => {
    const fixture = TestBed.createComponent(DiffwiseHtml);
    const emittedStats = vi.fn();

    fixture.componentInstance.diffStatsComputed.subscribe(emittedStats);
    fixture.componentRef.setInput(OLD_HTML_INPUT, OLD_HTML);
    fixture.componentRef.setInput(NEW_HTML_INPUT, NEW_HTML);
    fixture.componentRef.setInput(LARGE_DOCUMENT_LINES_INPUT, LARGE_DOCUMENT_LINES);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elementOf(fixture).querySelectorAll(DIFF_STAT_SELECTOR)).toHaveLength(3);
    expect(emittedStats).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ changedLines: 1 }),
    );
    expect(elementOf(fixture).hasAttribute(ARIA_BUSY_ATTRIBUTE)).toBe(false);
  });

  it('draws the rows in parts after a click on the button, and moves the focus to the diff', async () => {
    const fixture = render();

    showRows(fixture);

    expect(elementOf(fixture).querySelector(PANEL_SELECTOR)).toBeNull();
    expect(rowCountOf(fixture)).toBe(FIRST_DRAWN_ROWS);

    await fixture.whenStable();

    expect(rowCountOf(fixture)).toBe(PARAGRAPH_COUNT);
    expect(document.activeElement).toBe(elementOf(fixture));
  });

  it('draws every row before stepping to a change', async () => {
    const fixture = render();

    fixture.componentInstance.goToNextChange();
    fixture.detectChanges();

    expect(rowCountOf(fixture)).toBe(PARAGRAPH_COUNT);

    await fixture.whenStable();

    expect(textOf(fixture, ACTIVE_ROW_SELECTOR)).toContain(
      `Paragraph ${CHANGED_PARAGRAPH} of the changed text`,
    );
  });

  it('keeps the panel when the page prints, as the page shows it', () => {
    const fixture = render();

    window.dispatchEvent(new Event(BEFORE_PRINT_EVENT));

    expect(rowCountOf(fixture)).toBe(0);
    expect(elementOf(fixture).querySelector(PANEL_SELECTOR)).not.toBeNull();
  });

  it('shows the rows at once below the limit, and without a limit', () => {
    const below = render({ largeDocumentLines: PARAGRAPH_COUNT + 1 });
    const unlimited = render({ largeDocumentLines: 0 });

    for (const fixture of [below, unlimited]) {
      expect(elementOf(fixture).querySelector(PANEL_SELECTOR)).toBeNull();
      expect(rowCountOf(fixture)).toBe(FIRST_DRAWN_ROWS);
    }
  });

  it('counts the lines of the longer version', () => {
    const shorter = paragraphs(10);
    const longer = paragraphs(25);
    const atLimit = render({ largeDocumentLines: 25 }, shorter, longer);
    const belowLimit = render({ largeDocumentLines: 26 }, shorter, longer);

    expect(elementOf(atLimit).querySelector(PANEL_SELECTOR)).not.toBeNull();
    expect(elementOf(belowLimit).querySelector(PANEL_SELECTOR)).toBeNull();
    expect(rowCountOf(belowLimit)).toBe(25);
  });

  it('keeps the rows when another option changes, and shows the panel again for new versions', async () => {
    const fixture = render();

    showRows(fixture);
    await fixture.whenStable();
    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();

    expect(elementOf(fixture).querySelector(PANEL_SELECTOR)).toBeNull();
    expect(rowCountOf(fixture)).toBeGreaterThan(0);

    fixture.componentRef.setInput(NEW_HTML_INPUT, paragraphs(PARAGRAPH_COUNT, 1, ' again'));
    fixture.detectChanges();

    expect(elementOf(fixture).querySelector(PANEL_SELECTOR)).not.toBeNull();
    expect(rowCountOf(fixture)).toBe(0);
  });

  it('shows the panel in the language of the interface, marked with its tag', () => {
    TestBed.configureTestingModule({ providers: [provideDiffwiseLanguages(diffwisePolish)] });

    const fixture = render({ language: DiffwiseLanguage.PL });

    expect(textOf(fixture, TITLE_SELECTOR)).toBe(
      'Dokument jest zbyt duży, żeby go wczytać bez potwierdzenia.',
    );
    expect(textOf(fixture, BUTTON_SELECTOR)).toBe('Pokaż porównanie');
    expect(elementOf(fixture).querySelector(PANEL_SELECTOR)?.getAttribute(LANG_ATTRIBUTE)).toBe(
      'pl',
    );
  });

  it('needs no panel for the same versions when the toolbar is all that shows', () => {
    const message = render({}, OLD_HTML, OLD_HTML);
    const documentOnce = render(
      { noChangesView: DiffwiseNoChangesView.Document },
      OLD_HTML,
      OLD_HTML,
    );

    expect(elementOf(message).querySelector(PANEL_SELECTOR)).toBeNull();
    expect(elementOf(documentOnce).querySelector(PANEL_SELECTOR)).not.toBeNull();
  });
});

describe('DiffwiseText large documents', () => {
  it('shows the panel in place of the lines of a long text', () => {
    const lines = Array.from({ length: PARAGRAPH_COUNT }, (_, index) => `Line ${index + 1}`);
    const changed = lines.map((line, index) => (index === 0 ? `${line} changed` : line));
    const fixture = TestBed.createComponent(DiffwiseText);

    fixture.componentRef.setInput(OLD_TEXT_INPUT, lines.join(LINE_BREAK));
    fixture.componentRef.setInput(NEW_TEXT_INPUT, changed.join(LINE_BREAK));
    fixture.componentRef.setInput(LARGE_DOCUMENT_LINES_INPUT, LARGE_DOCUMENT_LINES);
    fixture.detectChanges();

    expect(rowCountOf(fixture)).toBe(0);
    expect(elementOf(fixture).querySelector(PANEL_SELECTOR)).not.toBeNull();
  });
});
