const SCROLL_EVENT = 'scroll';

/** Holds the position of a table line's table among the tables of its version. */
const TABLE_ATTRIBUTE = 'data-diffwise-table';

const OLD_CONTENT_SELECTOR = '.diffwise-html-diff__content--old';
const NEW_CONTENT_SELECTOR = '.diffwise-html-diff__content--new';
const TABLE_LINE_SELECTOR = `:is(${OLD_CONTENT_SELECTOR}, ${NEW_CONTENT_SELECTOR})[${TABLE_ATTRIBUTE}]`;

/**
 * Scrolls the lines of a table together, so a table wider than its column scrolls as one, by the
 * scrollbar under its last row or by any of its rows. Each version scrolls its own tables.
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

/** Lines of the table of a line, in the same version. */
function linesOfSameTable(host: HTMLElement, line: HTMLElement): NodeListOf<HTMLElement> {
  const version = line.matches(OLD_CONTENT_SELECTOR) ? OLD_CONTENT_SELECTOR : NEW_CONTENT_SELECTOR;
  const table = line.getAttribute(TABLE_ATTRIBUTE);

  return host.querySelectorAll(`${version}[${TABLE_ATTRIBUTE}="${table}"]`);
}
