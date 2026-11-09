import { inlineStyle, styleValue } from './inline-style';
import type { ImageProperties, LineImage } from '../model';
import type { TextPiece } from './reader-text';

/** Attributes read from an image besides its size. */
const Attribute = {
  Alt: 'alt',
  Src: 'src',
} as const;

/** Sides of an image's size; each is both an attribute and a style property. */
const Dimension = {
  Width: 'width',
  Height: 'height',
} as const;

type Dimension = (typeof Dimension)[keyof typeof Dimension];

/** The size of the image file; a style with it sets no size of its own. */
const AUTO_SIZE = 'auto';

/** A size attribute, such as `480` or `50%`; browsers ignore what follows the number. */
const SIZE_ATTRIBUTE_VALUE = /^\s*(\d+(?:\.\d+)?)(%?)/;
const PIXEL_UNIT = 'px';

const WHITESPACE_RUN = /\s+/g;
const SPACE = ' ';

/** Images among the pieces of a line's text, with their places in it. */
export function lineImages(pieces: readonly TextPiece[]): LineImage[] {
  const images: LineImage[] = [];

  for (const { start, node } of pieces) {
    if (node instanceof Element) {
      images.push({ position: start, properties: imageProperties(node) });
    }
  }

  return images;
}

/** What a reader sees of an image: its file, its size and its alternative text. */
export function imageProperties(image: Element): ImageProperties {
  const style = inlineStyle(image);

  return {
    source: sourceOf(image),
    width: sizeOf(image, style, Dimension.Width),
    height: sizeOf(image, style, Dimension.Height),
    altText: altTextOf(image),
  };
}

/** Address of the image file, as its `src` gives it; `null` without one. */
function sourceOf(image: Element): string | null {
  const source = image.getAttribute(Attribute.Src)?.trim();
  const hasSource = source !== undefined && source.length > 0;

  return hasSource ? source : null;
}

/**
 * One side of the image's size as CSS writes it, such as `480px`. A `style` sets it over the
 * attribute, as in CSS, and `auto` leaves the size of the file.
 */
function sizeOf(
  image: Element,
  style: CSSStyleDeclaration | null,
  dimension: Dimension,
): string | null {
  const styleSize = styleValue(style, dimension);

  if (styleSize === null) {
    return attributeSize(image.getAttribute(dimension));
  }

  return styleSize === AUTO_SIZE ? null : styleSize;
}

/** A size attribute as CSS writes it: `480` as `480px`, `50%` as it is; `null` for other text. */
function attributeSize(value: string | null): string | null {
  const match = value === null ? null : SIZE_ATTRIBUTE_VALUE.exec(value);

  if (match === null) {
    return null;
  }

  const [, number, percentSign] = match;
  const unit = percentSign.length > 0 ? percentSign : PIXEL_UNIT;

  return `${Number(number)}${unit}`;
}

/** Alternative text with single spaces, as a screen reader reads it; `null` without `alt`. */
function altTextOf(image: Element): string | null {
  const altText = image.getAttribute(Attribute.Alt);

  if (altText === null) {
    return null;
  }

  return altText.replace(WHITESPACE_RUN, SPACE).trim();
}
