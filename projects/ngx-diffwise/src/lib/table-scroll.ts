const SCROLL_EVENT = 'scroll';

/** Holds the position of a table line's table among the tables of its version. */
const TABLE_ATTRIBUTE = 'data-diffwise-table';

/** The class of a diff that shows a single column. */
const INLINE_LAYOUT_CLASS = 'diffwise-html-diff--layout-inline';

const OLD_CONTENT_SELECTOR = '.diffwise-html-diff__content--old';
const NEW_CONTENT_SELECTOR = '.diffwise-html-diff__content--new';
const TABLE_LINE_SELECTOR = `:is(${OLD_CONTENT_SELECTOR}, ${NEW_CONTENT_SELECTOR})[${TABLE_ATTRIBUTE}]`;

/**
 * Scrolls the lines of a table together, so a table wider than its column scrolls as one, by the
 * scrollbar under its last row or by any of its rows. Each version scrolls its own tables; in the
 * single column, the lines of both versions of a table scroll together.
 */
export function scrollTablesTogether(host: HTMLElement, signal: AbortSignal): void {
  const options = { capture: true, passive: true, signal };

  host.addEventListener(SCROLL_EVENT, ({ target }) => followTableLine(host, target), options);
}

/** Scrolls the other lines of the scrolled line's table to the same place. */
function followTableLine(host: HTMLElement, scrolled: EventTarget | null): void {
  const isTableLine = scrolled instanceof HTMLElement && scrolled.matches(TABLE_LINE_SELECTOR);

  if (!isTableLine) {
    return;
  }

  for (const line of linesOfSameTable(host, scrolled)) {
    if (line.scrollLeft !== scrolled.scrollLeft) {
      line.scrollLeft = scrolled.scrollLeft;
    }
  }
}

/**
 * Lines of the table of a line: in the same version, or in the single column in both versions,
 * since the table has one position there.
 */
function linesOfSameTable(host: HTMLElement, line: HTMLElement): NodeListOf<HTMLElement> {
  const table = line.getAttribute(TABLE_ATTRIBUTE);
  const linesOfTable = `[${TABLE_ATTRIBUTE}="${table}"]`;

  if (host.classList.contains(INLINE_LAYOUT_CLASS)) {
    return host.querySelectorAll(linesOfTable);
  }

  const version = line.matches(OLD_CONTENT_SELECTOR) ? OLD_CONTENT_SELECTOR : NEW_CONTENT_SELECTOR;

  return host.querySelectorAll(version + linesOfTable);
}
