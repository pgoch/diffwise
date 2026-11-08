import enLongAfter from '../../../../test-data/en/long/after.html?raw';
import enLongBefore from '../../../../test-data/en/long/before.html?raw';
import plLongAfter from '../../../../test-data/pl/long/after.html?raw';
import plLongBefore from '../../../../test-data/pl/long/before.html?raw';
import { LineKind } from './model';
import { parseHtml } from './parse-html';
import { readerText } from './reader-text';
import { splitLines } from './split-lines';

const SPACE = ' ';
const HEADINGS_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/** Long samples from `test-data/`, which contain everything an editor can produce. */
const LONG_SAMPLES: [string, string][] = [
  ['en/long/before.html', enLongBefore],
  ['en/long/after.html', enLongAfter],
  ['pl/long/before.html', plLongBefore],
  ['pl/long/after.html', plLongAfter],
];

function lines(html: string) {
  return splitLines(parseHtml(html));
}

/** Lines without their HTML, for tests that check only the split. */
function linesWithoutHtml(html: string) {
  return lines(html).map(({ kind, tag, text }) => ({ kind, tag, text }));
}

describe('splitLines', () => {
  it('makes a line of every heading and paragraph', () => {
    expect(lines('<h1>Title</h1><p>One</p><p>Two</p>')).toEqual([
      { kind: LineKind.Heading, tag: 'h1', text: 'Title', html: '<h1>Title</h1>' },
      { kind: LineKind.Paragraph, tag: 'p', text: 'One', html: '<p>One</p>' },
      { kind: LineKind.Paragraph, tag: 'p', text: 'Two', html: '<p>Two</p>' },
    ]);
  });

  it('keeps formatting inside a line', () => {
    expect(lines('<p>Read the <b>full</b> guide<i>lines</i>.</p>')).toEqual([
      {
        kind: LineKind.Paragraph,
        tag: 'p',
        text: 'Read the full guidelines.',
        html: '<p>Read the <b>full</b> guide<i>lines</i>.</p>',
      },
    ]);
  });

  it('splits paragraphs inside a quote and keeps the quote around each', () => {
    expect(
      lines('<blockquote cite="https://example.com"><p>One</p><p>Two</p></blockquote>'),
    ).toEqual([
      {
        kind: LineKind.Paragraph,
        tag: 'p',
        text: 'One',
        html: '<blockquote cite="https://example.com"><p>One</p></blockquote>',
      },
      {
        kind: LineKind.Paragraph,
        tag: 'p',
        text: 'Two',
        html: '<blockquote cite="https://example.com"><p>Two</p></blockquote>',
      },
    ]);
  });

  it('keeps the container around text next to blocks', () => {
    expect(lines('<section>Intro<h2>Title</h2></section>')).toEqual([
      {
        kind: LineKind.Paragraph,
        tag: null,
        text: 'Intro',
        html: '<section>Intro</section>',
      },
      {
        kind: LineKind.Heading,
        tag: 'h2',
        text: 'Title',
        html: '<section><h2>Title</h2></section>',
      },
    ]);
  });

  it('treats a container with only text as one paragraph and keeps its style', () => {
    expect(lines('<div style="text-align: center">Centered</div>')).toEqual([
      {
        kind: LineKind.Paragraph,
        tag: 'div',
        text: 'Centered',
        html: '<div style="text-align: center;">Centered</div>',
      },
    ]);
  });

  it('makes paragraphs of text outside any block', () => {
    expect(lines('Intro <b>text</b><p>Paragraph</p>Outro')).toEqual([
      { kind: LineKind.Paragraph, tag: null, text: 'Intro text', html: 'Intro <b>text</b>' },
      { kind: LineKind.Paragraph, tag: 'p', text: 'Paragraph', html: '<p>Paragraph</p>' },
      { kind: LineKind.Paragraph, tag: null, text: 'Outro', html: 'Outro' },
    ]);
  });

  it('keeps lists and tables whole for now', () => {
    const html =
      '<ul><li>One</li><li>Two</li></ul><table><tr><td>49 zł</td><td>59 zł</td></tr></table>';

    expect(linesWithoutHtml(html)).toEqual([
      { kind: LineKind.Block, tag: 'ul', text: 'One Two' },
      { kind: LineKind.Block, tag: 'table', text: '49 zł 59 zł' },
    ]);
  });

  it('skips lines a reader sees as empty', () => {
    expect(linesWithoutHtml('<p></p><p>&nbsp;</p><p><br></p><div> </div><p>Text</p>')).toEqual([
      { kind: LineKind.Paragraph, tag: 'p', text: 'Text' },
    ]);
  });

  it('keeps lines with only an image or a horizontal rule', () => {
    expect(linesWithoutHtml('<p><img src="images/logo-2025.svg" alt="Logo"></p><hr>')).toEqual([
      { kind: LineKind.Paragraph, tag: 'p', text: '' },
      { kind: LineKind.Block, tag: 'hr', text: '' },
    ]);
  });

  it('gives the same lines for unclosed and closed tags (T37)', () => {
    expect(lines('<p>Akapit <b>bez zamknięcia')).toEqual(
      lines('<p>Akapit <b>bez zamknięcia</b></p>'),
    );
  });

  it('leaves scripts out of the text and the HTML (T35)', () => {
    expect(lines('<p onclick="alert(1)">Tekst</p><script>alert(1)</script>')).toEqual([
      { kind: LineKind.Paragraph, tag: 'p', text: 'Tekst', html: '<p>Tekst</p>' },
    ]);
  });

  it('splits a document with every kind of block', () => {
    const html = `
      <h1>User guide</h1>
      <p>Welcome to <a href="https://example.com">Notebook Online</a>.</p>
      <section>
        <h2>Getting started</h2>
        <ol start="5"><li>Sign in</li><li>Create a notebook</li></ol>
        <blockquote><p>Simple and fast.</p></blockquote>
        <figure><img src="images/editor-screenshot.svg" alt="Editor"><figcaption>The editor</figcaption></figure>
      </section>
      <pre>Ctrl + S</pre>
      <details><summary>More</summary><p>Hidden until opened.</p></details>
      <dl><dt>Notebook</dt><dd>A set of notes</dd></dl>
      <address>Notebook Online, example.com</address>
    `;

    expect(linesWithoutHtml(html)).toEqual([
      { kind: LineKind.Heading, tag: 'h1', text: 'User guide' },
      { kind: LineKind.Paragraph, tag: 'p', text: 'Welcome to Notebook Online.' },
      { kind: LineKind.Heading, tag: 'h2', text: 'Getting started' },
      { kind: LineKind.Block, tag: 'ol', text: 'Sign in Create a notebook' },
      { kind: LineKind.Paragraph, tag: 'p', text: 'Simple and fast.' },
      { kind: LineKind.Block, tag: 'figure', text: 'The editor' },
      { kind: LineKind.Block, tag: 'pre', text: 'Ctrl + S' },
      { kind: LineKind.Block, tag: 'details', text: 'More Hidden until opened.' },
      { kind: LineKind.Block, tag: 'dl', text: 'Notebook A set of notes' },
      { kind: LineKind.Block, tag: 'address', text: 'Notebook Online, example.com' },
    ]);
  });

  it.each(LONG_SAMPLES)('keeps all text of %s in reading order', (_, html) => {
    const body = parseHtml(html);
    const lineTexts = splitLines(body)
      .map((line) => line.text)
      .filter((text) => text.length > 0);

    expect(lineTexts.join(SPACE)).toBe(readerText(body.childNodes));
  });

  it.each(LONG_SAMPLES)('makes a line of every heading in %s', (_, html) => {
    const body = parseHtml(html);
    const headingLines = splitLines(body).filter((line) => line.kind === LineKind.Heading);

    expect(headingLines).toHaveLength(body.querySelectorAll(HEADINGS_SELECTOR).length);
  });
});
