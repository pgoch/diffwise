import DOMPurify, { type Config, type DOMPurify as Purifier } from 'dompurify';

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
  return purifier.sanitize(html);
}

/**
 * Creates a separate DOMPurify instance, so `makeInert` does not affect the app's DOMPurify.
 * Throws without a browser DOM, where DOMPurify returns HTML unsanitized.
 */
function createPurifier(): Purifier {
  const instance = DOMPurify();

  if (!instance.isSupported) {
    throw new Error(NO_DOM_ERROR);
  }

  instance.setConfig(PURIFY_CONFIG);
  instance.addHook(AFTER_SANITIZE_ATTRIBUTES_HOOK, makeInert);

  return instance;
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
