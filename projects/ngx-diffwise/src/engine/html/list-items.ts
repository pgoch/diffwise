import {
  BULLETED_LIST_TAG,
  LIST_ITEM_TAG,
  MARKER_LIST_TAGS,
  NUMBERED_LIST_TAG,
  VISIBLE_WITHOUT_TEXT_TAGS,
} from './html-tags';
import { inlineStyle, styleValue } from './inline-style';
import { CheckboxState, type ListMarker, ListStyle, ListType } from '../model';

const START_ATTRIBUTE = 'start';
const VALUE_ATTRIBUTE = 'value';
const REVERSED_ATTRIBUTE = 'reversed';
const TYPE_ATTRIBUTE = 'type';
const CHECKED_ATTRIBUTE = 'checked';
const LIST_STYLE_TYPE_PROPERTY = 'list-style-type';
const INPUT_TAG = 'input';
const CHECKBOX_TYPE = 'checkbox';
const FIRST_NUMBER = 1;
const DECIMAL_RADIX = 10;
const NEXT_NUMBER_STEP = 1;
const REVERSED_NUMBER_STEP = -1;
const SELECTOR_SEPARATOR = ',';
const NOT_WHITESPACE = /\S/;

/** Starts a marker given as text, such as `"→ "`. */
const QUOTE_START = /^["']/;

/** Any list with markers, such as `ol` or `ul`. */
const MARKER_LIST_SELECTOR = [...MARKER_LIST_TAGS].join(SELECTOR_SEPARATOR);

/** Styles with two names, and the name Diffwise uses for both. */
const STYLE_ALIASES: ReadonlyMap<string, string> = new Map([
  ['lower-latin', ListStyle.LowerAlpha],
  ['upper-latin', ListStyle.UpperAlpha],
]);

/** Styles that show bullets; the others show numbers, letters or other counters. */
const BULLET_STYLES: ReadonlySet<string> = new Set([
  ListStyle.Disc,
  ListStyle.Circle,
  ListStyle.Square,
  'disclosure-open',
  'disclosure-closed',
]);

/** Values of `type` on `ol` and `li`, with their case, and the styles they give. */
const NUMBERING_TYPES: ReadonlyMap<string, string> = new Map([
  ['1', ListStyle.Decimal],
  ['a', ListStyle.LowerAlpha],
  ['A', ListStyle.UpperAlpha],
  ['i', ListStyle.LowerRoman],
  ['I', ListStyle.UpperRoman],
]);

/** Values of `type` on `ul` and `li`, in any case; each gives the style of its name. */
const BULLET_TYPES: ReadonlySet<string> = new Set([
  ListStyle.None,
  ListStyle.Disc,
  ListStyle.Circle,
  ListStyle.Square,
]);

/** Bullets of a bulleted list by the number of lists around it, as browsers show them. */
const NESTED_LIST_BULLETS: readonly string[] = [ListStyle.Disc, ListStyle.Circle, ListStyle.Square];

/**
 * Markers of list items as a browser shows them: numbers from `start`, `value` and `reversed`, and
 * styles. Counts the items of each list once, when one of them is asked for first.
 */
export class ListMarkerReader {
  private readonly numbers = new Map<Element, number>();

  /** Number of a list item; a bulleted list counts its items too, though it shows bullets. */
  numberOf(item: Element): number {
    const list = listOf(item);

    if (list !== null && !this.numbers.has(item)) {
      this.countItems(list);
    }

    return this.numbers.get(item) ?? FIRST_NUMBER;
  }

  /** The marker of a list item; `null` for an item whose style shows none. */
  markerOf(item: Element): ListMarker | null {
    const style = listStyleOf(item);

    if (style === ListStyle.None) {
      return null;
    }

    return {
      listType: listTypeOf(style),
      style,
      number: this.numberOf(item),
      level: markerListsAround(item),
    };
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

/** The checkbox a list item starts with, as in a task list, also inside a label; `null` without. */
export function startCheckbox(item: Element): Element | null {
  const content = firstContentOf(item);
  const isCheckboxElement = content instanceof Element && isCheckbox(content);

  return isCheckboxElement ? content : null;
}

/** State of the checkbox a list item starts with; `null` without one. */
export function startCheckboxState(item: Element): CheckboxState | null {
  const checkbox = startCheckbox(item);

  if (checkbox === null) {
    return null;
  }

  return checkbox.hasAttribute(CHECKED_ATTRIBUTE) ? CheckboxState.Checked : CheckboxState.Unchecked;
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

/** True when the element is an item of a list. */
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

/** Lists with markers around the element. */
function markerListsAround(element: Element): number {
  let lists = 0;

  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
    if (MARKER_LIST_TAGS.has(parent.localName)) {
      lists++;
    }
  }

  return lists;
}

/**
 * `list-style-type` of an item as CSS inherits it: set by the item, by its `type`, or by the elements
 * around it, up to its list, which always sets one.
 */
function listStyleOf(item: Element): string {
  for (let element: Element | null = item; element !== null; element = element.parentElement) {
    const style = ownListStyle(element);

    if (style !== null) {
      return style;
    }
  }

  return ListStyle.Disc;
}

/** The style an element sets: by its `style`, by its `type`, or as a list; `null` without one. */
function ownListStyle(element: Element): string | null {
  const styleProperty = styleValue(inlineStyle(element), LIST_STYLE_TYPE_PROPERTY);

  if (styleProperty !== null) {
    return namedStyle(styleProperty);
  }

  return typeStyle(element) ?? defaultListStyle(element);
}

/** A style by the name Diffwise uses for it; a marker given as text stays as it is. */
function namedStyle(style: string): string {
  if (QUOTE_START.test(style)) {
    return style;
  }

  const lowerCaseStyle = style.toLowerCase();

  return STYLE_ALIASES.get(lowerCaseStyle) ?? lowerCaseStyle;
}

/** The style that the `type` of a list or an item gives, as browsers read it; `null` for none. */
function typeStyle(element: Element): string | null {
  const type = element.getAttribute(TYPE_ATTRIBUTE);
  const tag = element.localName;

  if (type === null) {
    return null;
  }

  const numbering = NUMBERING_TYPES.get(type);
  const takesNumbering = tag === NUMBERED_LIST_TAG || tag === LIST_ITEM_TAG;

  if (numbering !== undefined && takesNumbering) {
    return numbering;
  }

  const bullets = type.toLowerCase();
  const takesBullets = tag === BULLETED_LIST_TAG || tag === LIST_ITEM_TAG;
  const showsBullets = BULLET_TYPES.has(bullets) && takesBullets;

  return showsBullets ? bullets : null;
}

/** The style browsers give a list: numbers, or bullets by the lists around it; `null` for others. */
function defaultListStyle(element: Element): string | null {
  const tag = element.localName;

  if (tag === NUMBERED_LIST_TAG) {
    return ListStyle.Decimal;
  }

  if (!MARKER_LIST_TAGS.has(tag)) {
    return null;
  }

  const nesting = Math.min(markerListsAround(element), NESTED_LIST_BULLETS.length - 1);

  return NESTED_LIST_BULLETS[nesting];
}

/** Bullets for bullet styles and markers given as text, numbers for the other styles. */
function listTypeOf(style: string): ListType {
  const showsBullets = BULLET_STYLES.has(style) || QUOTE_START.test(style);
  return showsBullets ? ListType.Bulleted : ListType.Numbered;
}

/** The first text or element a reader sees in the parent, such as a word, an image or an item. */
function firstContentOf(parent: Node): Text | Element | null {
  for (const child of parent.childNodes) {
    const content = contentAt(child);

    if (content !== null) {
      return content;
    }
  }

  return null;
}

/** The node itself when a reader sees it whole, or else the first content inside it. */
function contentAt(node: Node): Text | Element | null {
  if (node instanceof Text) {
    return NOT_WHITESPACE.test(node.data) ? node : null;
  }

  if (!(node instanceof Element)) {
    return null;
  }

  return VISIBLE_WITHOUT_TEXT_TAGS.has(node.localName) ? node : firstContentOf(node);
}

/** True when the element is a checkbox. */
function isCheckbox(element: Element): boolean {
  const type = element.getAttribute(TYPE_ATTRIBUTE)?.toLowerCase();
  return element.localName === INPUT_TAG && type === CHECKBOX_TYPE;
}
