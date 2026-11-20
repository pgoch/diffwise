import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { LineChangeKind } from '../engine';
import type { DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseChangeDetails,
  DiffwiseInlineDiffStyle,
  DiffwiseLanguage,
  DiffwiseLayout,
  DiffwiseUserSetting,
  DiffwiseVersionHeaders,
} from './config/option-values';
import { DiffwiseHtml } from './diffwise-html';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const LAYOUT_INPUT = 'layout';
const INLINE_DIFF_STYLE_INPUT = 'inlineDiffStyle';
const WARN_METHOD = 'warn';
const RESIZE_OBSERVER = 'ResizeObserver';
const OFFSET_WIDTH = 'offsetWidth';
const INLINE_LAYOUT_CLASS = 'diffwise-diff--layout-inline';
const NO_LINE_NUMBERS_CLASS = 'diffwise-diff--no-line-numbers';
const ROW_SELECTOR = '.diffwise-diff__row';
const ROW_KIND_CLASS_START = 'diffwise-diff__row--';
const LINE_NUMBER_SELECTOR = '.diffwise-diff__line-number';
const OLD_LINE_NUMBER_SELECTOR = '.diffwise-diff__line-number--old';
const NEW_LINE_NUMBER_SELECTOR = '.diffwise-diff__line-number--new';
const CONTENT_SELECTOR = '.diffwise-diff__content';
const OLD_CONTENT_CLASS = 'diffwise-diff__content--old';
const MERGED_CONTENT_CLASS = 'diffwise-diff__content--merged';
const OLD_CONTENT_SELECTOR = '.diffwise-diff__content--old';
const NEW_CONTENT_SELECTOR = '.diffwise-diff__content--new';
const MERGED_CONTENT_SELECTOR = '.diffwise-diff__content--merged';
const GAP_CELL_SELECTOR = '.diffwise-diff__gap--cell';

/** The shown row of a table line, without its hidden copies of rows. */
const SHOWN_ROW_SELECTOR = '[data-diffwise-table-copy] > :not([data-diffwise-column-sizers]) > tr';
const SHOWN_GAP_CELL_SELECTOR = `${SHOWN_ROW_SELECTOR} > ${GAP_CELL_SELECTOR}`;
const REMOVED_TEXT_SELECTOR = '.diffwise-diff__highlight--removed';
const ADDED_TEXT_SELECTOR = '.diffwise-diff__highlight--added';
const STRIKETHROUGH_CLASS = 'diffwise-diff--inline-diff-style-strikethrough';
const STACKED_CLASS = 'diffwise-diff--inline-diff-style-stacked';
const GAP_SELECTOR = '.diffwise-diff__gap';
const DIVIDER_SELECTOR = '.diffwise-diff__divider';
const CHANGE_DETAILS_CELL_SELECTOR = '.diffwise-diff__change-details-cell';
const CHANGE_DETAILS_ICON_SELECTOR = '.diffwise-diff__change-details-icon';
const VERSION_HEADERS_SELECTOR = '.diffwise-diff__version-headers';
const VERSION_HEADER_ICON_SELECTOR = '.diffwise-diff__version-header-icon';
const NUMBER_HEADER_SELECTOR =
  '.diffwise-diff__version-header--old, .diffwise-diff__version-header--new';
const CONTENT_HEADER_SELECTOR = '.diffwise-diff__version-header--inline';
const DESCRIBED_MARKER_SELECTOR = '[data-diffwise-change-details]';
const TOOLTIP_SELECTOR = '.diffwise-diff__tooltip';
const TOOLTIP_TITLE_SELECTOR = '.diffwise-diff__tooltip-title';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const FORMATTING_CHANGE_TITLE = 'Formatting change';
const TABINDEX_ATTRIBUTE = 'tabindex';
const TABLE_ATTRIBUTE = 'data-diffwise-table';
const TABLE_NEIGHBORS_ATTRIBUTE = 'data-diffwise-table-neighbors';
const IN_TAB_ORDER = '0';
const MOUSEOVER_EVENT = 'mouseover';
const SCROLL_EVENT = 'scroll';
const OLD = 'old';
const NEW = 'new';
const MERGED = 'merged';
const REQUEST_IDLE_CALLBACK = 'requestIdleCallback';
const CANCEL_IDLE_CALLBACK = 'cancelIdleCallback';
const COLUMNS_ATTRIBUTE = 'data-diffwise-columns';
const COLUMNS_LINE_SELECTOR = `[${COLUMNS_ATTRIBUTE}]`;
const OLD_FIRST_TABLE_KEY = 'old-0';
const NEW_FIRST_TABLE_KEY = 'new-0';
const MERGED_FIRST_TABLE_KEY = 'merged-0';
const NO_KEY = '';
const PARSE_FROM_STRING = 'parseFromString';

/** Marks each piece of HTML that the sanitizer cleans together with others, such as merged lines. */
const SANITIZED_PIECE_ATTRIBUTE = 'data-diffwise-sanitized-piece';

/** One line removed, one unchanged, one changed and one added. */
const OLD_TERMS_HTML = '<p>Old intro.</p><p>Terms of use.</p><p>Reply within 24 hours.</p>';
const NEW_TERMS_HTML = '<p>Terms of use.</p><p>Reply within 48 hours.</p><p>New outro.</p>';

/** A line with another formatting, which an icon and a tooltip describe. */
const ITALIC_HTML = '<p>Intro.</p><p><i>Important:</i> back up your notes.</p>';
const BOLD_HTML = '<p>Intro.</p><p><b>Important:</b> back up your notes.</p>';

/** A table with a changed first row and a changed last row, and a paragraph around it. */
const OLD_PLANS_HTML =
  '<p>Plans</p><table><tr><th>Plan</th></tr><tr><td>Free</td></tr><tr><td>Team of five</td></tr></table>';
const NEW_PLANS_HTML =
  '<p>Plans</p><table><tr><th>Plans</th></tr><tr><td>Free</td></tr><tr><td>Team of eight</td></tr></table>';

/** Text of the merged line of the changed pair of the terms, with the hidden space between 24 and 48. */
const MERGED_REPLY = 'Reply within 24 48 hours.';

/** A table with an added column, a changed price, a removed row and an added row. */
const OLD_PRICES_HTML =
  '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Pro</td><td>49 USD</td></tr><tr><td>Trial</td><td>0 USD</td></tr></table>';
const NEW_PRICES_HTML =
  '<table><tr><th>Plan</th><th>Price</th><th>Users</th></tr><tr><td>Pro</td><td>59 USD</td><td>5</td></tr><tr><td>Company</td><td>149 USD</td><td>25</td></tr></table>';

const CUSTOM_HEADER_TEXTS = { old: 'Version 3', new: 'Version 4' };

/** Open popovers; jsdom has no Popover API, so tests define it and record the calls instead. */
const openPopovers = new Set<Element>();

HTMLElement.prototype.showPopover = function (this: HTMLElement) {
  openPopovers.add(this);
};

HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
  openPopovers.delete(this);
};

/** Stands in for the observer of the browser, which jsdom lacks; a test reports the resizes. */
class FakeResizeObserver {
  static readonly watching = new Set<FakeResizeObserver>();

  constructor(private readonly report: () => void) {}

  observe(): void {
    FakeResizeObserver.watching.add(this);
  }

  disconnect(): void {
    FakeResizeObserver.watching.delete(this);
  }

  static reportResize(): void {
    for (const observer of FakeResizeObserver.watching) {
      observer.report();
    }
  }
}

/** Tasks waiting for the browser to be idle, by their handles; tests run them instead. */
const idleTasks = new Map<number, () => void>();
let lastIdleHandle = 0;

function requestIdleTask(task: () => void): number {
  lastIdleHandle++;
  idleTasks.set(lastIdleHandle, task);

  return lastIdleHandle;
}

function cancelIdleTask(handle: number): void {
  idleTasks.delete(handle);
}

/** Runs the waiting tasks, as an idle browser does. */
function runIdleTasks(): void {
  const tasks = Array.from(idleTasks.values());

  idleTasks.clear();
  tasks.forEach((task) => task());
}

/** A diff to render, and the width its element has before it is first shown. */
interface RenderedDiff {
  readonly oldHtml?: string;
  readonly newHtml?: string;
  readonly options?: DiffwiseConfigOptions;
  /** Width of the element in pixels; jsdom lays out nothing, so without one it has no width. */
  readonly width?: number;
}

function setWidth(element: HTMLElement, width: number): void {
  Object.defineProperty(element, OFFSET_WIDTH, { configurable: true, value: width });
}

/** Renders the diff of the terms, or of the given versions, with its options. */
function render(diff: RenderedDiff = {}): ComponentFixture<DiffwiseHtml> {
  const { oldHtml = OLD_TERMS_HTML, newHtml = NEW_TERMS_HTML, options = {}, width } = diff;
  const fixture = TestBed.createComponent(DiffwiseHtml);

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  if (width !== undefined) {
    setWidth(fixture.nativeElement, width);
  }

  fixture.detectChanges();

  return fixture;
}

/**
 * Renders a diff in a single column and returns its element. A changed pair shows as two lines,
 * unless the options say otherwise.
 */
function renderSingleColumn(diff: RenderedDiff = {}): HTMLElement {
  const options = {
    inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked,
    ...diff.options,
    layout: DiffwiseLayout.Inline,
  };

  return render({ ...diff, options }).nativeElement;
}

/** Renders a diff in a single column with merged lines and returns its element. */
function renderMergedLines(diff: RenderedDiff = {}): HTMLElement {
  const options = { inlineDiffStyle: DiffwiseInlineDiffStyle.Merged, ...diff.options };
  return renderSingleColumn({ ...diff, options });
}

/** The keys of the lines that share the columns of a table, each once, in the order of the view. */
function columnKeysOf(element: HTMLElement): string[] {
  const lines = element.querySelectorAll(COLUMNS_LINE_SELECTOR);

  return [...new Set(Array.from(lines, (line) => line.getAttribute(COLUMNS_ATTRIBUTE) ?? NO_KEY))];
}

/** Resizes the diff as the browser does: the observer reports it, and the diff shows it. */
function resize(fixture: ComponentFixture<DiffwiseHtml>, width: number): void {
  setWidth(fixture.nativeElement, width);
  FakeResizeObserver.reportResize();
  fixture.detectChanges();
}

function showsSingleColumn(element: HTMLElement): boolean {
  const hasSingleColumnParts = element.querySelector(CHANGE_DETAILS_CELL_SELECTOR) !== null;
  const hasSideBySideParts = element.querySelector(DIVIDER_SELECTOR) !== null;

  return (
    element.classList.contains(INLINE_LAYOUT_CLASS) && hasSingleColumnParts && !hasSideBySideParts
  );
}

function rowKind(row: Element) {
  const kindClass = Array.from(row.classList).find((name) => name.startsWith(ROW_KIND_CLASS_START));
  return kindClass?.slice(ROW_KIND_CLASS_START.length);
}

/** The number in a cell of line numbers; `null` for a cell without one. */
function numberIn(row: Element, cellSelector: string): number | null {
  const text = row.querySelector(cellSelector)?.textContent?.trim() ?? '';
  return text.length > 0 ? Number(text) : null;
}

/** What the content of a row shows: a line of one version, or a merged line. */
function versionOf(row: Element) {
  const classes = row.querySelector(CONTENT_SELECTOR)?.classList;

  if (classes?.contains(MERGED_CONTENT_CLASS)) {
    return MERGED;
  }

  return classes?.contains(OLD_CONTENT_CLASS) ? OLD : NEW;
}

/** Rows of the single column as `[kind, shown content, old number, new number, text]`. */
function singleColumnRowsOf(element: HTMLElement) {
  return Array.from(element.querySelectorAll(ROW_SELECTOR), (row) => [
    rowKind(row),
    versionOf(row),
    numberIn(row, OLD_LINE_NUMBER_SELECTOR),
    numberIn(row, NEW_LINE_NUMBER_SELECTOR),
    row.querySelector(CONTENT_SELECTOR)?.textContent,
  ]);
}

function textsOf(element: HTMLElement, selector: string) {
  return Array.from(element.querySelectorAll(selector), (found) => found.textContent?.trim());
}

function attributesOf(element: HTMLElement, selector: string, attribute: string) {
  return Array.from(element.querySelectorAll(selector), (found) => found.getAttribute(attribute));
}

/** For each row, whether an icon of changes stands next to its line. */
function rowsWithIcons(element: HTMLElement) {
  return Array.from(
    element.querySelectorAll(ROW_SELECTOR),
    (row) => row.querySelector(CHANGE_DETAILS_ICON_SELECTOR) !== null,
  );
}

function pointTo(element: Element): void {
  element.dispatchEvent(new MouseEvent(MOUSEOVER_EVENT, { bubbles: true }));
}

function tooltipTitleOf(element: HTMLElement) {
  const tooltip = element.querySelector(TOOLTIP_SELECTOR);
  const isShown = tooltip !== null && openPopovers.has(tooltip);

  return isShown ? tooltip.querySelector(TOOLTIP_TITLE_SELECTOR)?.textContent : null;
}

beforeEach(() => {
  vi.stubGlobal(RESIZE_OBSERVER, FakeResizeObserver);
  vi.stubGlobal(REQUEST_IDLE_CALLBACK, requestIdleTask);
  vi.stubGlobal(CANCEL_IDLE_CALLBACK, cancelIdleTask);
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  FakeResizeObserver.watching.clear();
  openPopovers.clear();
  idleTasks.clear();
});

describe('DiffwiseHtml layout', () => {
  it('shows the versions side by side in a wide diff, and while its width is not known', () => {
    expect(showsSingleColumn(render({ width: 768 }).nativeElement)).toBe(false);
    expect(showsSingleColumn(render().nativeElement)).toBe(false);
  });

  it('shows a single column in a diff narrower than 768 pixels', () => {
    expect(showsSingleColumn(render({ width: 767 }).nativeElement)).toBe(true);
  });

  it('changes the layout when the width of the diff crosses the breakpoint', () => {
    const fixture = render({ width: 1024 });

    resize(fixture, 480);

    expect(showsSingleColumn(fixture.nativeElement)).toBe(true);

    resize(fixture, 1024);

    expect(showsSingleColumn(fixture.nativeElement)).toBe(false);
    expect(fixture.nativeElement.querySelector(GAP_SELECTOR)).not.toBeNull();
  });

  it('follows the breakpoint of the app', () => {
    const options = { layoutBreakpoint: 500 };

    expect(showsSingleColumn(render({ options, width: 600 }).nativeElement)).toBe(false);
    expect(showsSingleColumn(render({ options, width: 499 }).nativeElement)).toBe(true);
  });

  it.each([0, -500, Number.NaN, Number.POSITIVE_INFINITY])(
    'keeps the breakpoint of 768 pixels for the invalid value %s, with a warning',
    (layoutBreakpoint) => {
      const options = { layoutBreakpoint };

      expect(showsSingleColumn(render({ options, width: 767 }).nativeElement)).toBe(true);
      expect(showsSingleColumn(render({ options, width: 768 }).nativeElement)).toBe(false);
      expect(console.warn).toHaveBeenCalled();
    },
  );

  it('keeps the layout the app sets at any width', () => {
    const inline = { layout: DiffwiseLayout.Inline };
    const sideBySide = { layout: DiffwiseLayout.SideBySide };

    expect(showsSingleColumn(render({ options: inline, width: 1600 }).nativeElement)).toBe(true);
    expect(showsSingleColumn(render({ options: sideBySide, width: 320 }).nativeElement)).toBe(
      false,
    );
  });

  it('shows the versions side by side where the width cannot be watched, such as on a server', () => {
    vi.stubGlobal(RESIZE_OBSERVER, undefined);

    expect(showsSingleColumn(render({ width: 320 }).nativeElement)).toBe(false);
  });

  it('shows the same lines after a change of the layout, without comparing them again', () => {
    const options = {
      layout: DiffwiseLayout.SideBySide,
      inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked,
    };
    const fixture = render({ options });
    const element: HTMLElement = fixture.nativeElement;
    const newTexts = textsOf(element, NEW_CONTENT_SELECTOR);

    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();

    expect(textsOf(element, NEW_CONTENT_SELECTOR)).toEqual(newTexts);
  });
});

describe('DiffwiseHtml single column', () => {
  it('shows each line once under its two numbers, and a changed pair as its old line above its new one', () => {
    expect(singleColumnRowsOf(renderSingleColumn())).toEqual([
      [LineChangeKind.Removed, OLD, 1, null, 'Old intro.'],
      [LineChangeKind.Unchanged, NEW, 2, 1, 'Terms of use.'],
      [LineChangeKind.Changed, OLD, 3, null, 'Reply within 24 hours.'],
      [LineChangeKind.Changed, NEW, null, 2, 'Reply within 48 hours.'],
      [LineChangeKind.Added, NEW, null, 3, 'New outro.'],
    ]);
  });

  it('shows no gaps and no column between the versions', () => {
    const element = renderSingleColumn();

    expect(element.querySelector(GAP_SELECTOR)).toBeNull();
    expect(element.querySelector(DIVIDER_SELECTOR)).toBeNull();
    expect(element.querySelectorAll(CHANGE_DETAILS_CELL_SELECTOR)).toHaveLength(5);
  });

  it('heads the numbers with the icons of the versions, and the content with a text', () => {
    const element = renderSingleColumn();

    expect(attributesOf(element, VERSION_HEADER_ICON_SELECTOR, ARIA_LABEL_ATTRIBUTE)).toEqual([
      'Previous version',
      'New version',
    ]);
    expect(textsOf(element, NUMBER_HEADER_SELECTOR)).toEqual(['', '']);
    expect(textsOf(element, CONTENT_HEADER_SELECTOR)).toEqual(['Content after changes']);
  });

  it('shows the header of the single column in Polish on request', () => {
    const element = renderSingleColumn({ options: { language: DiffwiseLanguage.PL } });

    expect(attributesOf(element, VERSION_HEADER_ICON_SELECTOR, ARIA_LABEL_ATTRIBUTE)).toEqual([
      'Poprzednia wersja',
      'Nowa wersja',
    ]);
    expect(textsOf(element, CONTENT_HEADER_SELECTOR)).toEqual(['Treść po zmianach']);
  });

  it('shows a custom text above the content', () => {
    const options = { customTexts: { inlineContentLabel: 'Draft with changes' } };

    expect(textsOf(renderSingleColumn({ options }), CONTENT_HEADER_SELECTOR)).toEqual([
      'Draft with changes',
    ]);
  });

  it('joins the header texts of the app above the content, next to the icons', () => {
    const element = renderSingleColumn({ options: { versionHeaders: CUSTOM_HEADER_TEXTS } });

    expect(textsOf(element, CONTENT_HEADER_SELECTOR)).toEqual(['Version 3 → Version 4']);
    expect(element.querySelectorAll(VERSION_HEADER_ICON_SELECTOR)).toHaveLength(2);
  });

  it('shows only the icons above the numbers when icons head the versions', () => {
    const options = { versionHeaders: DiffwiseVersionHeaders.Icons };
    const element = renderSingleColumn({ options });

    expect(textsOf(element, CONTENT_HEADER_SELECTOR)).toEqual(['']);
    expect(element.querySelectorAll(VERSION_HEADER_ICON_SELECTOR)).toHaveLength(2);
  });

  it('shows no headers on request', () => {
    const options = { showVersionHeaders: false };

    expect(renderSingleColumn({ options }).querySelector(VERSION_HEADERS_SELECTOR)).toBeNull();
  });

  it('shows no numbers and no icons of the versions without line numbers', () => {
    const element = renderSingleColumn({ options: { showLineNumbers: false } });

    expect(element.classList.contains(NO_LINE_NUMBERS_CLASS)).toBe(true);
    expect(element.querySelector(LINE_NUMBER_SELECTOR)).toBeNull();
    expect(element.querySelector(VERSION_HEADER_ICON_SELECTOR)).toBeNull();
    expect(textsOf(element, CONTENT_HEADER_SELECTOR)).toEqual(['Content after changes']);
    expect(element.querySelectorAll(CHANGE_DETAILS_CELL_SELECTOR)).toHaveLength(5);
  });

  it('sizes both columns of numbers by the digits of the highest number', () => {
    const tenLines = '<p>Line.</p>'.repeat(10);
    const element = renderSingleColumn({ oldHtml: tenLines, newHtml: '<p>Line.</p>' });

    expect(element.style.getPropertyValue('--diffwise-line-number-digits')).toBe('2');
  });

  it('shows the icon of a changed pair next to its new line, with the tooltip of its changes', () => {
    const element = renderSingleColumn({ oldHtml: ITALIC_HTML, newHtml: BOLD_HTML });
    const icon = element.querySelector(CHANGE_DETAILS_ICON_SELECTOR) as HTMLElement;

    expect(rowsWithIcons(element)).toEqual([false, false, true]);
    expect(icon.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(FORMATTING_CHANGE_TITLE);

    pointTo(icon);

    expect(tooltipTitleOf(element)).toBe(FORMATTING_CHANGE_TITLE);
  });

  it('shows the details of a marked change on hover in both lines of a changed pair', () => {
    const element = renderSingleColumn({ oldHtml: ITALIC_HTML, newHtml: BOLD_HTML });
    const oldMarker = element.querySelector(`${OLD_CONTENT_SELECTOR} ${DESCRIBED_MARKER_SELECTOR}`);
    const newMarker = element.querySelector(`${NEW_CONTENT_SELECTOR} ${DESCRIBED_MARKER_SELECTOR}`);

    pointTo(oldMarker as Element);

    expect(tooltipTitleOf(element)).toBe(FORMATTING_CHANGE_TITLE);

    pointTo(newMarker as Element);

    expect(tooltipTitleOf(element)).toBe(FORMATTING_CHANGE_TITLE);
  });

  it('shows no icons when only marked changes show the details, which take the focus then', async () => {
    const options = {
      changeDetails: DiffwiseChangeDetails.Hover,
      inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked,
    };
    const fixture = render({ oldHtml: ITALIC_HTML, newHtml: BOLD_HTML, options });
    const element: HTMLElement = fixture.nativeElement;

    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector(CHANGE_DETAILS_ICON_SELECTOR)).toBeNull();
    expect(
      attributesOf(
        element,
        `${NEW_CONTENT_SELECTOR} ${DESCRIBED_MARKER_SELECTOR}`,
        TABINDEX_ATTRIBUTE,
      ),
    ).toEqual([IN_TAB_ORDER]);
  });

  it('gives the lines of both versions of a table one position, and says what stands around each', () => {
    const element = renderSingleColumn({ oldHtml: OLD_PLANS_HTML, newHtml: NEW_PLANS_HTML });

    expect(attributesOf(element, CONTENT_SELECTOR, TABLE_ATTRIBUTE)).toEqual([
      null,
      '0',
      '0',
      '0',
      '0',
      '0',
    ]);
    expect(attributesOf(element, CONTENT_SELECTOR, TABLE_NEIGHBORS_ATTRIBUTE)).toEqual([
      null,
      'line-below',
      'line-above row-above line-below',
      'line-above row-above line-below',
      'line-above row-above line-below',
      'line-above row-above',
    ]);
  });

  it('scrolls the lines of both versions of a table together', () => {
    const element = renderSingleColumn({ oldHtml: OLD_PLANS_HTML, newHtml: NEW_PLANS_HTML });
    const lines = Array.from(element.querySelectorAll<HTMLElement>(CONTENT_SELECTOR));
    const oldLastRow = lines[4];

    oldLastRow.scrollLeft = 120;
    oldLastRow.dispatchEvent(new Event(SCROLL_EVENT));

    expect(lines.map((line) => line.scrollLeft)).toEqual([0, 120, 120, 120, 120, 120]);
  });
});

describe('DiffwiseHtml merged lines', () => {
  it('shows a changed pair as one merged line under both of its numbers, by default', () => {
    const element: HTMLElement = render({
      options: { layout: DiffwiseLayout.Inline },
    }).nativeElement;

    expect(singleColumnRowsOf(element)).toEqual([
      [LineChangeKind.Removed, OLD, 1, null, 'Old intro.'],
      [LineChangeKind.Unchanged, NEW, 2, 1, 'Terms of use.'],
      [LineChangeKind.Changed, MERGED, 3, 2, MERGED_REPLY],
      [LineChangeKind.Added, NEW, null, 3, 'New outro.'],
    ]);
    expect(element.classList.contains(STRIKETHROUGH_CLASS)).toBe(false);
    expect(element.classList.contains(STACKED_CLASS)).toBe(false);
  });

  it('marks the removed and the added text of a merged line', () => {
    const element = renderMergedLines();
    const removedText = `${MERGED_CONTENT_SELECTOR} ${REMOVED_TEXT_SELECTOR}`;
    const addedText = `${MERGED_CONTENT_SELECTOR} ${ADDED_TEXT_SELECTOR}`;

    expect(textsOf(element, removedText)).toEqual(['24']);
    expect(textsOf(element, addedText)).toEqual(['48']);
  });

  it('shows merged lines with a class of its own when removed text is struck through', () => {
    const options = { inlineDiffStyle: DiffwiseInlineDiffStyle.Strikethrough };
    const element = renderMergedLines({ options });

    expect(element.classList.contains(STRIKETHROUGH_CLASS)).toBe(true);
    expect(textsOf(element, MERGED_CONTENT_SELECTOR)).toEqual([MERGED_REPLY]);
  });

  it('shows a changed pair as two lines, with a class of its own, when changes are stacked', () => {
    const options = { inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked };
    const element = renderMergedLines({ options });

    expect(element.classList.contains(STACKED_CLASS)).toBe(true);
    expect(element.querySelector(MERGED_CONTENT_SELECTOR)).toBeNull();
    expect(textsOf(element, OLD_CONTENT_SELECTOR)).toContain('Reply within 24 hours.');
  });

  it('shows merged lines as soon as the way to show changed lines asks for them', () => {
    const options = {
      layout: DiffwiseLayout.Inline,
      inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked,
    };
    const fixture = render({ options });
    const element: HTMLElement = fixture.nativeElement;

    fixture.componentRef.setInput(INLINE_DIFF_STYLE_INPUT, DiffwiseInlineDiffStyle.Merged);
    fixture.detectChanges();

    expect(textsOf(element, MERGED_CONTENT_SELECTOR)).toEqual([MERGED_REPLY]);

    fixture.componentRef.setInput(INLINE_DIFF_STYLE_INPUT, DiffwiseInlineDiffStyle.Stacked);
    fixture.detectChanges();

    expect(element.querySelector(MERGED_CONTENT_SELECTOR)).toBeNull();
  });

  it('shows merged lines in a diff that turns into a single column', () => {
    const fixture = render({ width: 1024 });
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector(MERGED_CONTENT_SELECTOR)).toBeNull();

    resize(fixture, 480);

    expect(textsOf(element, MERGED_CONTENT_SELECTOR)).toEqual([MERGED_REPLY]);

    resize(fixture, 1024);

    expect(element.querySelector(MERGED_CONTENT_SELECTOR)).toBeNull();
    expect(textsOf(element, NEW_CONTENT_SELECTOR)).toContain('Reply within 48 hours.');
  });

  it('shows the icon of a changed pair next to its merged line, with the tooltip of its changes', () => {
    const element = renderMergedLines({ oldHtml: ITALIC_HTML, newHtml: BOLD_HTML });
    const icon = element.querySelector(CHANGE_DETAILS_ICON_SELECTOR) as HTMLElement;
    const marker = element.querySelector(`${MERGED_CONTENT_SELECTOR} ${DESCRIBED_MARKER_SELECTOR}`);

    expect(rowsWithIcons(element)).toEqual([false, true]);

    pointTo(icon);

    expect(tooltipTitleOf(element)).toBe(FORMATTING_CHANGE_TITLE);

    pointTo(marker as Element);

    expect(tooltipTitleOf(element)).toBe(FORMATTING_CHANGE_TITLE);
  });

  it('lets the marked changes of a merged line take the focus when no icons show their details', async () => {
    const options = { changeDetails: DiffwiseChangeDetails.Hover };
    const fixture = render({ oldHtml: ITALIC_HTML, newHtml: BOLD_HTML, options });
    const element: HTMLElement = fixture.nativeElement;

    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      attributesOf(
        element,
        `${MERGED_CONTENT_SELECTOR} ${DESCRIBED_MARKER_SELECTOR}`,
        TABINDEX_ATTRIBUTE,
      ),
    ).toEqual([IN_TAB_ORDER]);
  });

  it('shows the two versions of a table as one table with the columns of both', () => {
    const element = renderMergedLines({ oldHtml: OLD_PRICES_HTML, newHtml: NEW_PRICES_HTML });
    const rowsWithoutTexts = singleColumnRowsOf(element).map((row) => row.slice(0, -1));

    expect(rowsWithoutTexts).toEqual([
      [LineChangeKind.Changed, MERGED, 1, 1],
      [LineChangeKind.Changed, MERGED, 2, 2],
      [LineChangeKind.Removed, OLD, 3, null],
      [LineChangeKind.Added, NEW, null, 3],
    ]);
    expect(attributesOf(element, CONTENT_SELECTOR, TABLE_ATTRIBUTE)).toEqual(['0', '0', '0', '0']);
    expect(
      element.querySelectorAll(`${OLD_CONTENT_SELECTOR} ${SHOWN_GAP_CELL_SELECTOR}`),
    ).toHaveLength(1);
    expect(
      textsOf(element, `${MERGED_CONTENT_SELECTOR} ${SHOWN_ROW_SELECTOR} ${REMOVED_TEXT_SELECTOR}`),
    ).toEqual(['49']);
  });

  it('shows the two versions of a table as two tables when changes are stacked', () => {
    const options = { inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked };
    const element = renderMergedLines({
      oldHtml: OLD_PRICES_HTML,
      newHtml: NEW_PRICES_HTML,
      options,
    });

    expect(element.querySelector(MERGED_CONTENT_SELECTOR)).toBeNull();
    expect(element.querySelector(GAP_CELL_SELECTOR)).toBeNull();
  });

  it('scrolls the lines of a merged table together', () => {
    const element = renderMergedLines({ oldHtml: OLD_PRICES_HTML, newHtml: NEW_PRICES_HTML });
    const lines = Array.from(element.querySelectorAll<HTMLElement>(CONTENT_SELECTOR));
    const [, mergedRow] = lines;

    mergedRow.scrollLeft = 80;
    mergedRow.dispatchEvent(new Event(SCROLL_EVENT));

    expect(lines.map((line) => line.scrollLeft)).toEqual([80, 80, 80, 80]);
  });
});

describe('DiffwiseHtml table columns', () => {
  it('marks the lines of each table with the key of the lines that share its columns: those of a version, or merged ones', () => {
    const sideBySide = render({
      oldHtml: OLD_PRICES_HTML,
      newHtml: NEW_PRICES_HTML,
      options: { layout: DiffwiseLayout.SideBySide },
    }).nativeElement;
    const merged = renderMergedLines({ oldHtml: OLD_PRICES_HTML, newHtml: NEW_PRICES_HTML });

    expect(columnKeysOf(sideBySide)).toEqual([OLD_FIRST_TABLE_KEY, NEW_FIRST_TABLE_KEY]);
    expect(columnKeysOf(merged)).toEqual([
      MERGED_FIRST_TABLE_KEY,
      OLD_FIRST_TABLE_KEY,
      NEW_FIRST_TABLE_KEY,
    ]);
  });
});

describe('DiffwiseHtml merged lines prepared ahead', () => {
  it('makes the merged lines while the browser is idle, without comparing the versions again', async () => {
    const fixture = render({ options: { layout: DiffwiseLayout.SideBySide } });

    await fixture.whenStable();

    const parse = vi.spyOn(DOMParser.prototype, PARSE_FROM_STRING);

    expect(idleTasks.size).toBe(1);

    runIdleTasks();

    const parsedHtml = parse.mock.calls.map(([html]) => String(html));

    expect(parsedHtml.length).toBeGreaterThan(0);
    expect(parsedHtml.every((html) => html.includes(SANITIZED_PIECE_ATTRIBUTE))).toBe(true);

    parse.mockClear();
    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();

    expect(parse).not.toHaveBeenCalled();
    expect(textsOf(fixture.nativeElement, MERGED_CONTENT_SELECTOR)).toEqual([MERGED_REPLY]);
  });

  it('prepares the new versions after a new comparison, and drops the waiting task', async () => {
    const fixture = render({ options: { layout: DiffwiseLayout.SideBySide } });

    await fixture.whenStable();
    const [firstHandle] = idleTasks.keys();

    fixture.componentRef.setInput(NEW_HTML_INPUT, OLD_TERMS_HTML.replace('24', '72'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(idleTasks.has(firstHandle)).toBe(false);
    expect(idleTasks.size).toBe(1);
  });

  it('prepares nothing once the diff shows merged lines', async () => {
    const fixture = render({ options: { layout: DiffwiseLayout.Inline } });

    await fixture.whenStable();

    expect(idleTasks.size).toBe(0);
  });

  it('prepares nothing when the diff cannot show merged lines, or the versions are the same', async () => {
    const sideBySideOnly = {
      layout: DiffwiseLayout.SideBySide,
      allowedUserSettings: [DiffwiseUserSetting.ColorMode],
    };
    const stackedOnly = {
      inlineDiffStyle: DiffwiseInlineDiffStyle.Stacked,
      allowedUserSettings: [DiffwiseUserSetting.Layout],
    };

    await render({ options: sideBySideOnly }).whenStable();
    await render({ options: stackedOnly }).whenStable();
    await render({ newHtml: OLD_TERMS_HTML }).whenStable();

    expect(idleTasks.size).toBe(0);
  });
});
