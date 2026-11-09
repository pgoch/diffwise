import { FormattingValue, type TextFormat, TextStyle } from '../model';
import { parseHtml } from './parse-html';
import { PLAIN_FORMAT, TextFormatReader } from './text-format';

/** The text whose format the tests read. */
const TEXT = 'x';

const MISSING_TEXT_ERROR = 'The document has no text "x".';

/** Formats of the text nodes of a document, read by one reader, by their texts. */
function formatsByText(html: string): Map<string, TextFormat> {
  const reader = new TextFormatReader();
  const nodes = textNodes(parseHtml(html));

  return new Map(nodes.map((node) => [node.data, reader.formatOf(node)]));
}

/** Format of the text `x` in a document. */
function formatOf(html: string): TextFormat {
  const format = formatsByText(html).get(TEXT);

  if (format === undefined) {
    throw new Error(MISSING_TEXT_ERROR);
  }

  return format;
}

function textNodes(root: Element): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  return nodes;
}

/** Values that the format sets, without those it does not. */
function setValues(format: TextFormat) {
  return Object.fromEntries(Object.entries(format.values).filter(([, value]) => value !== null));
}

describe('TextFormatReader', () => {
  it('gives plain text the plain format', () => {
    expect(formatOf('<p>x</p>')).toBe(PLAIN_FORMAT);
  });

  it.each([
    ['<b>x</b>', TextStyle.Bold],
    ['<strong>x</strong>', TextStyle.Bold],
    ['<i>x</i>', TextStyle.Italic],
    ['<em>x</em>', TextStyle.Italic],
    ['<u>x</u>', TextStyle.Underline],
    ['<ins>x</ins>', TextStyle.Underline],
    ['<s>x</s>', TextStyle.Strikethrough],
    ['<strike>x</strike>', TextStyle.Strikethrough],
    ['<del>x</del>', TextStyle.Strikethrough],
    ['<sup>x</sup>', TextStyle.Superscript],
    ['<sub>x</sub>', TextStyle.Subscript],
    ['<code>x</code>', TextStyle.Code],
    ['<kbd>x</kbd>', TextStyle.Code],
    ['<pre>x</pre>', TextStyle.Code],
    ['<mark>x</mark>', TextStyle.TextHighlight],
    ['<small>x</small>', TextStyle.SmallText],
  ])('reads %s as %s', (html, style) => {
    expect(formatOf(html).styles).toEqual([style]);
  });

  it.each([
    ['<span style="font-weight: 700">x</span>', [TextStyle.Bold]],
    ['<span style="font-weight: bold">x</span>', [TextStyle.Bold]],
    ['<span style="font-style: italic">x</span>', [TextStyle.Italic]],
    [
      '<span style="text-decoration: underline line-through">x</span>',
      [TextStyle.Underline, TextStyle.Strikethrough],
    ],
    ['<span style="vertical-align: super">x</span>', [TextStyle.Superscript]],
    ['<span style="text-transform: uppercase">x</span>', [TextStyle.Uppercase]],
    ['<span style="text-transform: capitalize">x</span>', [TextStyle.Capitalized]],
  ])('reads the style of %s', (html, styles) => {
    expect(formatOf(html).styles).toEqual(styles);
  });

  it('lets the closest weight, slant and letter case win', () => {
    expect(formatOf('<b>a <span style="font-weight: 400">x</span></b>').styles).toEqual([]);
    expect(formatOf('<b style="font-weight: normal"><i>x</i></b>').styles).toEqual([
      TextStyle.Italic,
    ]);
    expect(formatOf('<span style="font-weight: normal"><b>x</b></span>').styles).toEqual([
      TextStyle.Bold,
    ]);
    expect(formatOf('<em>a <span style="font-style: normal">x</span></em>').styles).toEqual([]);
    expect(
      formatOf(
        '<p style="text-transform: uppercase"><span style="text-transform: none">x</span></p>',
      ).styles,
    ).toEqual([]);
  });

  it('adds lines to the lines around, which an inner style cannot remove', () => {
    expect(formatOf('<s><u>x</u></s>').styles).toEqual([
      TextStyle.Underline,
      TextStyle.Strikethrough,
    ]);
    expect(formatOf('<u><span style="text-decoration: none">x</span></u>').styles).toEqual([
      TextStyle.Underline,
    ]);
  });

  it('reads colors, the font and the size as CSS writes them', () => {
    const html =
      '<span style="color: #c0392b; background-color: #FFF3A0; font-family: Georgia; font-size: 18px">x</span>';

    expect(setValues(formatOf(html))).toEqual({
      [FormattingValue.TextColor]: 'rgb(192, 57, 43)',
      [FormattingValue.BackgroundColor]: 'rgb(255, 243, 160)',
      [FormattingValue.FontFamily]: 'Georgia',
      [FormattingValue.FontSize]: '18px',
    });
  });

  it('takes the closest value, and the parent value where a style leaves it to the parent', () => {
    const closest = '<span style="color: red">a <span style="color: blue">x</span></span>';
    const inherited = '<span style="color: red">a <span style="color: inherit">x</span></span>';
    const transparent =
      '<span style="background-color: yellow">a <span style="background-color: transparent">x</span></span>';

    expect(formatOf(closest).values.textColor).toBe('blue');
    expect(formatOf(inherited).values.textColor).toBe('red');
    expect(formatOf(transparent).values.backgroundColor).toBe('yellow');
  });

  it('reads the old font tag like the style it stands for', () => {
    const font = '<font color="#c0392b" face="Georgia" size="5">x</font>';
    const span = '<span style="color: #c0392b; font-family: Georgia; font-size: x-large">x</span>';

    expect(formatOf(font)).toEqual(formatOf(span));
    expect(formatOf(font).values.fontSize).toBe('x-large');
  });

  it('reads the alignment of blocks only', () => {
    expect(formatOf('<p style="text-align: center">x</p>').values.textAlignment).toBe('center');
    expect(formatOf('<p align="RIGHT">x</p>').values.textAlignment).toBe('right');
    expect(formatOf('<center>x</center>').values.textAlignment).toBe('center');
    expect(formatOf('<p><span style="text-align: center">x</span></p>')).toBe(PLAIN_FORMAT);
    expect(formatOf('<table align="center"><tr><td>x</td></tr></table>')).toBe(PLAIN_FORMAT);
  });

  it('reads the level of a heading', () => {
    expect(formatOf('<h2>x</h2>').values.headingLevel).toBe('2');
    expect(formatOf('<section><h4><b>x</b></h4></section>').values.headingLevel).toBe('4');
  });

  it('reads the address of a link as it is written', () => {
    expect(formatOf('<a href=" https://example.com/help ">x</a>').link).toBe(
      'https://example.com/help',
    );
    expect(formatOf('<a href="#note-1"><sup>x</sup></a>').link).toBe('#note-1');
    expect(formatOf('<a name="top">x</a>')).toBe(PLAIN_FORMAT);
  });

  it('passes the format of the parent on through elements that set nothing', () => {
    const formats = formatsByText('<b>a <span class="term">x</span></b>');

    expect(formats.get(TEXT)).toBe(formats.get('a '));
  });
});
