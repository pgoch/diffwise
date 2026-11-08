import type { DiffOptions } from './model';

const ALL_WHITESPACE = /\s+/g;
const NO_TEXT = '';

/** Text in the form it is compared in: without whitespace or in lower case, if the options say so. */
export function comparisonText(text: string, options: DiffOptions): string {
  let comparedText = text;

  if (options.ignoreWhitespace) {
    comparedText = comparedText.replace(ALL_WHITESPACE, NO_TEXT);
  }

  if (options.ignoreCase) {
    comparedText = comparedText.toLowerCase();
  }

  return comparedText;
}
