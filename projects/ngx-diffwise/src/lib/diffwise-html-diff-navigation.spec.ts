import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseInlineDiffStyle, DiffwiseLanguage, DiffwiseLayout } from './config/option-values';
import { DiffwiseHtmlDiff } from './diffwise-html-diff';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const LAYOUT_INPUT = 'layout';
const WARN_METHOD = 'warn';
const MATCH_MEDIA = 'matchMedia';
const PARAGRAPH_COUNT = 12;
const TOOLBAR_SELECTOR = '.diffwise-html-diff__toolbar';
const NAVIGATION_SELECTOR = '.diffwise-html-diff__navigation';
const PREVIOUS_BUTTON_SELECTOR = '.diffwise-html-diff__navigation-button--previous';
const NEXT_BUTTON_SELECTOR = '.diffwise-html-diff__navigation-button--next';
const COUNTER_SELECTOR = '.diffwise-html-diff__change-counter';
const DIFF_STAT_SELECTOR = '.diffwise-html-diff__diff-stat';
const ANNOUNCEMENT_SELECTOR = '[data-diffwise-announcement]';
const ACTIVE_ROW_SELECTOR = '.diffwise-html-diff__row--active';
const ACTIVE_FIRST_CLASS = 'diffwise-html-diff__row--active-first';
const ACTIVE_LAST_CLASS = 'diffwise-html-diff__row--active-last';
const CONTENT_SELECTOR = '.diffwise-html-diff__content';
const NEW_CONTENT_SELECTOR = '.diffwise-html-diff__content--new';
const COLLAPSED_LINES_SELECTOR = '.diffwise-html-diff__collapsed-lines';
const TOOLTIP_SELECTOR = '.diffwise-html-diff__tooltip';
const TOOLTIP_TITLE_SELECTOR = '.diffwise-html-diff__tooltip-title';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const MOUSEOVER_EVENT = 'mouseover';
const SMOOTH_SCROLL = 'smooth';
const INSTANT_SCROLL = 'auto';
const TO_MIDDLE = 'center';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Twelve paragraphs with three blocks of changes: in paragraphs 2–3, 6 and 10. */
const OLD_HTML = paragraphs([]);
const NEW_HTML = paragraphs([2, 3, 6, 10]);

/** Open popovers; jsdom has no Popover API, so tests define it and record the calls instead. */
const openPopovers = new Set<Element>();

HTMLElement.prototype.showPopover = function (this: HTMLElement) {
  openPopovers.add(this);
};

HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
  openPopovers.delete(this);
};

/** Scrolls asked for; jsdom does not scroll, so tests record the calls instead. */
const scrolls: [Element, ScrollIntoViewOptions | undefined][] = [];

Element.prototype.scrollIntoView = function (this: Element, options?: ScrollIntoViewOptions) {
  scrolls.push([this, options as ScrollIntoViewOptions | undefined]);
};

/** Paragraphs numbered from 1, with another word in the paragraphs of the given numbers. */
function paragraphs(changedNumbers: readonly number[]): string {
  return Array.from({ length: PARAGRAPH_COUNT }, (_, index) => {
    const number = index + 1;
    const word = changedNumbers.includes(number) ? 'changed' : 'sample';

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

/** Clicks an arrow of the toolbar and waits until the diff has scrolled. */
async function click(fixture: ComponentFixture<DiffwiseHtmlDiff>, selector: string) {
  elementOf(fixture).querySelector<HTMLElement>(selector)?.click();
  await fixture.whenStable();
}

/** The counter as `[its text, its name, what screen readers hear]`. */
function counterOf(element: HTMLElement) {
  const counter = element.querySelector(COUNTER_SELECTOR);

  return [
    counter?.textContent?.trim(),
    counter?.getAttribute(ARIA_LABEL_ATTRIBUTE),
    element.querySelector(ANNOUNCEMENT_SELECTOR)?.textContent?.trim(),
  ];
}

/** Texts of the active rows, each by its first content, with `first` and `last` marks. */
function activeRowsOf(element: HTMLElement, contentSelector = NEW_CONTENT_SELECTOR) {
  return Array.from(element.querySelectorAll(ACTIVE_ROW_SELECTOR), (row) => {
    const text = row.querySelector(contentSelector)?.textContent?.trim();
    const marks = [ACTIVE_FIRST_CLASS, ACTIVE_LAST_CLASS].filter((name) =>
      row.classList.contains(name),
    );

    return [text, marks.map((name) => name.split('-').pop())];
  });
}

function tooltipTitleOf(element: HTMLElement) {
  const tooltip = element.querySelector(TOOLTIP_SELECTOR);
  const isShown = tooltip !== null && openPopovers.has(tooltip);

  return isShown ? tooltip.querySelector(TOOLTIP_TITLE_SELECTOR)?.textContent : null;
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  scrolls.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  openPopovers.clear();
});

describe('DiffwiseHtmlDiff navigation', () => {
  it('shows arrows and the number of the blocks of changes before the first step', () => {
    const element = elementOf(render());

    expect(element.querySelector(`${TOOLBAR_SELECTOR} > ${NAVIGATION_SELECTOR}`)).not.toBeNull();
    expect(counterOf(element)).toEqual(['– / 3', 'Changes: 3', '']);
    expect(element.querySelector(ACTIVE_ROW_SELECTOR)).toBeNull();
  });

  it('steps to the first block, marks its rows and scrolls them to the middle', async () => {
    const fixture = render();
    const element = elementOf(fixture);

    await click(fixture, NEXT_BUTTON_SELECTOR);

    expect(counterOf(element)).toEqual(['1 / 3', 'Change 1 of 3', 'Change 1 of 3']);
    expect(activeRowsOf(element)).toEqual([
      ['Paragraph 2 of the changed text.', ['first']],
      ['Paragraph 3 of the changed text.', ['last']],
    ]);
    expect(scrolls).toEqual([
      [element.querySelector(ACTIVE_ROW_SELECTOR), { block: TO_MIDDLE, behavior: SMOOTH_SCROLL }],
    ]);
  });

  it('marks a block of one row as both the first and the last row', async () => {
    const fixture = render();

    await click(fixture, NEXT_BUTTON_SELECTOR);
    await click(fixture, NEXT_BUTTON_SELECTOR);

    expect(activeRowsOf(elementOf(fixture))).toEqual([
      ['Paragraph 6 of the changed text.', ['first', 'last']],
    ]);
  });

  it('goes around: before the first block stands the last, and after the last the first', async () => {
    const fixture = render();
    const element = elementOf(fixture);

    await click(fixture, PREVIOUS_BUTTON_SELECTOR);

    expect(counterOf(element)[0]).toBe('3 / 3');
    expect(activeRowsOf(element)).toEqual([
      ['Paragraph 10 of the changed text.', ['first', 'last']],
    ]);

    await click(fixture, NEXT_BUTTON_SELECTOR);

    expect(counterOf(element)[0]).toBe('1 / 3');
  });

  it('steps with the methods of the component, also without the arrows', async () => {
    const fixture = render({ showNavigationToolbar: false });
    const element = elementOf(fixture);

    fixture.componentInstance.goToNextChange();
    fixture.componentInstance.goToNextChange();
    await fixture.whenStable();

    expect(element.querySelector(NAVIGATION_SELECTOR)).toBeNull();
    expect(element.querySelectorAll(DIFF_STAT_SELECTOR)).toHaveLength(3);
    expect(activeRowsOf(element)).toEqual([
      ['Paragraph 6 of the changed text.', ['first', 'last']],
    ]);

    fixture.componentInstance.goToPreviousChange();
    await fixture.whenStable();

    expect(activeRowsOf(element)).toHaveLength(2);
  });

  it('shows no toolbar without the arrows and the numbers', () => {
    const element = elementOf(render({ showNavigationToolbar: false, showDiffStats: false }));

    expect(element.querySelector(TOOLBAR_SELECTOR)).toBeNull();
  });

  it('keeps the step after a change of the look, and starts again after a new comparison', async () => {
    const fixture = render();
    const element = elementOf(fixture);

    await click(fixture, NEXT_BUTTON_SELECTOR);
    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();

    expect(counterOf(element)[0]).toBe('1 / 3');
    expect(activeRowsOf(element, CONTENT_SELECTOR)).toHaveLength(2);

    fixture.componentRef.setInput(NEW_HTML_INPUT, paragraphs([6, 10]));
    fixture.detectChanges();

    expect(counterOf(element)).toEqual(['– / 2', 'Changes: 2', '']);
    expect(element.querySelector(ACTIVE_ROW_SELECTOR)).toBeNull();
  });

  it('marks both lines of each changed pair in the single column, one under the other', async () => {
    const options = {
      layout: DiffwiseLayout.Inline,
      inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked,
    };
    const fixture = render(options);

    await click(fixture, NEXT_BUTTON_SELECTOR);

    expect(activeRowsOf(elementOf(fixture), CONTENT_SELECTOR)).toEqual([
      ['Paragraph 2 of the sample text.', ['first']],
      ['Paragraph 2 of the changed text.', []],
      ['Paragraph 3 of the sample text.', []],
      ['Paragraph 3 of the changed text.', ['last']],
    ]);
  });

  it('marks the rows of a block among bars in place of hidden lines', async () => {
    const options = { hideUnchangedLines: true, contextLines: 1 };
    const fixture = render(options, OLD_HTML, paragraphs([2, 10]));
    const element = elementOf(fixture);

    await click(fixture, PREVIOUS_BUTTON_SELECTOR);

    expect(element.querySelectorAll(COLLAPSED_LINES_SELECTOR).length).toBeGreaterThan(0);
    expect(activeRowsOf(element)).toEqual([
      ['Paragraph 10 of the changed text.', ['first', 'last']],
    ]);
  });

  it('shows no arrows for the same versions, where the methods change nothing', async () => {
    const fixture = render({}, OLD_HTML, OLD_HTML);
    const element = elementOf(fixture);

    fixture.componentInstance.goToNextChange();
    await fixture.whenStable();

    expect(element.querySelector(NAVIGATION_SELECTOR)).toBeNull();
    expect(element.querySelector(ACTIVE_ROW_SELECTOR)).toBeNull();
    expect(scrolls).toEqual([]);
  });

  it('jumps without motion when the system asks for less', async () => {
    vi.stubGlobal(MATCH_MEDIA, (query: string) => ({
      matches: query === REDUCED_MOTION_QUERY,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const fixture = render();

    await click(fixture, NEXT_BUTTON_SELECTOR);

    expect(scrolls[0][1]).toEqual({ block: TO_MIDDLE, behavior: INSTANT_SCROLL });
  });

  it('names the arrows and the counter in the language of the interface', async () => {
    const fixture = render({ language: DiffwiseLanguage.PL });
    const element = elementOf(fixture);
    const names = [PREVIOUS_BUTTON_SELECTOR, NEXT_BUTTON_SELECTOR].map((selector) =>
      element.querySelector(selector)?.getAttribute(ARIA_LABEL_ATTRIBUTE),
    );

    expect(names).toEqual(['Poprzednia zmiana', 'Następna zmiana']);
    expect(counterOf(element)[1]).toBe('Zmiany: 3');

    await click(fixture, NEXT_BUTTON_SELECTOR);

    expect(counterOf(element)[1]).toBe('Zmiana 1 z 3');
  });

  it('shows the names of the arrows and the counter in the tooltip on hover', async () => {
    const fixture = render();
    const element = elementOf(fixture);

    await click(fixture, NEXT_BUTTON_SELECTOR);

    for (const [selector, title] of [
      [NEXT_BUTTON_SELECTOR, 'Next change'],
      [COUNTER_SELECTOR, 'Change 1 of 3'],
    ]) {
      element
        .querySelector(selector)
        ?.dispatchEvent(new MouseEvent(MOUSEOVER_EVENT, { bubbles: true }));

      expect(tooltipTitleOf(element)).toBe(title);
    }
  });
});
