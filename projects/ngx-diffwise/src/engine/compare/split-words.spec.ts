import { TokenKind, splitWords } from './split-words';

/** Tokens as `[kind, text]`, for tests that do not check positions. */
function kindsAndTexts(text: string) {
  return splitWords(text).map((token) => [token.kind, token.text]);
}

describe('splitWords', () => {
  it('splits words, whitespace and punctuation', () => {
    expect(kindsAndTexts('Fees cost 19 USD.')).toEqual([
      [TokenKind.Word, 'Fees'],
      [TokenKind.Whitespace, ' '],
      [TokenKind.Word, 'cost'],
      [TokenKind.Whitespace, ' '],
      [TokenKind.Word, '19'],
      [TokenKind.Whitespace, ' '],
      [TokenKind.Word, 'USD'],
      [TokenKind.Symbol, '.'],
    ]);
  });

  it('gives the position of every token', () => {
    const text = 'Plans  today';

    for (const token of splitWords(text)) {
      expect(text.slice(token.start, token.start + token.text.length)).toBe(token.text);
    }

    expect(splitWords(text).map((token) => token.start)).toEqual([0, 5, 7]);
  });

  it('keeps a run of spaces in one token', () => {
    expect(kindsAndTexts('a  b')).toEqual([
      [TokenKind.Word, 'a'],
      [TokenKind.Whitespace, '  '],
      [TokenKind.Word, 'b'],
    ]);
  });

  it('keeps each emoji whole', () => {
    expect(kindsAndTexts('done 🙂🎉')).toEqual([
      [TokenKind.Word, 'done'],
      [TokenKind.Whitespace, ' '],
      [TokenKind.Symbol, '🙂'],
      [TokenKind.Symbol, '🎉'],
    ]);
  });

  it('splits Chinese into words, not single characters or whole sentences', () => {
    expect(kindsAndTexts('我们的服务全天开放。')).toEqual([
      [TokenKind.Word, '我们'],
      [TokenKind.Word, '的'],
      [TokenKind.Word, '服务'],
      [TokenKind.Word, '全天'],
      [TokenKind.Word, '开放'],
      [TokenKind.Symbol, '。'],
    ]);
  });

  it('gives no tokens for empty text', () => {
    expect(splitWords('')).toEqual([]);
  });
});
