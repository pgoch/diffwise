const STYLE_ATTRIBUTE = 'style';

/** Values that leave a property to the parent or to its default. */
const CSS_WIDE_KEYWORDS: ReadonlySet<string> = new Set([
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'unset',
]);

/** The element's `style` attribute; `null` without one. */
export function inlineStyle(element: Element): CSSStyleDeclaration | null {
  if (!element.hasAttribute(STYLE_ATTRIBUTE)) {
    return null;
  }

  return (element as Partial<ElementCSSInlineStyle>).style ?? null;
}

/** A property of a style; `null` when it does not set it or leaves it to the parent. */
export function styleValue(style: CSSStyleDeclaration | null, property: string): string | null {
  if (style === null) {
    return null;
  }

  const value = style.getPropertyValue(property);
  const isSet = value.length > 0 && !CSS_WIDE_KEYWORDS.has(value);

  return isSet ? value : null;
}
