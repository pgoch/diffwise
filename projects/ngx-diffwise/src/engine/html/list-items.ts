import { LIST_ITEM_TAG, MARKER_LIST_TAGS, NUMBERED_LIST_TAG } from './html-tags';

const START_ATTRIBUTE = 'start';
const VALUE_ATTRIBUTE = 'value';
const REVERSED_ATTRIBUTE = 'reversed';
const FIRST_NUMBER = 1;
const DECIMAL_RADIX = 10;
const NEXT_NUMBER_STEP = 1;
const REVERSED_NUMBER_STEP = -1;
const SELECTOR_SEPARATOR = ',';

/** Any list with markers, such as `ol` or `ul`. */
const MARKER_LIST_SELECTOR = [...MARKER_LIST_TAGS].join(SELECTOR_SEPARATOR);

/**
 * Numbers of list items as a browser counts them, from `start`, `value` and `reversed`. Counts
 * the items of each list once, when one of them is asked for first.
 */
export class ListItemNumbers {
  private readonly numbers = new Map<Element, number>();

  /** Number of a list item; a bulleted list counts its items too, though it shows bullets. */
  numberOf(item: Element): number {
    const list = listOf(item);

    if (list !== null && !this.numbers.has(item)) {
      this.countItems(list);
    }

    return this.numbers.get(item) ?? FIRST_NUMBER;
  }

  /** Numbers each item of the list; a `value` sets the item's number, and the next ones go on. */
  private countItems(list: Element): void {
    const items = itemsOf(list);
    const step = isReversed(list) ? REVERSED_NUMBER_STEP : NEXT_NUMBER_STEP;
    let itemNumber = firstNumberOf(list, items.length);

    for (const item of items) {
      itemNumber = integerAttribute(item, VALUE_ATTRIBUTE) ?? itemNumber;
      this.numbers.set(item, itemNumber);
      itemNumber += step;
    }
  }
}

/** The list that counts the item: the nearest list with markers around it, or else its parent. */
function listOf(item: Element): Element | null {
  const parent = item.parentElement;
  return parent?.closest(MARKER_LIST_SELECTOR) ?? parent;
}

/**
 * Items the list counts, in reading order: its `li` elements outside nested lists. Outside any
 * list, an element counts only its `li` children.
 */
function itemsOf(list: Element): Element[] {
  if (!MARKER_LIST_TAGS.has(list.localName)) {
    return Array.from(list.children).filter(isListItem);
  }

  const items: Element[] = [];

  collectItems(list, items);

  return items;
}

/** Adds the `li` elements inside the parent to the items, without entering nested lists. */
function collectItems(parent: Element, items: Element[]): void {
  for (const child of parent.children) {
    if (isListItem(child)) {
      items.push(child);
    }

    if (!MARKER_LIST_TAGS.has(child.localName)) {
      collectItems(child, items);
    }
  }
}

function isListItem(element: Element): boolean {
  return element.localName === LIST_ITEM_TAG;
}

/** True for a numbered list that counts down. */
function isReversed(list: Element): boolean {
  return list.localName === NUMBERED_LIST_TAG && list.hasAttribute(REVERSED_ATTRIBUTE);
}

/**
 * Number of the first item: `start` of a numbered list, or else 1, or the number of items when the
 * list counts down.
 */
function firstNumberOf(list: Element, itemCount: number): number {
  if (list.localName !== NUMBERED_LIST_TAG) {
    return FIRST_NUMBER;
  }

  const start = integerAttribute(list, START_ATTRIBUTE);

  if (start !== null) {
    return start;
  }

  return isReversed(list) ? itemCount : FIRST_NUMBER;
}

/** The integer an attribute starts with, as HTML reads `start` and `value`; `null` without one. */
function integerAttribute(element: Element, name: string): number | null {
  const value = element.getAttribute(name);

  if (value === null) {
    return null;
  }

  const integer = Number.parseInt(value, DECIMAL_RADIX);

  return Number.isNaN(integer) ? null : integer;
}
