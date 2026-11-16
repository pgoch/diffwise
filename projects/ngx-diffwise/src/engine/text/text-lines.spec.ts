import { LineKind } from '../model';
import { textLines } from './text-lines';

function lineTexts(text: string): string[] {
  return textLines(text).map((line) => line.text);
}

describe('textLines', () => {
  it('ends a line at a line feed, a carriage return and a line feed, or a carriage return alone', () => {
    expect(lineTexts('first\nsecond')).toEqual(['first', 'second']);
    expect(lineTexts('first\r\nsecond')).toEqual(['first', 'second']);
    expect(lineTexts('first\rsecond')).toEqual(['first', 'second']);
  });

  it('splits text with mixed line ends', () => {
    expect(lineTexts('one\r\ntwo\nthree\rfour\r\n\r\nsix')).toEqual([
      'one',
      'two',
      'three',
      'four',
      '',
      'six',
    ]);
  });

  it('ends the last line at a line end at the end of the text, without an empty line after it', () => {
    expect(lineTexts('first\nsecond\n')).toEqual(['first', 'second']);
    expect(lineTexts('first\r\n')).toEqual(['first']);
    expect(lineTexts('first\r')).toEqual(['first']);
  });

  it('keeps empty lines, also at the end of the text', () => {
    expect(lineTexts('first\n\nthird')).toEqual(['first', '', 'third']);
    expect(lineTexts('first\n\n')).toEqual(['first', '']);
    expect(lineTexts('\n')).toEqual(['']);
  });

  it('gives no lines for empty text', () => {
    expect(textLines('')).toEqual([]);
  });

  it('keeps the spaces and tabs of each line as they are', () => {
    expect(lineTexts('  two spaces\n\ta tab\nspaces at the end  \n   ')).toEqual([
      '  two spaces',
      '\ta tab',
      'spaces at the end  ',
      '   ',
    ]);
  });

  it('makes a line of text only, with the characters of markup escaped in its HTML', () => {
    const [line] = textLines('Tags such as <b> & <script> stay text');

    expect(line).toEqual({
      kind: LineKind.Paragraph,
      tag: null,
      text: 'Tags such as <b> & <script> stay text',
      formats: [],
      images: [],
      html: 'Tags such as &lt;b&gt; &amp; &lt;script&gt; stay text',
      marker: null,
      checkbox: null,
      table: null,
      cells: [],
    });
  });
});
