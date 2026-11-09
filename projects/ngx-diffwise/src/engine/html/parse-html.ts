import { DIFFWISE_DATA_ATTRIBUTE_START } from '../model';
import { sanitizeHtml } from './sanitize-html';

const HIDDEN_SELECTOR = '[hidden]';
const ALL_ELEMENTS = '*';
const HTML_MIME_TYPE: DOMParserSupportedType = 'text/html';

/**
 * Parses HTML into a sanitized element tree without comments and hidden elements. DOMParser
 * builds an inert document, so no scripts run and no images load.
 */
export function parseHtml(html: string): HTMLElement {
  const { body } = new DOMParser().parseFromString(sanitizeHtml(html), HTML_MIME_TYPE);

  for (const element of body.querySelectorAll(HIDDEN_SELECTOR)) {
    element.remove();
  }

  for (const element of body.querySelectorAll(ALL_ELEMENTS)) {
    removeDiffwiseAttributes(element);
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
