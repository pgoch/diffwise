import { sanitizeHtml } from './sanitize-html';

const HIDDEN_SELECTOR = '[hidden]';
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

  return body;
}
