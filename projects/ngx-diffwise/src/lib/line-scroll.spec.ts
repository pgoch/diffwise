import { type ViewLine } from '../engine';
import { LineKind } from '../engine/model';
import { prepareLineScrollbars, scrollLinesTogether, widestLinesText } from './line-scroll';

const DIV_TAG = 'div';
const SCROLL_EVENT = 'scroll';
const WHEEL_EVENT = 'wheel';
const LINE_SCROLL_VARIABLE = '--diffwise-line-scroll';
const OLD_SCROLLBAR_CLASSES = [
  'diffwise-diff__line-scrollbar',
  'diffwise-diff__line-scrollbar--old',
];
const NEW_SCROLLBAR_CLASSES = [
  'diffwise-diff__line-scrollbar',
  'diffwise-diff__line-scrollbar--new',
];
const CONTENT_CLASS = 'diffwise-diff__content';
const TABINDEX_ATTRIBUTE = 'tabindex';
const ROLE_ATTRIBUTE = 'role';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const LABEL = 'Long lines, scroll sideways';
const SCROLL_LEFT_PROPERTY = 'scrollLeft';
const CLIENT_WIDTH_PROPERTY = 'clientWidth';
const SCROLL_WIDTH_PROPERTY = 'scrollWidth';
const IN_TAB_ORDER = '0';
const OUT_OF_TAB_ORDER = '-1';
const GROUP_ROLE = 'group';

/** How far a scrollbar can scroll, in px, as the browser would clamp it. */
const SCROLL_RANGE = 300;

/** A line of the view with its HTML. */
function line(html: string): ViewLine {
  return { kind: LineKind.Paragraph, number: 1, html, table: null };
}

/** A scrollbar that keeps its place within the range, as jsdom does not scroll. */
function scrollbar(classes: readonly string[], width: number, scrollWidth: number): HTMLElement {
  const element = document.createElement(DIV_TAG);
  let place = 0;

  element.classList.add(...classes);
  Object.defineProperty(element, SCROLL_LEFT_PROPERTY, {
    get: () => place,
    set: (value: number) => {
      place = Math.max(0, Math.min(value, SCROLL_RANGE));
    },
  });
  Object.defineProperty(element, CLIENT_WIDTH_PROPERTY, { value: width });
  Object.defineProperty(element, SCROLL_WIDTH_PROPERTY, { value: scrollWidth });

  return element;
}

/** A diff with a line and the scrollbars of both versions. */
function diffWithScrollbars(scrollWidth = 900) {
  const host = document.createElement(DIV_TAG);
  const content = document.createElement(DIV_TAG);
  const oldScrollbar = scrollbar(OLD_SCROLLBAR_CLASSES, 600, scrollWidth);
  const newScrollbar = scrollbar(NEW_SCROLLBAR_CLASSES, 600, scrollWidth);

  content.classList.add(CONTENT_CLASS);
  host.append(content, oldScrollbar, newScrollbar);
  document.body.append(host);

  return { host, content, oldScrollbar, newScrollbar };
}

function linesScrollOf(host: HTMLElement): string {
  return host.style.getPropertyValue(LINE_SCROLL_VARIABLE);
}

function wheel(target: HTMLElement, init: WheelEventInit): WheelEvent {
  const event = new WheelEvent(WHEEL_EVENT, { bubbles: true, cancelable: true, ...init });

  target.dispatchEvent(event);

  return event;
}

let listeners: AbortController;

beforeEach(() => {
  listeners = new AbortController();
});

afterEach(() => {
  listeners.abort();
  document.body.replaceChildren();
});

describe('widestLinesText', () => {
  it('gives the texts of the five longest lines as a reader sees them, one under another', () => {
    const lines = [
      line('short'),
      null,
      line('a <del class="diffwise-diff__highlight">longer</del> line &lt;b&gt; &amp; more'),
      line('\tone tab'),
      line('six'),
      line('four'),
      line('eight ch'),
      line('seven c'),
    ];

    expect(widestLinesText(lines)).toBe(
      ['a longer line <b> & more', '\tone tab', 'eight ch', 'seven c', 'short'].join('\n'),
    );
  });

  it('gives no text without lines', () => {
    expect(widestLinesText([null])).toBe('');
  });
});

describe('scrollLinesTogether', () => {
  it('scrolls the lines and the other scrollbar to the place of a scrolled scrollbar', () => {
    const { host, oldScrollbar, newScrollbar } = diffWithScrollbars();

    scrollLinesTogether(host, listeners.signal);
    oldScrollbar.scrollLeft = 120;
    oldScrollbar.dispatchEvent(new Event(SCROLL_EVENT));

    expect(newScrollbar.scrollLeft).toBe(120);
    expect(linesScrollOf(host)).toBe('120px');
  });

  it('scrolls the lines by a wheel or a touchpad over a line that moves sideways, or with Shift', () => {
    const { host, content, newScrollbar } = diffWithScrollbars();

    scrollLinesTogether(host, listeners.signal);

    const sideways = wheel(content, { deltaX: 40, deltaY: 5 });
    const shifted = wheel(content, { deltaY: 30, shiftKey: true });
    const inLines = wheel(content, { deltaX: 2, deltaMode: 1 });

    expect(newScrollbar.scrollLeft).toBe(102);
    expect([sideways, shifted, inLines].every((event) => event.defaultPrevented)).toBe(true);
  });

  it('leaves the page to scroll down and up, beyond the ends of the lines and outside them', () => {
    const { host, content, newScrollbar } = diffWithScrollbars();

    scrollLinesTogether(host, listeners.signal);

    const down = wheel(content, { deltaX: 5, deltaY: 40 });
    const beforeStart = wheel(content, { deltaX: -40 });
    const outsideLines = wheel(newScrollbar, { deltaX: 40 });

    expect(newScrollbar.scrollLeft).toBe(0);
    expect([down, beforeStart, outsideLines].some((event) => event.defaultPrevented)).toBe(false);
  });
});

describe('prepareLineScrollbars', () => {
  it('gives the scrollbar of the new version a named stop of Tab while a line is too wide', () => {
    const { host, newScrollbar } = diffWithScrollbars();

    prepareLineScrollbars(host, LABEL);

    expect(newScrollbar.getAttribute(TABINDEX_ATTRIBUTE)).toBe(IN_TAB_ORDER);
    expect(newScrollbar.getAttribute(ROLE_ATTRIBUTE)).toBe(GROUP_ROLE);
    expect(newScrollbar.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(LABEL);
  });

  it('keeps the scrollbar out of the order of Tab without a line wider than its column', () => {
    const { host, newScrollbar } = diffWithScrollbars(600);

    prepareLineScrollbars(host, LABEL);

    expect(newScrollbar.getAttribute(TABINDEX_ATTRIBUTE)).toBe(OUT_OF_TAB_ORDER);
    expect(newScrollbar.hasAttribute(ROLE_ATTRIBUTE)).toBe(false);
    expect(newScrollbar.hasAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(false);
  });

  it('scrolls new scrollbars to where the lines are, as far as they reach', () => {
    const { host, oldScrollbar, newScrollbar } = diffWithScrollbars();

    host.style.setProperty(LINE_SCROLL_VARIABLE, '450px');
    prepareLineScrollbars(host, LABEL);

    expect([oldScrollbar.scrollLeft, newScrollbar.scrollLeft]).toEqual([300, 300]);
    expect(linesScrollOf(host)).toBe('300px');
  });
});
