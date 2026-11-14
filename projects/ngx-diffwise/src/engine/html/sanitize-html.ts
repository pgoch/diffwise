import DOMPurify, { type Config, type DOMPurify as Purifier } from 'dompurify';

import { DIFFWISE_DATA_ATTRIBUTE_START } from '../model';
import { FORM_CONTROL_TAGS } from './html-tags';

/** Attributes the sanitizer reads or changes. */
const Attribute = {
  Disabled: 'disabled',
  Rel: 'rel',
  Style: 'style',
  Target: 'target',
} as const;

/** The only link target kept. */
const NEW_TAB = '_blank';

/** Keeps a page opened in a new tab from controlling the app. */
const NEW_TAB_REL = 'noopener noreferrer';

/** DOMPurify hook that runs after the attributes of each element are cleaned. */
const AFTER_SANITIZE_ATTRIBUTES_HOOK = 'afterSanitizeAttributes';

const NO_DOM_ERROR = 'Diffwise needs a browser DOM to sanitize HTML.';

const PURIFY_CONFIG: Config = {
  /** Page-wide styles, invisible templates, forms that send data, dialogs over the app. */
  FORBID_TAGS: ['style', 'template', 'form', 'dialog'],
  /** They take focus from the app or open popovers over it. */
  FORBID_ATTR: ['tabindex', 'autofocus', 'popover', 'popovertarget', 'popovertargetaction'],
  /** Kept only for links to a new tab (see makeInert). */
  ADD_ATTR: [Attribute.Target],
};

/** The same settings, with the cleaned tree returned instead of its HTML. */
const TREE_PURIFY_CONFIG: Config & { RETURN_DOM: true } = { ...PURIFY_CONFIG, RETURN_DOM: true };

/**
 * Pieces of HTML that the sanitizer cleans together stand in the cells of one table, a piece in each
 * row. The HTML parser keeps formatting from crossing the edge of a cell, so an unclosed tag of one
 * piece cannot reach the next one. Each cell holds the position of its piece; the content cannot
 * pose as a cell of Diffwise, since reading a document removes its `data-diffwise-…` attributes.
 */
const PIECES_TABLE_TAG = 'table';
const PIECES_BODY_TAG = 'tbody';
const PIECE_ROW_TAG = 'tr';
const PIECE_CELL_TAG = 'td';
const PIECE_POSITION_ATTRIBUTE = `${DIFFWISE_DATA_ATTRIBUTE_START}sanitized-piece`;

/** Style properties that change only the look: no positioning, no background images. */
const SAFE_STYLE_PATTERNS = [
  'color',
  'background-color',
  'font-(?:family|size|stretch|style|weight|variant(?:-[a-z-]+)?)',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-(?:align|indent|transform|decoration(?:-(?:line|color|style|thickness))?)',
  'vertical-align',
  'white-space',
  'direction',
  'list-style-type',
  '(?:margin|padding)(?:-(?:top|right|bottom|left|(?:inline|block)(?:-(?:start|end))?))?',
  'border(?:-(?:top|right|bottom|left))?(?:-(?:width|style|color))?',
  'border-(?:collapse|spacing)',
  '(?:min-|max-)?(?:width|height)',
  'float',
  'clear',
  'table-layout',
  'caption-side',
];

const SAFE_STYLE_PROPERTY = new RegExp(`^(?:${SAFE_STYLE_PATTERNS.join('|')})$`);

/** Style values that load or run something. */
const UNSAFE_STYLE_VALUE = /url\(|expression\(/i;

let purifier: Purifier | undefined;

/** Removes everything that could run code or act outside the diff. */
export function sanitizeHtml(html: string): string {
  purifier ??= createPurifier();
  return purifier.sanitize(html, PURIFY_CONFIG);
}

/**
 * Removes everything that could run code or act outside the diff from each piece of HTML, such as
 * the lines of a diff. One run of the sanitizer cleans all pieces, each in a cell of one table,
 * which takes much less time than a run for each piece. When the cleaned cells do not hold the
 * pieces one to one, as when a piece closes its cell, each piece is cleaned alone.
 */
export function sanitizeHtmlPieces(pieces: readonly string[]): string[] {
  purifier ??= createPurifier();

  const table = tableOfPieces(pieces);
  const cleanedTree = purifier.sanitize(table, TREE_PURIFY_CONFIG);
  const cells = cellsOfPieces(cleanedTree, pieces.length);

  return cells?.map((cell) => cell.innerHTML) ?? pieces.map(sanitizeHtml);
}

/**
 * Creates a separate DOMPurify instance, so `makeInert` does not affect the app's DOMPurify. Each
 * call gives its settings. Throws without a browser DOM, where DOMPurify returns HTML unsanitized.
 */
function createPurifier(): Purifier {
  const instance = DOMPurify();

  if (!instance.isSupported) {
    throw new Error(NO_DOM_ERROR);
  }

  instance.addHook(AFTER_SANITIZE_ATTRIBUTES_HOOK, makeInert);

  return instance;
}

/** HTML of a table with a row for each piece, whose cell holds the piece and its position. */
function tableOfPieces(pieces: readonly string[]): string {
  const rows = pieces.map(
    (html, position) =>
      startTag(PIECE_ROW_TAG)
      + `<${PIECE_CELL_TAG} ${PIECE_POSITION_ATTRIBUTE}="${position}">`
      + html
      + endTag(PIECE_CELL_TAG)
      + endTag(PIECE_ROW_TAG),
  );

  return (
    startTag(PIECES_TABLE_TAG)
    + startTag(PIECES_BODY_TAG)
    + rows.join('')
    + endTag(PIECES_BODY_TAG)
    + endTag(PIECES_TABLE_TAG)
  );
}

function startTag(tag: string): string {
  return `<${tag}>`;
}

function endTag(tag: string): string {
  return `</${tag}>`;
}

/**
 * The cells of the cleaned table, one for each piece in its order; `null` when the tree holds
 * anything else, or the pieces another way.
 */
function cellsOfPieces(tree: Node, pieceCount: number): Element[] | null {
  const table = onlyChild(tree, PIECES_TABLE_TAG);
  const body = table === null ? null : onlyChild(table, PIECES_BODY_TAG);
  const rows = pieceCount === 0 ? [] : Array.from(body?.childNodes ?? []);

  if (rows.length !== pieceCount) {
    return null;
  }

  const cells = rows.map((row) => onlyChild(row, PIECE_CELL_TAG));
  const holdsPiecesInOrder = cells.every(
    (cell, position) => cell?.getAttribute(PIECE_POSITION_ATTRIBUTE) === String(position),
  );

  return holdsPiecesInOrder ? (cells as Element[]) : null;
}

/** The only child of a node, when it is an element with the tag; `null` otherwise. */
function onlyChild(node: Node, tag: string): Element | null {
  const [child, ...others] = Array.from(node.childNodes);
  const isOnlyElement = child instanceof Element && child.localName === tag && others.length === 0;

  return isOnlyElement ? child : null;
}

/** Disables what DOMPurify keeps but could still act on the app. */
function makeInert(element: Element): void {
  if (element.hasAttribute(Attribute.Style)) {
    keepSafeStyles(element);
  }

  if (FORM_CONTROL_TAGS.has(element.localName)) {
    element.toggleAttribute(Attribute.Disabled, true);
  }

  if (element.getAttribute(Attribute.Target) === NEW_TAB) {
    element.setAttribute(Attribute.Rel, NEW_TAB_REL);
  } else {
    element.removeAttribute(Attribute.Target);
  }
}

/** Keeps only safe style properties. Rewriting the attribute also drops unknown ones. */
function keepSafeStyles(element: Element): void {
  const style = (element as Partial<ElementCSSInlineStyle>).style;

  if (!style) {
    element.removeAttribute(Attribute.Style);
    return;
  }

  for (const property of Array.from(style)) {
    if (!isSafeStyle(property, style.getPropertyValue(property))) {
      style.removeProperty(property);
    }
  }

  if (style.length === 0) {
    element.removeAttribute(Attribute.Style);
  } else {
    element.setAttribute(Attribute.Style, style.cssText);
  }
}

function isSafeStyle(property: string, value: string): boolean {
  return SAFE_STYLE_PROPERTY.test(property) && !UNSAFE_STYLE_VALUE.test(value);
}
