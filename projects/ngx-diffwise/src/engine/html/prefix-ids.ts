const ALL_ELEMENTS = '*';
const ID_ATTRIBUTE = 'id';
const NAME_ATTRIBUTE = 'name';
const FRAGMENT_START = '#';
const ID_LIST_SEPARATOR = ' ';
const WHITESPACE = /\s+/;
const URL_FUNCTION_START = 'url(';

/** `url(#` in an SVG attribute; the quote it may use is kept in the first group. */
const URL_FRAGMENT_START = /url\(\s*(['"]?)#/g;

/** Elements whose `name` is a link target: `a` for `#name` links, `map` for `usemap`. */
const NAMED_TARGET_TAGS: ReadonlySet<string> = new Set(['a', 'map']);

/** Attributes that hold one id or several ids separated by spaces. */
const ID_REFERENCE_ATTRIBUTES: ReadonlySet<string> = new Set([
  'aria-activedescendant',
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
  'aria-labelledby',
  'aria-owns',
  'for',
  'form',
  'headers',
  'list',
]);

/** Attributes that hold a link; a `#…` link points to an id or an anchor name. */
const LINK_ATTRIBUTES: ReadonlySet<string> = new Set(['href', 'usemap', 'xlink:href']);

/** SVG attributes that can point to an id with `url(#…)`. */
const URL_REFERENCE_ATTRIBUTES: ReadonlySet<string> = new Set([
  'clip-path',
  'fill',
  'filter',
  'marker-end',
  'marker-mid',
  'marker-start',
  'mask',
  'stroke',
]);

/**
 * Puts the prefix before every id and anchor name in the tree and before every reference to them,
 * so the same ids in both versions, or in several diffs on one page, do not collide.
 */
export function prefixIds(root: ParentNode, prefix: string): void {
  for (const element of root.querySelectorAll(ALL_ELEMENTS)) {
    for (const attribute of Array.from(element.attributes)) {
      const value = prefixedValue(element, attribute, prefix);

      if (value !== attribute.value) {
        attribute.value = value;
      }
    }
  }
}

/** The value of an attribute with the prefix before each id it holds or links to. */
function prefixedValue(element: Element, { name, value }: Attr, prefix: string): string {
  if (holdsIds(element, name)) {
    return prefixIdList(value, prefix);
  }

  if (LINK_ATTRIBUTES.has(name)) {
    return prefixFragmentLink(value, prefix);
  }

  if (URL_REFERENCE_ATTRIBUTES.has(name)) {
    return value.replace(URL_FRAGMENT_START, (_, quote: string) => urlFragmentStart(quote, prefix));
  }

  return value;
}

/** True for an id, an anchor name or an attribute that refers to ids. */
function holdsIds(element: Element, attributeName: string): boolean {
  const isAnchorName = attributeName === NAME_ATTRIBUTE && NAMED_TARGET_TAGS.has(element.localName);

  return (
    attributeName === ID_ATTRIBUTE || isAnchorName || ID_REFERENCE_ATTRIBUTES.has(attributeName)
  );
}

/** The start of a `url()` that links to a prefixed id in the page. */
function urlFragmentStart(quote: string, prefix: string): string {
  return URL_FUNCTION_START + quote + FRAGMENT_START + prefix;
}

/** Prefixes each id in a list separated by spaces; an empty value stays empty. */
function prefixIdList(value: string, prefix: string): string {
  const ids = value.split(WHITESPACE).filter((id) => id.length > 0);
  return ids.map((id) => prefix + id).join(ID_LIST_SEPARATOR);
}

/** Prefixes a link to a part of the same document, such as `#note-1`; other links stay. */
function prefixFragmentLink(link: string, prefix: string): string {
  const pointsIntoDocument = link.startsWith(FRAGMENT_START) && link.length > FRAGMENT_START.length;

  if (!pointsIntoDocument) {
    return link;
  }

  return FRAGMENT_START + prefix + link.slice(FRAGMENT_START.length);
}
