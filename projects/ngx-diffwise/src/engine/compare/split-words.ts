/** Kinds of text pieces. */
export const TokenKind = {
  /** Letters or digits, such as `konto` or `19`. */
  Word: 'word',
  /** A run of spaces, or a line break. */
  Whitespace: 'whitespace',
  /** One punctuation mark, emoji or other symbol. */
  Symbol: 'symbol',
} as const;

export type TokenKind = (typeof TokenKind)[keyof typeof TokenKind];

/** A piece of text and its position in the split text. */
export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly start: number;
}

const WORD_GRANULARITY = 'word';
const WHITESPACE_ONLY = /^\s+$/;

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: WORD_GRANULARITY });

/** Splits text into words, whitespace and symbols; also works for languages without spaces. */
export function splitWords(text: string): Token[] {
  return Array.from(wordSegmenter.segment(text), ({ segment, index, isWordLike }) => ({
    kind: tokenKind(segment, isWordLike),
    text: segment,
    start: index,
  }));
}

function tokenKind(segment: string, isWordLike: boolean | undefined): TokenKind {
  if (isWordLike) {
    return TokenKind.Word;
  }

  return WHITESPACE_ONLY.test(segment) ? TokenKind.Whitespace : TokenKind.Symbol;
}
