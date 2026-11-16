import { parseHtml } from './parse-html';
import {
  IMAGE_CHARACTER,
  type ReaderTextMap,
  type TextPiece,
  mapReaderText,
  readerText,
} from './reader-text';

const IMAGE_TAG = 'img';

function textOf(html: string): string {
  return readerText(parseHtml(html).childNodes);
}

function mapOf(html: string): ReaderTextMap {
  return mapReaderText(parseHtml(html).childNodes);
}

/** The text a piece points to in its node; an image stands for its character. */
function sourceText({ node, nodeOffset, start, end }: TextPiece): string {
  if (node instanceof Element) {
    return IMAGE_CHARACTER;
  }

  return node.data.slice(nodeOffset, nodeOffset + end - start);
}

describe('readerText', () => {
  it('collapses whitespace a reader cannot see', () => {
    expect(textOf('<p>Personal  account</p>')).toBe('Personal account');
    expect(textOf('<p>Personal&nbsp;account</p>')).toBe('Personal account');
    expect(textOf('<p>\n  Personal\naccount </p>')).toBe('Personal account');
  });

  it('reads entities as the characters a reader sees', () => {
    expect(textOf('<p>Discount &lt; 20 USD &amp; free delivery</p>')).toBe(
      'Discount < 20 USD & free delivery',
    );
  });

  it('keeps Polish letters and emoji intact', () => {
    expect(textOf('<p>Zażółć gęślą jaźń 🙂🎉</p>')).toBe('Zażółć gęślą jaźń 🙂🎉');
  });

  it('keeps words whole across inline formatting', () => {
    expect(textOf('<p>Read the <b>full</b> guide<i>lines</i>.</p>')).toBe(
      'Read the full guidelines.',
    );
  });

  it('separates words at blocks and line breaks', () => {
    expect(textOf('<p>one</p><p>two</p>')).toBe('one two');
    expect(textOf('<p>one<br>two</p>')).toBe('one two');
  });

  it('reads each image as one character between words', () => {
    const html =
      '<p>one<img src="images/icon-share.svg" alt="">two <img src="a.svg"><img src="b.svg"></p>';

    expect(textOf(html)).toBe(`one ${IMAGE_CHARACTER} two ${IMAGE_CHARACTER} ${IMAGE_CHARACTER}`);
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

  it('points the character of an image at the image', () => {
    const { text, pieces } = mapOf('<p>Click <img src="images/icon-share.svg" alt=""> Share</p>');
    const imagePiece = pieces[2];

    expect(text).toBe(`Click ${IMAGE_CHARACTER} Share`);
    expect(pieces.map(sourceText)).toEqual(['Click', ' ', IMAGE_CHARACTER, 'Share']);
    expect(imagePiece).toEqual(expect.objectContaining({ start: 6, end: 7, nodeOffset: 0 }));
    expect((imagePiece.node as Element).localName).toBe(IMAGE_TAG);
  });

  it('maps a code block character by character', () => {
    const { text, pieces } = mapOf('<pre>a&nbsp;b\n  c</pre>');

    expect(text).toBe('a b\n  c');
    expect(pieces).toEqual([expect.objectContaining({ start: 0, end: 7, nodeOffset: 0 })]);
  });
});
