import { ALIGN_ATTRIBUTE_TAGS, BLOCK_TAGS, HEADING_TAGS, STYLE_TAGS } from './html-tags';
import { FormattingValue, type FormattingValues, type TextFormat, TextStyle } from '../model';

const LINK_TAG = 'a';
const FONT_TAG = 'font';
const CENTER_TAG = 'center';
const PROBE_TAG = 'span';
const CENTER_ALIGNMENT = 'center';

/** Starts the tag of a heading, before its level, as in `h2`. */
const HEADING_TAG_START = 'h';

/** Attributes read as formatting. */
const Attribute = {
  Align: 'align',
  Color: 'color',
  Face: 'face',
  Href: 'href',
  Size: 'size',
  Style: 'style',
} as const;

/** Properties of the `style` attribute read as formatting. */
const StyleProperty = {
  BackgroundColor: 'background-color',
  Color: 'color',
  FontFamily: 'font-family',
  FontSize: 'font-size',
  FontStyle: 'font-style',
  FontWeight: 'font-weight',
  TextAlign: 'text-align',
  TextDecoration: 'text-decoration',
  TextDecorationLine: 'text-decoration-line',
  TextTransform: 'text-transform',
  VerticalAlign: 'vertical-align',
} as const;

/** Values that leave a property to the parent or to its default. */
const CSS_WIDE_KEYWORDS: ReadonlySet<string> = new Set([
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'unset',
]);

const BOLD_WEIGHTS: ReadonlySet<string> = new Set(['bold', 'bolder']);
const MIN_BOLD_WEIGHT = 600;
const NORMAL_FONT_STYLE = 'normal';

/** Background colors that let the background behind them show. */
const TRANSPARENT_COLORS: ReadonlySet<string> = new Set(['transparent', 'rgba(0, 0, 0, 0)']);

/** Values of `text-transform` and the styles they give; other values give none. */
const LETTER_CASE_STYLES: ReadonlyMap<string, TextStyle> = new Map([
  ['uppercase', TextStyle.Uppercase],
  ['lowercase', TextStyle.Lowercase],
  ['capitalize', TextStyle.Capitalized],
]);

/** Lines of `text-decoration` and the styles they give. */
const DECORATION_STYLES: ReadonlyMap<string, TextStyle> = new Map([
  ['underline', TextStyle.Underline],
  ['line-through', TextStyle.Strikethrough],
]);

/** Values of `vertical-align` and the styles they give. */
const VERTICAL_ALIGN_STYLES: ReadonlyMap<string, TextStyle> = new Map([
  ['super', TextStyle.Superscript],
  ['sub', TextStyle.Subscript],
]);

/** Style properties read as formatting values. */
const STYLE_VALUES: ReadonlyMap<string, FormattingValue> = new Map([
  [StyleProperty.Color, FormattingValue.TextColor],
  [StyleProperty.BackgroundColor, FormattingValue.BackgroundColor],
  [StyleProperty.FontFamily, FormattingValue.FontFamily],
  [StyleProperty.FontSize, FormattingValue.FontSize],
]);

/** `<font>` attributes and the style properties they stand for. */
const FONT_ATTRIBUTE_PROPERTIES: ReadonlyMap<string, string> = new Map([
  [Attribute.Color, StyleProperty.Color],
  [Attribute.Face, StyleProperty.FontFamily],
  [Attribute.Size, StyleProperty.FontSize],
]);

/** Sizes of `<font size>` as CSS sizes, the way browsers show them. */
const FONT_SIZES: ReadonlyMap<string, string> = new Map([
  ['1', 'x-small'],
  ['2', 'small'],
  ['3', 'medium'],
  ['4', 'large'],
  ['5', 'x-large'],
  ['6', 'xx-large'],
  ['7', 'xxx-large'],
]);

const WHITESPACE = /\s+/;
const TEXT_STYLES = Object.values(TextStyle);
const FORMATTING_VALUES = Object.values(FormattingValue);

/** Format of text without formatting, outside links. */
export const PLAIN_FORMAT: TextFormat = {
  styles: [],
  values: {
    headingLevel: null,
    textColor: null,
    backgroundColor: null,
    fontFamily: null,
    fontSize: null,
    textAlignment: null,
  },
  link: null,
};

/** An element outside the document that writes values of `<font>` the way CSS writes them. */
let probe: HTMLElement | undefined;

/**
 * Reads the format of text nodes from the elements around them, up to the document's root.
 * Remembers the format of each element, so it reads every element once.
 */
export class TextFormatReader {
  private readonly elementFormats = new Map<Element, TextFormat>();

  /** Format of a text node: formatting and link of the elements around it. */
  formatOf(node: Text): TextFormat {
    return this.formatInside(node.parentElement);
  }

  /** Format of text inside an element: the parent's format with the element's own on top. */
  private formatInside(element: Element | null): TextFormat {
    if (element === null) {
      return PLAIN_FORMAT;
    }

    let format = this.elementFormats.get(element);

    if (format === undefined) {
      format = withOwnFormat(element, this.formatInside(element.parentElement));
      this.elementFormats.set(element, format);
    }

    return format;
  }
}

/** The parent's format with what the element sets on top; the parent's when it sets nothing. */
function withOwnFormat(element: Element, parentFormat: TextFormat): TextFormat {
  const style = inlineStyle(element);
  const format: TextFormat = {
    styles: stylesInside(element, style, parentFormat.styles),
    values: valuesInside(element, style, parentFormat.values),
    link: linkOf(element) ?? parentFormat.link,
  };

  return sameFormat(format, parentFormat) ? parentFormat : format;
}

/** The element's `style` attribute; `null` without one. */
function inlineStyle(element: Element): CSSStyleDeclaration | null {
  if (!element.hasAttribute(Attribute.Style)) {
    return null;
  }

  return (element as Partial<ElementCSSInlineStyle>).style ?? null;
}

/** Styles of text inside the element: the style of its tag, then its `style`, over the parent's. */
function stylesInside(
  element: Element,
  style: CSSStyleDeclaration | null,
  parentStyles: readonly TextStyle[],
): TextStyle[] {
  const styles = new Set(parentStyles);
  const tagStyle = STYLE_TAGS.get(element.localName);

  if (tagStyle !== undefined) {
    styles.add(tagStyle);
  }

  if (style !== null) {
    applyInlineStyle(styles, style);
  }

  return TEXT_STYLES.filter((textStyle) => styles.has(textStyle));
}

/**
 * Applies a `style` attribute. Its weight, slant and letter case replace those of the tag and the
 * parent; its lines and raised or lowered text add to them, as in CSS.
 */
function applyInlineStyle(styles: Set<TextStyle>, style: CSSStyleDeclaration): void {
  const weight = styleValue(style, StyleProperty.FontWeight);
  const slant = styleValue(style, StyleProperty.FontStyle);
  const letterCase = styleValue(style, StyleProperty.TextTransform);

  if (weight !== null) {
    switchStyle(styles, TextStyle.Bold, isBoldWeight(weight));
  }

  if (slant !== null) {
    switchStyle(styles, TextStyle.Italic, slant !== NORMAL_FONT_STYLE);
  }

  if (letterCase !== null) {
    replaceLetterCase(styles, letterCase);
  }

  addStyles(styles, styleValue(style, StyleProperty.TextDecorationLine), DECORATION_STYLES);
  addStyles(styles, styleValue(style, StyleProperty.TextDecoration), DECORATION_STYLES);
  addStyles(styles, styleValue(style, StyleProperty.VerticalAlign), VERTICAL_ALIGN_STYLES);
}

function switchStyle(styles: Set<TextStyle>, textStyle: TextStyle, isOn: boolean): void {
  if (isOn) {
    styles.add(textStyle);
  } else {
    styles.delete(textStyle);
  }
}

/** True for `bold`, `bolder` and weights from 600 up, which browsers draw bold. */
function isBoldWeight(weight: string): boolean {
  return BOLD_WEIGHTS.has(weight) || Number(weight) >= MIN_BOLD_WEIGHT;
}

/** Replaces the letter case with the one a `text-transform` value gives, or with none. */
function replaceLetterCase(styles: Set<TextStyle>, textTransform: string): void {
  for (const letterCase of LETTER_CASE_STYLES.values()) {
    styles.delete(letterCase);
  }

  addStyles(styles, textTransform, LETTER_CASE_STYLES);
}

/** Adds the styles the words of a value give, such as `underline` in `underline dotted`. */
function addStyles(
  styles: Set<TextStyle>,
  value: string | null,
  wordStyles: ReadonlyMap<string, TextStyle>,
): void {
  if (value === null) {
    return;
  }

  for (const word of value.split(WHITESPACE)) {
    const wordStyle = wordStyles.get(word);

    if (wordStyle !== undefined) {
      styles.add(wordStyle);
    }
  }
}

/** Values for text inside the element: the parent's, with the values the element sets on top. */
function valuesInside(
  element: Element,
  style: CSSStyleDeclaration | null,
  parentValues: FormattingValues,
): FormattingValues {
  const values: Record<FormattingValue, string | null> = { ...parentValues };
  const tag = element.localName;

  if (HEADING_TAGS.has(tag)) {
    values.headingLevel = tag.slice(HEADING_TAG_START.length);
  }

  if (tag === FONT_TAG) {
    setStyleValues(values, fontAttributesAsStyle(element));
  }

  setStyleValues(values, style);

  if (BLOCK_TAGS.has(tag)) {
    values.textAlignment = blockAlignment(element, style) ?? values.textAlignment;
  }

  return values;
}

/** Sets the values that a style gives, such as the text color. */
function setStyleValues(
  values: Record<FormattingValue, string | null>,
  style: CSSStyleDeclaration | null,
): void {
  for (const [property, name] of STYLE_VALUES) {
    const value = styleValue(style, property);
    const showsParentBackground =
      name === FormattingValue.BackgroundColor && value !== null && TRANSPARENT_COLORS.has(value);

    if (value !== null && !showsParentBackground) {
      values[name] = value;
    }
  }
}

/** Reads `<font color face size>` as the style properties they stand for. */
function fontAttributesAsStyle(font: Element): CSSStyleDeclaration {
  probe ??= document.createElement(PROBE_TAG);
  probe.removeAttribute(Attribute.Style);

  for (const [attribute, property] of FONT_ATTRIBUTE_PROPERTIES) {
    const value = fontAttributeValue(font, attribute);

    if (value !== null) {
      probe.style.setProperty(property, value);
    }
  }

  return probe.style;
}

/** A `<font>` attribute as a CSS value; a size from 1 to 7 becomes a size keyword. */
function fontAttributeValue(font: Element, attribute: string): string | null {
  const value = font.getAttribute(attribute);

  if (value === null || attribute !== Attribute.Size) {
    return value;
  }

  return FONT_SIZES.get(value.trim()) ?? null;
}

/** Alignment a block gives its text: from `style`, `align` or `<center>`; `null` when none. */
function blockAlignment(block: Element, style: CSSStyleDeclaration | null): string | null {
  const styleAlignment = styleValue(style, StyleProperty.TextAlign);

  if (styleAlignment !== null) {
    return styleAlignment;
  }

  if (block.localName === CENTER_TAG) {
    return CENTER_ALIGNMENT;
  }

  if (!ALIGN_ATTRIBUTE_TAGS.has(block.localName)) {
    return null;
  }

  const alignment = block.getAttribute(Attribute.Align)?.trim().toLowerCase();
  const setsAlignment = alignment !== undefined && alignment.length > 0;

  return setsAlignment ? alignment : null;
}

/** A property of a style; `null` when it does not set it or leaves it to the parent. */
function styleValue(style: CSSStyleDeclaration | null, property: string): string | null {
  if (style === null) {
    return null;
  }

  const value = style.getPropertyValue(property);
  const isSet = value.length > 0 && !CSS_WIDE_KEYWORDS.has(value);

  return isSet ? value : null;
}

/** Address of a link, as its `href` gives it; `null` for other elements and anchors. */
function linkOf(element: Element): string | null {
  if (element.localName !== LINK_TAG) {
    return null;
  }

  return element.getAttribute(Attribute.Href)?.trim() ?? null;
}

/** True when both formats give text the same look and link. */
function sameFormat(first: TextFormat, second: TextFormat): boolean {
  const sameStyles =
    first.styles.length === second.styles.length
    && first.styles.every((style, index) => style === second.styles[index]);
  const sameValues = FORMATTING_VALUES.every((name) => first.values[name] === second.values[name]);

  return sameStyles && sameValues && first.link === second.link;
}
