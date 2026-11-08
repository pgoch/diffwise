import { parseHtml } from './parse-html';
import { type ReaderTextMap, type TextPiece, mapReaderText, readerText } from './reader-text';

function textOf(html: string): string {
  return readerText(parseHtml(html).childNodes);
}

function mapOf(html: string): ReaderTextMap {
  return mapReaderText(parseHtml(html).childNodes);
}

/** The text a piece points to in its node. */
function sourceText(piece: TextPiece): string {
  const length = piece.end - piece.start;
  return piece.node.data.slice(piece.nodeOffset, piece.nodeOffset + length);
}

describe('readerText', () => {
  it('collapses whitespace a reader cannot see (T8)', () => {
    expect(textOf('<p>Konto  osobiste</p>')).toBe('Konto osobiste');
    expect(textOf('<p>Konto&nbsp;osobiste</p>')).toBe('Konto osobiste');
    expect(textOf('<p>\n  Konto\nosobiste </p>')).toBe('Konto osobiste');
  });

  it('reads entities as the characters a reader sees (T11)', () => {
    expect(textOf('<p>Rabat &lt; 20 zł &amp; darmowa dostawa</p>')).toBe(
      'Rabat < 20 zł & darmowa dostawa',
    );
  });

  it('keeps Polish letters and emoji intact (T13)', () => {
    expect(textOf('<p>Zażółć gęślą jaźń 🙂🎉</p>')).toBe('Zażółć gęślą jaźń 🙂🎉');
  });

  it('keeps words whole across inline formatting', () => {
    expect(textOf('<p>Read the <b>full</b> guide<i>lines</i>.</p>')).toBe(
      'Read the full guidelines.',
    );
  });

  it('separates words at blocks, line breaks and images', () => {
    expect(textOf('<p>one</p><p>two</p>')).toBe('one two');
    expect(textOf('<p>one<br>two<img src="images/icon-share.svg" alt="">three</p>')).toBe(
      'one two three',
    );
  });

  it('keeps spaces and line breaks in code blocks', () => {
    expect(textOf('<pre>let a  = 1;\n  let b = 2;</pre>')).toBe('let a  = 1;\n  let b = 2;');
  });

  it('reads a no-break space in a code block as a space', () => {
    expect(textOf('<pre>a&nbsp;b</pre>')).toBe('a b');
  });

  it('gives empty text for an empty document', () => {
    expect(textOf('')).toBe('');
  });
});

describe('mapReaderText', () => {
  it('points every piece at the text it was read from', () => {
    const { text, pieces } = mapOf('<p>Read the <b>full</b> guide<i>lines</i>.</p>');

    expect(text).toBe('Read the full guidelines.');
    expect(pieces.map(sourceText)).toEqual([
      'Read',
      ' ',
      'the',
      ' ',
      'full',
      ' ',
      'guide',
      'lines',
      '.',
    ]);
    expect(pieces.map((piece) => text.slice(piece.start, piece.end))).toEqual(
      pieces.map(sourceText),
    );
  });

  it('maps a space to the first whitespace character it stands for', () => {
    const { pieces } = mapOf('<p>one \n two</p>');

    expect(pieces.map((piece) => piece.nodeOffset)).toEqual([0, 3, 6]);
  });

  it('gives a space between blocks no piece', () => {
    const { text, pieces } = mapOf('<p>one</p><p>two</p>');

    expect(text).toBe('one two');
    expect(pieces.map(sourceText)).toEqual(['one', 'two']);
  });

  it('maps a code block character by character', () => {
    const { text, pieces } = mapOf('<pre>a&nbsp;b\n  c</pre>');

    expect(text).toBe('a b\n  c');
    expect(pieces).toEqual([expect.objectContaining({ start: 0, end: 7, nodeOffset: 0 })]);
  });
});
