/** Words and the single characters between them, such as `logo`, `-` and `2025` of `logo-2025`. */
const VALUE_TOKENS = /[\p{L}\p{N}]+|[^\p{L}\p{N}]/gu;

const NO_TOKENS: readonly string[] = [];
const NO_TEXT = '';

/** A value split around the part that the other value lacks, such as `regulamin-`, `2025`, `.html`. */
export interface ChangedParts {
  /** Start both values have. */
  readonly start: string;
  /** Part only this value has; empty when only the other value has a part of its own. */
  readonly changed: string;
  /** End both values have. */
  readonly end: string;
}

/**
 * Splits two values around their changed parts: the longest start and end they share, whole
 * words at a time, so `2025` → `2026` highlights the whole number.
 */
export function splitChangedParts(
  oldValue: string,
  newValue: string,
): [ChangedParts, ChangedParts] {
  const oldTokens = oldValue.match(VALUE_TOKENS) ?? NO_TOKENS;
  const newTokens = newValue.match(VALUE_TOKENS) ?? NO_TOKENS;
  const startLength = sharedStartLength(oldTokens, newTokens);
  const endLength = sharedEndLength(oldTokens, newTokens, startLength);

  return [partsOf(oldTokens, startLength, endLength), partsOf(newTokens, startLength, endLength)];
}

/** Number of tokens both lists start with. */
function sharedStartLength(first: readonly string[], second: readonly string[]): number {
  const maxLength = Math.min(first.length, second.length);
  let length = 0;

  while (length < maxLength && sameTokenAt(first, second, length)) {
    length++;
  }

  return length;
}

/** True when both lists have the same token at the position. */
function sameTokenAt(
  first: readonly string[],
  second: readonly string[],
  position: number,
): boolean {
  return first[position] === second[position];
}

/** Number of tokens both lists end with, among the tokens after their shared start. */
function sharedEndLength(
  first: readonly string[],
  second: readonly string[],
  startLength: number,
): number {
  const maxLength = Math.min(first.length, second.length) - startLength;
  let length = 0;

  while (length < maxLength && sameTokenFromEnd(first, second, length)) {
    length++;
  }

  return length;
}

/** True when both lists have the same token at the position counted from their ends. */
function sameTokenFromEnd(
  first: readonly string[],
  second: readonly string[],
  positionFromEnd: number,
): boolean {
  return first.at(-1 - positionFromEnd) === second.at(-1 - positionFromEnd);
}

/** The tokens of a value joined into its shared start, its changed part and its shared end. */
function partsOf(tokens: readonly string[], startLength: number, endLength: number): ChangedParts {
  const changedEnd = tokens.length - endLength;

  return {
    start: joinTokens(tokens, 0, startLength),
    changed: joinTokens(tokens, startLength, changedEnd),
    end: joinTokens(tokens, changedEnd, tokens.length),
  };
}

/** The text of the tokens from `start` up to `end`. */
function joinTokens(tokens: readonly string[], start: number, end: number): string {
  return tokens.slice(start, end).join(NO_TEXT);
}
