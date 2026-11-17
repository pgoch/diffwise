import type { ViewLine } from '../engine';

const SCROLL_EVENT = 'scroll';
const WHEEL_EVENT = 'wheel';
const PIXEL_UNIT = 'px';
const NO_TEXT = '';
const LINE_FEED = '\n';

/** How far the lines are scrolled, in px; styles move the text of each line by it. */
const LINE_SCROLL_VARIABLE = '--diffwise-line-scroll';

const SCROLLBAR_SELECTOR = '.diffwise-diff__line-scrollbar';
const NEW_SCROLLBAR_SELECTOR = '.diffwise-diff__line-scrollbar--new';
const CONTENT_SELECTOR = '.diffwise-diff__content';

const TABINDEX_ATTRIBUTE = 'tabindex';
const ROLE_ATTRIBUTE = 'role';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const GROUP_ROLE = 'group';
const IN_TAB_ORDER = '0';

/** A `tabindex` that keeps a scrollbar without long lines out of the order of `Tab`. */
const OUT_OF_TAB_ORDER = '-1';

/** The `deltaMode` of a wheel that counts lines, not pixels, as some mice do. */
const DELTA_IN_LINES = 1;

/** Pixels of one line of such a wheel. */
const WHEEL_LINE_PIXELS = 16;

/** Lines that give the scrollbars their length: the longest ones, which are mostly the widest. */
const MEASURED_LINE_COUNT = 5;

/** Tags in the HTML of a line of plain text, such as the markers of changed text. */
const TAG = /<[^>]*>/g;

/** Characters of markup that the HTML of a line of plain text escapes. */
const CHARACTER_REFERENCE = /&(?:amp|lt|gt);/g;

const ESCAPED_CHARACTERS: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};

const TAB = /\t/g;

/** A tab counts as this many characters when the longest lines are chosen. */
const TAB_AS_SPACES = '    ';

/** A line's text as the reader sees it, and its length with tabs as several characters. */
interface MeasuredLine {
  readonly text: string;
  readonly length: number;
}

/**
 * The texts of the longest lines, one under another. In the font of the lines, they are as wide as
 * the widest line, which gives the scrollbars of the lines their length.
 */
export function widestLinesText(lines: readonly (ViewLine | null)[]): string {
  const measuredLines: MeasuredLine[] = [];

  for (const line of lines) {
    if (line !== null) {
      measuredLines.push(measuredLine(line.html));
    }
  }

  measuredLines.sort((first, second) => second.length - first.length);

  const longestLines = measuredLines.slice(0, MEASURED_LINE_COUNT);

  return longestLines.map((line) => line.text).join(LINE_FEED);
}

/**
 * Scrolls the lines sideways together, by their scrollbars, which follow one another, and by the
 * wheel or the touchpad over a line: sideways, or down and up with `Shift`.
 */
export function scrollLinesTogether(host: HTMLElement, signal: AbortSignal): void {
  const scrollOptions = { capture: true, passive: true, signal };
  const wheelOptions = { passive: false, signal };

  host.addEventListener(SCROLL_EVENT, ({ target }) => followScrollbar(host, target), scrollOptions);
  host.addEventListener(WHEEL_EVENT, (event) => scrollByWheel(host, event), wheelOptions);
}

/**
 * After each drawing: scrolls new scrollbars to where the lines are, and gives the scrollbar of the
 * new version one stop of `Tab`, named for screen readers, while a line is wider than its column.
 */
export function prepareLineScrollbars(host: HTMLElement, label: string): void {
  const newScrollbar = host.querySelector<HTMLElement>(NEW_SCROLLBAR_SELECTOR);

  if (newScrollbar === null) {
    return;
  }

  scrollLinesTo(host, linesScrollOf(host));

  const hasLongLines = newScrollbar.scrollWidth > newScrollbar.clientWidth;

  if (hasLongLines) {
    newScrollbar.setAttribute(TABINDEX_ATTRIBUTE, IN_TAB_ORDER);
    newScrollbar.setAttribute(ROLE_ATTRIBUTE, GROUP_ROLE);
    newScrollbar.setAttribute(ARIA_LABEL_ATTRIBUTE, label);
  } else {
    newScrollbar.setAttribute(TABINDEX_ATTRIBUTE, OUT_OF_TAB_ORDER);
    newScrollbar.removeAttribute(ROLE_ATTRIBUTE);
    newScrollbar.removeAttribute(ARIA_LABEL_ATTRIBUTE);
  }
}

/** A line's text without the tags of its HTML, and its length. */
function measuredLine(html: string): MeasuredLine {
  const text = html
    .replace(TAG, NO_TEXT)
    .replace(CHARACTER_REFERENCE, (reference) => ESCAPED_CHARACTERS[reference]);
  const length = text.replace(TAB, TAB_AS_SPACES).length;

  return { text, length };
}

/** Scrolls the lines and the other scrollbars to the place of the scrolled scrollbar. */
function followScrollbar(host: HTMLElement, scrolled: EventTarget | null): void {
  const isScrollbar = scrolled instanceof HTMLElement && scrolled.matches(SCROLLBAR_SELECTOR);

  if (isScrollbar) {
    scrollLinesTo(host, scrolled.scrollLeft);
  }
}

/**
 * Scrolls the scrollbars to the place, as far as they reach, and the lines to where the scrollbar
 * of the new version stands, which shows in every layout.
 */
function scrollLinesTo(host: HTMLElement, place: number): void {
  for (const scrollbar of host.querySelectorAll<HTMLElement>(SCROLLBAR_SELECTOR)) {
    if (scrollbar.scrollLeft !== place) {
      scrollbar.scrollLeft = place;
    }
  }

  const newScrollbar = host.querySelector<HTMLElement>(NEW_SCROLLBAR_SELECTOR);
  const reachedPlace = newScrollbar?.scrollLeft ?? 0;

  host.style.setProperty(LINE_SCROLL_VARIABLE, reachedPlace + PIXEL_UNIT);
}

/** How far the lines are scrolled now, in px. */
function linesScrollOf(host: HTMLElement): number {
  const value = Number.parseFloat(host.style.getPropertyValue(LINE_SCROLL_VARIABLE));
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Scrolls the lines by a wheel or a touchpad over a line, when it moves mostly sideways, or with
 * `Shift`. Movement down and up stays with the page.
 */
function scrollByWheel(host: HTMLElement, event: WheelEvent): void {
  const scrollbar = host.querySelector<HTMLElement>(NEW_SCROLLBAR_SELECTOR);
  const isOverLine =
    event.target instanceof Element && event.target.closest(CONTENT_SELECTOR) !== null;
  const movesSideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const shiftedDelta = event.shiftKey ? event.deltaY : 0;
  const sidewaysDelta = movesSideways ? event.deltaX : shiftedDelta;

  if (scrollbar === null || !isOverLine || sidewaysDelta === 0) {
    return;
  }

  const isInLines = event.deltaMode === DELTA_IN_LINES;
  const pixels = isInLines ? sidewaysDelta * WHEEL_LINE_PIXELS : sidewaysDelta;
  const placeBefore = scrollbar.scrollLeft;

  scrollbar.scrollLeft = placeBefore + pixels;

  if (scrollbar.scrollLeft !== placeBefore) {
    event.preventDefault();
  }
}
