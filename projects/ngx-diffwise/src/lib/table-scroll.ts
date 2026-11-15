const SCROLL_EVENT = 'scroll';

/** Holds the position of a table line's table among the tables of its version. */
const TABLE_ATTRIBUTE = 'data-diffwise-table';

/** The class of a diff that shows a single column. */
const INLINE_LAYOUT_CLASS = 'diffwise-html-diff--layout-inline';

const OLD_CONTENT_SELECTOR = '.diffwise-html-diff__content--old';
const NEW_CONTENT_SELECTOR = '.diffwise-html-diff__content--new';

/** The content of a merged line, such as a changed row of a table whose versions show as one. */
const MERGED_CONTENT_SELECTOR = '.diffwise-html-diff__content--merged';
const TABLE_LINE_SELECTOR = `:is(${OLD_CONTENT_SELECTOR}, ${NEW_CONTENT_SELECTOR}, ${MERGED_CONTENT_SELECTOR})[${TABLE_ATTRIBUTE}]`;

const TABINDEX_ATTRIBUTE = 'tabindex';
const ROLE_ATTRIBUTE = 'role';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const GROUP_ROLE = 'group';
const IN_TAB_ORDER = '0';

/** A `tabindex` that keeps a scrolling line out of the order of `Tab`. */
const OUT_OF_TAB_ORDER = '-1';

/**
 * Scrolls the lines of a table together, so a table wider than its column scrolls as one, by the
 * scrollbar under its last row or by any of its rows. Each version scrolls its own tables; in the
 * single column, the lines of both versions of a table scroll together, its merged lines too.
 */
export function scrollTablesTogether(host: HTMLElement, signal: AbortSignal): void {
  const options = { capture: true, passive: true, signal };

  host.addEventListener(SCROLL_EVENT, ({ target }) => followTableLine(host, target), options);
}

/**
 * Gives a table wider than its column one stop of `Tab`: its last line, which has the scrollbar,
 * named for screen readers. The browser would make every scrolling line a stop without a name.
 */
export function markWideTables(host: HTMLElement, label: string): void {
  const lastLines = new Map<string, HTMLElement>();

  for (const line of host.querySelectorAll<HTMLElement>(TABLE_LINE_SELECTOR)) {
    line.setAttribute(TABINDEX_ATTRIBUTE, OUT_OF_TAB_ORDER);
    line.removeAttribute(ROLE_ATTRIBUTE);
    line.removeAttribute(ARIA_LABEL_ATTRIBUTE);
    lastLines.set(tableKeyOf(host, line), line);
  }

  for (const line of lastLines.values()) {
    const isWide = line.scrollWidth > line.clientWidth;

    if (isWide) {
      line.setAttribute(TABINDEX_ATTRIBUTE, IN_TAB_ORDER);
      line.setAttribute(ROLE_ATTRIBUTE, GROUP_ROLE);
      line.setAttribute(ARIA_LABEL_ATTRIBUTE, label);
    }
  }
}

/** The table of a line: in its version, or in the single column in both versions. */
function tableKeyOf(host: HTMLElement, line: HTMLElement): string {
  const table = line.getAttribute(TABLE_ATTRIBUTE) ?? '';

  if (host.classList.contains(INLINE_LAYOUT_CLASS)) {
    return table;
  }

  const version = line.matches(OLD_CONTENT_SELECTOR) ? OLD_CONTENT_SELECTOR : NEW_CONTENT_SELECTOR;

  return version + table;
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
