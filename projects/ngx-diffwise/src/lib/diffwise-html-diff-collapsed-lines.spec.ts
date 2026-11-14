import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseDividerStyle, DiffwiseLanguage, DiffwiseLayout } from './config/option-values';
import { DiffwiseHtmlDiff } from './diffwise-html-diff';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const HIDE_UNCHANGED_LINES_INPUT = 'hideUnchangedLines';
const CONTEXT_LINES_INPUT = 'contextLines';
const IGNORE_CASE_INPUT = 'ignoreCase';
const LAYOUT_INPUT = 'layout';
const WARN_METHOD = 'warn';
const BAR_SELECTOR = '.diffwise-html-diff__collapsed-lines';
const ROW_SELECTOR = '.diffwise-html-diff__row';
const NEW_LINE_NUMBER_SELECTOR = '.diffwise-html-diff__line-number--new';
const NEW_CONTENT_SELECTOR = '.diffwise-html-diff__content--new';
const ICON_SELECTOR = 'svg';
const BUTTON_TAG = 'BUTTON';
const BUTTON_TYPE = 'button';
const TYPE_ATTRIBUTE = 'type';
const ARIA_HIDDEN_ATTRIBUTE = 'aria-hidden';
const PARAGRAPH_COUNT = 60;
const TABLE_ROW_COUNT = 12;
const CONTENT_SELECTOR = '.diffwise-html-diff__content';
const TABLE_ATTRIBUTE = 'data-diffwise-table';
const SCROLL_EVENT = 'scroll';

/** Sixty paragraphs, numbered from 1, with another word in the paragraphs of the given numbers. */
function paragraphs(changedNumbers: readonly number[] = []): string {
  return Array.from({ length: PARAGRAPH_COUNT }, (_, index) => {
    const number = index + 1;
    const word = changedNumbers.includes(number) ? 'changed' : 'sample';

    return `<p>Paragraph ${number} of the ${word} document.</p>`;
  }).join('');
}

const OLD_HTML = paragraphs();

/** Changes in lines 5 and 6, 30 and 55, far from each other. */
const NEW_HTML = paragraphs([5, 6, 30, 55]);

/** A table of twelve plans, with another price in the plans of the given numbers. */
function plansTable(changedNumbers: readonly number[] = []): string {
  const rows = Array.from({ length: TABLE_ROW_COUNT }, (_, index) => {
    const number = index + 1;
    const price = changedNumbers.includes(number) ? number * 10 + 5 : number * 10;

    return `<tr><td>Plan ${number}</td><td>${price} USD</td></tr>`;
  });

  return `<table>${rows.join('')}</table>`;
}

/** The bars of the diff with the default 3 lines of context. */
const DEFAULT_BAR_TEXTS = [
  'Show hidden lines: 17',
  'Show hidden lines: 18',
  'Show hidden lines: 2',
];

/** Renders the diff of the paragraphs, or of the given versions, with unchanged lines hidden. */
function render(
  options: DiffwiseConfigOptions = {},
  oldHtml = OLD_HTML,
  newHtml = NEW_HTML,
): ComponentFixture<DiffwiseHtmlDiff> {
  const fixture = TestBed.createComponent(DiffwiseHtmlDiff);
  const inputs = { [HIDE_UNCHANGED_LINES_INPUT]: true, ...options };

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<DiffwiseHtmlDiff>): HTMLElement {
  return fixture.nativeElement;
}

function barTexts(element: HTMLElement) {
  return Array.from(element.querySelectorAll(BAR_SELECTOR), (bar) => bar.textContent?.trim());
}

/** Numbers of the shown lines in the new version. */
function shownNumbers(element: HTMLElement): number[] {
  return Array.from(element.querySelectorAll(ROW_SELECTOR), (row) =>
    Number(row.querySelector(NEW_LINE_NUMBER_SELECTOR)?.textContent),
  );
}

/** The row of the line with the number in the new version. */
function rowOfLine(element: HTMLElement, newNumber: number): Element | undefined {
  return Array.from(element.querySelectorAll(ROW_SELECTOR)).find(
    (row) => Number(row.querySelector(NEW_LINE_NUMBER_SELECTOR)?.textContent) === newNumber,
  );
}

/** Numbers from `first` to `last`, both included. */
function numbers(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

/** Clicks the bar at the position among the bars and waits until the diff shows its lines. */
async function showLinesOfBar(
  fixture: ComponentFixture<DiffwiseHtmlDiff>,
  position: number,
): Promise<void> {
  const bar = elementOf(fixture).querySelectorAll<HTMLElement>(BAR_SELECTOR).item(position);

  bar.click();
  fixture.detectChanges();
  await fixture.whenStable();
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiffwiseHtmlDiff hidden lines', () => {
  it('shows every line by default', () => {
    const element = elementOf(render({ hideUnchangedLines: false }));

    expect(barTexts(element)).toEqual([]);
    expect(shownNumbers(element)).toEqual(numbers(1, PARAGRAPH_COUNT));
  });

  it('hides unchanged lines far from changes behind bars, around 3 lines of context', () => {
    const element = elementOf(render());

    expect(barTexts(element)).toEqual(DEFAULT_BAR_TEXTS);
    expect(shownNumbers(element)).toEqual([
      ...numbers(1, 9),
      ...numbers(27, 33),
      ...numbers(52, 58),
    ]);
  });

  it('keeps the number of context lines that the app gives', () => {
    const element = elementOf(render({ contextLines: 1 }));

    expect(barTexts(element)).toEqual([
      'Show hidden lines: 3',
      'Show hidden lines: 21',
      'Show hidden lines: 22',
      'Show hidden lines: 4',
    ]);
    expect(shownNumbers(element)).toEqual([
      ...numbers(4, 7),
      ...numbers(29, 31),
      ...numbers(54, 56),
    ]);
  });

  it('keeps 3 lines of context for a number of lines out of range, with a warning', () => {
    const element = elementOf(render({ contextLines: 0 }));

    expect(barTexts(element)).toEqual(DEFAULT_BAR_TEXTS);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('shows the lines of a bar on a click, and moves the focus to the first of them', async () => {
    const fixture = render();
    const element = elementOf(fixture);

    await showLinesOfBar(fixture, 1);

    expect(barTexts(element)).toEqual([DEFAULT_BAR_TEXTS[0], DEFAULT_BAR_TEXTS[2]]);
    expect(shownNumbers(element)).toEqual([...numbers(1, 9), ...numbers(27, 58)]);
    expect(document.activeElement).toBe(
      rowOfLine(element, 34)?.querySelector(NEW_CONTENT_SELECTOR),
    );
  });

  it('hides the shown lines again after a new comparison', async () => {
    const fixture = render();

    await showLinesOfBar(fixture, 0);
    fixture.componentRef.setInput(IGNORE_CASE_INPUT, true);
    fixture.detectChanges();

    expect(barTexts(elementOf(fixture))).toEqual(DEFAULT_BAR_TEXTS);
  });

  it('hides the shown lines again when the number of context lines changes', async () => {
    const fixture = render();

    await showLinesOfBar(fixture, 0);
    fixture.componentRef.setInput(CONTEXT_LINES_INPUT, 2);
    fixture.detectChanges();

    expect(barTexts(elementOf(fixture))).toEqual([
      'Show hidden lines: 2',
      'Show hidden lines: 19',
      'Show hidden lines: 20',
      'Show hidden lines: 3',
    ]);
  });

  it('keeps the shown lines when the layout changes', async () => {
    const fixture = render();
    const element = elementOf(fixture);

    await showLinesOfBar(fixture, 1);
    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();

    expect(barTexts(element)).toEqual([DEFAULT_BAR_TEXTS[0], DEFAULT_BAR_TEXTS[2]]);
    expect(shownNumbers(element)).toEqual([...numbers(1, 9), ...numbers(27, 58)]);
  });

  it('hides the same lines in the single column', () => {
    const element = elementOf(render({ layout: DiffwiseLayout.Inline }));

    expect(barTexts(element)).toEqual(DEFAULT_BAR_TEXTS);
    expect(shownNumbers(element)).toEqual([
      ...numbers(1, 9),
      ...numbers(27, 33),
      ...numbers(52, 58),
    ]);
  });

  it('hides every line of identical versions behind one bar', () => {
    const element = elementOf(render({}, OLD_HTML, OLD_HTML));

    expect(barTexts(element)).toEqual(['Show hidden lines: 60']);
    expect(shownNumbers(element)).toEqual([]);
  });

  it('shows the shorter text on the bar when a line stands between the versions', () => {
    const element = elementOf(render({ dividerStyle: DiffwiseDividerStyle.Line }));

    expect(barTexts(element)).toEqual(['Hidden lines: 17', 'Hidden lines: 18', 'Hidden lines: 2']);
  });

  it('shows the text of the bar in Polish, or a custom text', () => {
    const polish = elementOf(render({ language: DiffwiseLanguage.PL }));
    const custom = elementOf(render({ customTexts: { showHiddenLinesLabel: 'Expand {count}' } }));

    expect(barTexts(polish)[0]).toBe('Pokaż ukryte linie: 17');
    expect(barTexts(custom)[0]).toBe('Expand 17');
  });

  it('keeps the lines of a table around a bar in one table, which scrolls together', () => {
    const element = elementOf(render({ contextLines: 1 }, plansTable(), plansTable([2, 11])));
    const newLines = Array.from(element.querySelectorAll<HTMLElement>(NEW_CONTENT_SELECTOR));
    const [, , , firstBelowBar] = newLines;

    firstBelowBar.scrollLeft = 60;
    firstBelowBar.dispatchEvent(new Event(SCROLL_EVENT));

    expect(barTexts(element)).toEqual(['Show hidden lines: 6']);
    expect(shownNumbers(element)).toEqual([1, 2, 3, 10, 11, 12]);
    expect(
      Array.from(element.querySelectorAll(CONTENT_SELECTOR), (line) =>
        line.getAttribute(TABLE_ATTRIBUTE),
      ),
    ).toEqual(Array.from({ length: 12 }, () => '0'));
    expect(newLines.map((line) => line.scrollLeft)).toEqual([60, 60, 60, 60, 60, 60]);
  });

  it('makes each bar a button that its text names, with an icon that screen readers skip', () => {
    const bar = elementOf(render()).querySelector(BAR_SELECTOR);

    expect(bar?.tagName).toBe(BUTTON_TAG);
    expect(bar?.getAttribute(TYPE_ATTRIBUTE)).toBe(BUTTON_TYPE);
    expect(bar?.querySelector(ICON_SELECTOR)?.getAttribute(ARIA_HIDDEN_ATTRIBUTE)).toBe('true');
  });
});
