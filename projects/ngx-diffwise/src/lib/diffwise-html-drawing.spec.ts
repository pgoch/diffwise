import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { DiffwiseLayout } from './config/option-values';
import { DiffwiseHtml } from './diffwise-html';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const LAYOUT_INPUT = 'layout';
const WARN_METHOD = 'warn';
const ROW_SELECTOR = '.diffwise-diff__row';
const ACTIVE_ROW_SELECTOR = '.diffwise-diff__row--active';
const LINK_SELECTOR = '.diffwise-diff__content--new a[href^="#"]';
const ARIA_BUSY_ATTRIBUTE = 'aria-busy';
const BUSY = 'true';
const BEFORE_PRINT_EVENT = 'beforeprint';
const FAR_PARAGRAPH_ID = 'far-paragraph';
const LINK_TEXT = 'To the far paragraph';
const NO_TEXT = '';

/** Paragraphs of each version, more than the diff draws at once. */
const PARAGRAPH_COUNT = 400;

/** Rows the diff draws at once after a comparison. */
const FIRST_DRAWN_ROWS = 120;

/** The number of the only changed paragraph, far below the rows drawn at once. */
const CHANGED_PARAGRAPH = 350;

/** The number of the paragraph that the link at the top points to. */
const FAR_PARAGRAPH = 380;

/** Scrolls asked for; jsdom does not scroll, so tests record the elements instead. */
const scrolledTo: Element[] = [];

Element.prototype.scrollIntoView = function (this: Element) {
  scrolledTo.push(this);
};

/**
 * Paragraphs numbered from 1, with a link to a far paragraph at the top, and another word in the
 * paragraph of `changedNumber`, if any.
 */
function paragraphs(changedNumber: number | null, extraWord = NO_TEXT): string {
  const link = `<p><a href="#${FAR_PARAGRAPH_ID}">${LINK_TEXT}</a></p>`;
  const numbered = Array.from({ length: PARAGRAPH_COUNT }, (_, index) => {
    const number = index + 1;
    const word = number === changedNumber ? 'changed' : 'sample';
    const id = number === FAR_PARAGRAPH ? ` id="${FAR_PARAGRAPH_ID}"` : NO_TEXT;

    return `<p${id}>Paragraph ${number} of the ${word} text${extraWord}.</p>`;
  });

  return [link, ...numbered].join(NO_TEXT);
}

const OLD_HTML = paragraphs(null);
const NEW_HTML = paragraphs(CHANGED_PARAGRAPH);

/** Rows of the diff in each version: the link and the numbered paragraphs. */
const ROW_COUNT = PARAGRAPH_COUNT + 1;

/** Renders the diff of the versions and runs the first drawing only. */
function render(oldHtml = OLD_HTML, newHtml = NEW_HTML): ComponentFixture<DiffwiseHtml> {
  const fixture = TestBed.createComponent(DiffwiseHtml);

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);
  fixture.detectChanges();

  return fixture;
}

function rowCountOf(fixture: ComponentFixture<DiffwiseHtml>): number {
  return elementOf(fixture).querySelectorAll(ROW_SELECTOR).length;
}

function elementOf(fixture: ComponentFixture<DiffwiseHtml>): HTMLElement {
  return fixture.nativeElement;
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  scrolledTo.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiffwiseHtml drawing rows in parts', () => {
  it('draws the first rows at once and the rest in the next tasks', async () => {
    const fixture = render();

    expect(rowCountOf(fixture)).toBe(FIRST_DRAWN_ROWS);

    await fixture.whenStable();

    expect(rowCountOf(fixture)).toBe(ROW_COUNT);
  });

  it('tells screen readers that the diff is busy while it draws', async () => {
    const fixture = render();

    expect(elementOf(fixture).getAttribute(ARIA_BUSY_ATTRIBUTE)).toBe(BUSY);

    await fixture.whenStable();

    expect(elementOf(fixture).hasAttribute(ARIA_BUSY_ATTRIBUTE)).toBe(false);
  });

  it('draws every row before stepping to a change below the drawn rows', async () => {
    const fixture = render();

    fixture.componentInstance.goToNextChange();
    fixture.detectChanges();

    expect(rowCountOf(fixture)).toBe(ROW_COUNT);

    await fixture.whenStable();

    const activeRow = elementOf(fixture).querySelector(ACTIVE_ROW_SELECTOR);

    expect(activeRow?.textContent).toContain(`Paragraph ${CHANGED_PARAGRAPH} of the changed text`);
  });

  it('draws every row before following a link to a row not drawn yet', async () => {
    const fixture = render();

    elementOf(fixture).querySelector<HTMLElement>(LINK_SELECTOR)?.click();
    fixture.detectChanges();

    expect(rowCountOf(fixture)).toBe(ROW_COUNT);

    await fixture.whenStable();

    expect(scrolledTo.some((element) => element.id.endsWith(FAR_PARAGRAPH_ID))).toBe(true);
  });

  it('draws every row at once before the page prints', () => {
    const fixture = render();

    window.dispatchEvent(new Event(BEFORE_PRINT_EVENT));

    expect(rowCountOf(fixture)).toBe(ROW_COUNT);
  });

  it('draws the first rows again after a new comparison', async () => {
    const fixture = render();

    await fixture.whenStable();
    fixture.componentRef.setInput(NEW_HTML_INPUT, paragraphs(CHANGED_PARAGRAPH, ' again'));
    fixture.detectChanges();

    expect(rowCountOf(fixture)).toBe(FIRST_DRAWN_ROWS);

    await fixture.whenStable();

    expect(rowCountOf(fixture)).toBe(ROW_COUNT);
  });

  it('draws the single column in parts too', async () => {
    const fixture = TestBed.createComponent(DiffwiseHtml);

    fixture.componentRef.setInput(OLD_HTML_INPUT, OLD_HTML);
    fixture.componentRef.setInput(NEW_HTML_INPUT, NEW_HTML);
    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();

    expect(rowCountOf(fixture)).toBe(FIRST_DRAWN_ROWS);

    await fixture.whenStable();

    expect(rowCountOf(fixture)).toBe(ROW_COUNT);
  });
});

describe('DiffwiseHtml diffs of a page in turns', () => {
  it('draws the second of two diffs made together after the first, in a task of its own', async () => {
    const first = TestBed.createComponent(DiffwiseHtml);
    const second = TestBed.createComponent(DiffwiseHtml);
    const emittedStats = vi.fn();

    for (const fixture of [first, second]) {
      fixture.componentRef.setInput(OLD_HTML_INPUT, OLD_HTML);
      fixture.componentRef.setInput(NEW_HTML_INPUT, NEW_HTML);
    }

    second.componentInstance.diffStatsComputed.subscribe(emittedStats);
    first.detectChanges();
    second.detectChanges();

    expect(rowCountOf(first)).toBe(FIRST_DRAWN_ROWS);
    expect(rowCountOf(second)).toBe(0);
    expect(elementOf(second).getAttribute(ARIA_BUSY_ATTRIBUTE)).toBe(BUSY);
    expect(emittedStats).not.toHaveBeenCalled();

    await second.whenStable();

    expect(rowCountOf(second)).toBe(ROW_COUNT);
    expect(emittedStats).toHaveBeenCalledTimes(1);
  });
});
