import { type ListMarker, ListStyle } from '../model';

/** Follows a number, a letter or a Roman numeral, as in `5.`. */
const COUNTER_SUFFIX = '.';
const LEADING_ZERO = '0';
const MINUS_SIGN = '-';
const LEADING_ZERO_DIGITS = 2;
const LOWER_LATIN_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const UPPER_LATIN_LETTERS = LOWER_LATIN_LETTERS.toUpperCase();

/** Letters of `lower-greek`, as CSS counts them: without the final sigma. */
const LOWER_GREEK_LETTERS = 'αβγδεζηθικλμνξοπρστυφχψω';

/** Values of Roman numerals, from the largest; CSS writes numbers from 1 to 3999 this way. */
const ROMAN_NUMERALS: readonly (readonly [number, string])[] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

const MIN_ROMAN_NUMBER = 1;
const MAX_ROMAN_NUMBER = 3999;
const MIN_ALPHABETIC_NUMBER = 1;
const NO_TEXT = '';

/** Bullets as characters; the view draws them as shapes of the size browsers give them. */
const BULLETS: ReadonlyMap<string, string> = new Map([
  [ListStyle.Disc, '•'],
  [ListStyle.Circle, '◦'],
  [ListStyle.Square, '▪'],
]);

/**
 * Text of a marker as Diffwise draws it, such as `5.`, `c.` or a bullet; `null` for a style it does
 * not draw, such as `armenian`. A number out of a style's range is written in digits, as in CSS.
 */
export function listMarkerText({ style, number }: ListMarker): string | null {
  const bullet = BULLETS.get(style);

  if (bullet !== undefined) {
    return bullet;
  }

  const counter = counterText(style, number);

  return counter === null ? null : counter + COUNTER_SUFFIX;
}

function counterText(style: string, number: number): string | null {
  switch (style) {
    case ListStyle.Decimal:
      return String(number);
    case ListStyle.DecimalLeadingZero:
      return leadingZeroText(number);
    case ListStyle.LowerAlpha:
      return alphabeticText(number, LOWER_LATIN_LETTERS);
    case ListStyle.UpperAlpha:
      return alphabeticText(number, UPPER_LATIN_LETTERS);
    case ListStyle.LowerGreek:
      return alphabeticText(number, LOWER_GREEK_LETTERS);
    case ListStyle.LowerRoman:
      return romanText(number).toLowerCase();
    case ListStyle.UpperRoman:
      return romanText(number);
    default:
      return null;
  }
}

/** `05`, `12` or `-03`: at least two digits. */
function leadingZeroText(number: number): string {
  const digits = String(Math.abs(number)).padStart(LEADING_ZERO_DIGITS, LEADING_ZERO);
  return number < 0 ? MINUS_SIGN + digits : digits;
}

/** `a` to `z`, then `aa`, `ab`, as CSS counts letters; digits below 1. */
function alphabeticText(number: number, letters: string): string {
  if (number < MIN_ALPHABETIC_NUMBER) {
    return String(number);
  }

  let text = NO_TEXT;

  for (let rest = number; rest > 0; rest = Math.floor((rest - 1) / letters.length)) {
    text = letters[(rest - 1) % letters.length] + text;
  }

  return text;
}

/** `XIV` for 14; digits out of the range of Roman numerals. */
function romanText(number: number): string {
  const outOfRange = number < MIN_ROMAN_NUMBER || number > MAX_ROMAN_NUMBER;

  if (outOfRange) {
    return String(number);
  }

  let text = NO_TEXT;
  let rest = number;

  for (const [value, numeral] of ROMAN_NUMERALS) {
    while (rest >= value) {
      text += numeral;
      rest -= value;
    }
  }

  return text;
}
