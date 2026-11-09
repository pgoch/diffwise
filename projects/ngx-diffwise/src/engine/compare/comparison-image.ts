import { comparisonText } from './comparison-text';
import { IMAGE_CHARACTER } from '../html/reader-text';
import type { DiffOptions, ImageProperties, LineImage } from '../model';

/** Key of an image among words: its character and its address, so only the same file is equal. */
export function imageWordKey(image: LineImage): string {
  return JSON.stringify([IMAGE_CHARACTER, image.properties.source]);
}

/** An image in the form it is compared in: its alternative text as the options compare text. */
export function comparisonImage(
  properties: ImageProperties,
  options: DiffOptions,
): ImageProperties {
  const { altText } = properties;

  if (altText === null) {
    return properties;
  }

  return { ...properties, altText: comparisonText(altText, options) };
}
