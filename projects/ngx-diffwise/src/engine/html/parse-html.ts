import { DIFFWISE_DATA_ATTRIBUTE_START } from '../model';
import { sanitizeHtml } from './sanitize-html';

const HIDDEN_SELECTOR = '[hidden]';
const ALL_ELEMENTS = '*';
const HTML_MIME_TYPE: DOMParserSupportedType = 'text/html';

/**
 * The attribute of a customized built-in element. Sanitizing HTML leaves it empty, but sanitizing
 * a tree, as the lines that the diff marks get sanitized again, removes the element with its
 * content. The element keeps the value of the attribute even when the attribute is removed, and
 * the browser writes it back into the HTML of the element, so a plain element takes its place.
 */
const CUSTOMIZED_ELEMENT_ATTRIBUTE = 'is';

/**
 * Parses HTML into a sanitized element tree without comments and hidden elements, with plain
 * elements in place of customized built-in ones. DOMParser builds an inert document, so no scripts
 * run and no images load.
 */
export function parseHtml(html: string): HTMLElement {
  const { body } = new DOMParser().parseFromString(sanitizeHtml(html), HTML_MIME_TYPE);

  for (const element of body.querySelectorAll(HIDDEN_SELECTOR)) {
    element.remove();
  }

  for (const element of body.querySelectorAll(ALL_ELEMENTS)) {
    removeDiffwiseAttributes(element);

    if (element.hasAttribute(CUSTOMIZED_ELEMENT_ATTRIBUTE)) {
      replaceWithPlainElement(element);
    }
  }

  return body;
}

/** Removes `data-diffwise-…` attributes, so the content cannot pose as details of a change. */
function removeDiffwiseAttributes(element: Element): void {
  for (const name of element.getAttributeNames()) {
    if (name.startsWith(DIFFWISE_DATA_ATTRIBUTE_START)) {
      element.removeAttribute(name);
    }
  }
}

/**
 * Puts a new element of the same name in place of a customized built-in element, with its other
 * attributes and its content.
 */
function replaceWithPlainElement(element: Element): void {
  const plainElement = element.ownerDocument.createElementNS(
    element.namespaceURI,
    element.localName,
  );

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name !== CUSTOMIZED_ELEMENT_ATTRIBUTE) {
      element.removeAttributeNode(attribute);
      plainElement.setAttributeNode(attribute);
    }
  }

  while (element.firstChild) {
    plainElement.append(element.firstChild);
  }

  element.replaceWith(plainElement);
}
