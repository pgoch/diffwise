import enLongAfter from '../../../../../test-data/en/long/after.html?raw';
import enLongBefore from '../../../../../test-data/en/long/before.html?raw';
import plLongAfter from '../../../../../test-data/pl/long/after.html?raw';
import plLongBefore from '../../../../../test-data/pl/long/before.html?raw';
import { CheckboxState, LineKind, ListStyle, TextStyle } from '../model';
import { parseHtml } from './parse-html';
import { IMAGE_CHARACTER, readerText } from './reader-text';
import { splitLines } from './split-lines';
import { PLAIN_FORMAT } from './text-format';

const SPACE = ' ';
const HEADINGS_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const LIST_ITEMS_SELECTOR = 'li, dt, dd';
const ID_PREFIX = 'diff-';

/** Marks the list item that a line belongs to. */
const LINE_ITEM = 'data-diffwise-line-item=""';

/** Marks a copy of a list item in a later line of the item. */
const CONTINUED_ITEM = 'data-diffwise-continued-item=""';

/** Long samples from `test-data/`, which contain everything an editor can produce. */
const LONG_SAMPLES: [string, string][] = [
  ['en/long/before.html', enLongBefore],
  ['en/long/after.html', enLongAfter],
  ['pl/long/before.html', plLongBefore],
  ['pl/long/after.html', plLongAfter],
];

function splitDocument(html: string) {
  return splitLines(parseHtml(html), ID_PREFIX);
}

/** Lines without their formats, for tests that check the split and the HTML. */
function lines(documentHtml: string) {
  return splitDocument(documentHtml).map(({ kind, tag, text, html }) => ({
    kind,
    tag,
    text,
    html,
  }));
}

/** Lines without their formats and HTML, for tests that check only the split. */
function linesWithoutHtml(html: string) {
  return lines(html).map(({ kind, tag, text }) => ({ kind, tag, text }));
}

/** HTML of each line, for tests that check only the copies around the content. */
function htmlOfLines(html: string) {
  return lines(html).map((line) => line.html);
}

/** Each line as `[text, marker style, number, level, checkbox]`; `null` where it has none. */
function itemStarts(html: string) {
  return splitDocument(html).map(({ text, marker, checkbox }) => [
    text,
    marker?.style ?? null,
    marker?.number ?? null,
    marker?.level ?? null,
    checkbox,
  ]);
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

  it('makes a line of every list item inside a copy of its list', () => {
    expect(lines('<ul class="plany"><li>Osobisty</li><li>Firmowy</li></ul>')).toEqual([
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: 'Osobisty',
        html: `<ul class="plany"><li value="1" ${LINE_ITEM}>Osobisty</li></ul>`,
      },
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: 'Firmowy',
        html: `<ul class="plany"><li value="2" ${LINE_ITEM}>Firmowy</li></ul>`,
      },
    ]);
  });

  it('gives the copy of each item the number it has in its list', () => {
    const html =
      '<ol start="5" type="a"><li>Import</li><li value="9">Eksport</li><li>Kopia</li></ol>'
      + '<ol reversed><li>Dwa</li><li>Jeden</li></ol>';

    expect(htmlOfLines(html)).toEqual([
      `<ol start="5" type="a"><li value="5" ${LINE_ITEM}>Import</li></ol>`,
      `<ol start="5" type="a"><li value="9" ${LINE_ITEM}>Eksport</li></ol>`,
      `<ol start="5" type="a"><li value="10" ${LINE_ITEM}>Kopia</li></ol>`,
      `<ol reversed=""><li value="2" ${LINE_ITEM}>Dwa</li></ol>`,
      `<ol reversed=""><li value="1" ${LINE_ITEM}>Jeden</li></ol>`,
    ]);
  });

  it('splits an item with a nested list and shows its marker only in its first line', () => {
    const html =
      '<ul><li>Konta<ul><li>osobiste</li><li>firmowe</li></ul>i ich ustawienia</li></ul>';
    const outerItemCopy = `<ul><li value="1" ${CONTINUED_ITEM}>`;

    expect(lines(html)).toEqual([
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: 'Konta',
        html: `<ul><li value="1" ${LINE_ITEM}>Konta</li></ul>`,
      },
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: 'osobiste',
        html: `${outerItemCopy}<ul><li value="1" ${LINE_ITEM}>osobiste</li></ul></li></ul>`,
      },
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: 'firmowe',
        html: `${outerItemCopy}<ul><li value="2" ${LINE_ITEM}>firmowe</li></ul></li></ul>`,
      },
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: 'i ich ustawienia',
        html: `<ul><li value="1" ${CONTINUED_ITEM} ${LINE_ITEM}>i ich ustawienia</li></ul>`,
      },
    ]);
  });

  it('shows the marker of an item that starts with a nested list next to its first item', () => {
    expect(htmlOfLines('<ol><li><ul><li>osobiste</li><li>firmowe</li></ul></li></ol>')).toEqual([
      `<ol><li value="1"><ul><li value="1" ${LINE_ITEM}>osobiste</li></ul></li></ol>`,
      `<ol><li value="1" ${CONTINUED_ITEM}><ul><li value="2" ${LINE_ITEM}>firmowe</li></ul></li></ol>`,
    ]);
  });

  it('splits an item with several paragraphs, which read like the item without them', () => {
    expect(lines('<ol><li><p>Pierwszy akapit</p><p>Drugi akapit</p></li></ol>')).toEqual([
      {
        kind: LineKind.Paragraph,
        tag: 'p',
        text: 'Pierwszy akapit',
        html: `<ol><li value="1" ${LINE_ITEM}><p>Pierwszy akapit</p></li></ol>`,
      },
      {
        kind: LineKind.Paragraph,
        tag: 'p',
        text: 'Drugi akapit',
        html: `<ol><li value="1" ${CONTINUED_ITEM} ${LINE_ITEM}><p>Drugi akapit</p></li></ol>`,
      },
    ]);
  });

  it('keeps an empty list item as a line, as its marker shows', () => {
    const html =
      '<ol><li>Jeden</li><li></li><li><p> </p></li></ol><dl><dt>Termin</dt><dd></dd></dl>';

    expect(lines(html)).toEqual([
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: 'Jeden',
        html: `<ol><li value="1" ${LINE_ITEM}>Jeden</li></ol>`,
      },
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: '',
        html: `<ol><li value="2" ${LINE_ITEM}></li></ol>`,
      },
      {
        kind: LineKind.ListItem,
        tag: 'li',
        text: '',
        html: `<ol><li value="3" ${LINE_ITEM}><p> </p></li></ol>`,
      },
      {
        kind: LineKind.ListItem,
        tag: 'dt',
        text: 'Termin',
        html: `<dl><dt ${LINE_ITEM}>Termin</dt></dl>`,
      },
    ]);
  });

  it('gives the first line of a list item the marker and the checkbox of the item', () => {
    const html =
      '<ol start="3"><li><input type="checkbox" checked> Konto<ul><li>Osobiste</li></ul>'
      + 'i ustawienia</li></ol><p>Koniec</p>';

    expect(itemStarts(html)).toEqual([
      ['Konto', ListStyle.Decimal, 3, 1, CheckboxState.Checked],
      ['Osobiste', ListStyle.Circle, 1, 2, null],
      ['i ustawienia', null, null, null, null],
      ['Koniec', null, null, null, null],
    ]);
  });

  it('gives the marker of an item to the line of a term inside it, not to its description', () => {
    const html = '<ul><li><dl><dt>Notatnik</dt><dd>Zbiór notatek</dd></dl></li></ul>';

    expect(itemStarts(html)).toEqual([
      ['Notatnik', ListStyle.Disc, 1, 1, null],
      ['Zbiór notatek', null, null, null, null],
    ]);
  });

  it('reads the checkbox of an item whose style shows no marker', () => {
    const html = '<ul style="list-style-type: none"><li><input type="checkbox"> Kopie</li></ul>';

    expect(itemStarts(html)).toEqual([['Kopie', null, null, null, CheckboxState.Unchecked]]);
  });

  it('makes a line of each term and description of a definition list', () => {
    expect(htmlOfLines('<dl><dt>Notatnik</dt><dd>Zbiór notatek</dd></dl>')).toEqual([
      `<dl><dt ${LINE_ITEM}>Notatnik</dt></dl>`,
      `<dl><dd ${LINE_ITEM}>Zbiór notatek</dd></dl>`,
    ]);
  });

  it('splits a list inside a quote and keeps both around each item', () => {
    expect(htmlOfLines('<blockquote><ul><li>Jeden</li><li>Dwa</li></ul></blockquote>')).toEqual([
      `<blockquote><ul><li value="1" ${LINE_ITEM}>Jeden</li></ul></blockquote>`,
      `<blockquote><ul><li value="2" ${LINE_ITEM}>Dwa</li></ul></blockquote>`,
    ]);
  });

  it('keeps an id only in the first line of its element', () => {
    const list = '<ol id="kroki"><li id="konto">Konto<ul><li>osobiste</li></ul></li></ol>';
    const quote = '<blockquote id="cytat"><p>Jeden</p><p>Dwa</p></blockquote>';

    expect(htmlOfLines(list + quote)).toEqual([
      `<ol id="diff-kroki"><li id="diff-konto" value="1" ${LINE_ITEM}>Konto</li></ol>`,
      `<ol><li value="1" ${CONTINUED_ITEM}><ul><li value="1" ${LINE_ITEM}>osobiste</li></ul></li></ol>`,
      '<blockquote id="diff-cytat"><p>Jeden</p></blockquote>',
      '<blockquote><p>Dwa</p></blockquote>',
    ]);
  });

  it('keeps a table whole for now, with the lists in its cells', () => {
    const html = '<table><tr><td>49 zł</td><td><ul><li>bez limitu</li></ul></td></tr></table>';

    expect(linesWithoutHtml(html)).toEqual([
      { kind: LineKind.Block, tag: 'table', text: '49 zł bez limitu' },
    ]);
  });

  it('skips lines a reader sees as empty', () => {
    expect(linesWithoutHtml('<p></p><p>&nbsp;</p><p><br></p><div> </div><p>Text</p>')).toEqual([
      { kind: LineKind.Paragraph, tag: 'p', text: 'Text' },
    ]);
  });

  it('keeps lines with only an image or a horizontal rule', () => {
    expect(linesWithoutHtml('<p><img src="images/logo-2025.svg" alt="Logo"></p><hr>')).toEqual([
      { kind: LineKind.Paragraph, tag: 'p', text: IMAGE_CHARACTER },
      { kind: LineKind.Block, tag: 'hr', text: '' },
    ]);
  });

  it('lists the images of a line with their places in its text', () => {
    const [line] = splitDocument(
      '<p>Click <img src="images/icon-share.svg" alt="" width="16" height="16"> Share</p>',
    );
    const shareIcon = {
      source: 'images/icon-share.svg',
      width: '16px',
      height: '16px',
      altText: '',
    };

    expect(line.text).toBe(`Click ${IMAGE_CHARACTER} Share`);
    expect(line.images).toEqual([{ position: 6, properties: shareIcon }]);
  });

  it('gives an image the format of its place, like a word', () => {
    const [line] = splitDocument('<p><a href="https://example.com"><img src="logo.svg"></a></p>');
    const linkFormat = { ...PLAIN_FORMAT, link: 'https://example.com' };

    expect(line.formats).toEqual([{ start: 0, end: 1, format: linkFormat }]);
  });

  it('gives the same lines for unclosed and closed tags', () => {
    expect(lines('<p>Akapit <b>bez zamknięcia')).toEqual(
      lines('<p>Akapit <b>bez zamknięcia</b></p>'),
    );
  });

  it('leaves scripts out of the text and the HTML', () => {
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
      { kind: LineKind.ListItem, tag: 'li', text: 'Sign in' },
      { kind: LineKind.ListItem, tag: 'li', text: 'Create a notebook' },
      { kind: LineKind.Paragraph, tag: 'p', text: 'Simple and fast.' },
      { kind: LineKind.Block, tag: 'figure', text: `${IMAGE_CHARACTER} The editor` },
      { kind: LineKind.Block, tag: 'pre', text: 'Ctrl + S' },
      { kind: LineKind.Block, tag: 'details', text: 'More Hidden until opened.' },
      { kind: LineKind.ListItem, tag: 'dt', text: 'Notebook' },
      { kind: LineKind.ListItem, tag: 'dd', text: 'A set of notes' },
      { kind: LineKind.Block, tag: 'address', text: 'Notebook Online, example.com' },
    ]);
  });

  it.each(LONG_SAMPLES)('keeps all text of %s in reading order', (_, html) => {
    const body = parseHtml(html);
    const lineTexts = splitLines(body, ID_PREFIX)
      .map((line) => line.text)
      .filter((text) => text.length > 0);

    expect(lineTexts.join(SPACE)).toBe(readerText(body.childNodes));
  });

  it.each(LONG_SAMPLES)('makes a line of every heading in %s', (_, html) => {
    const body = parseHtml(html);
    const allLines = splitLines(body, ID_PREFIX);
    const headingLines = allLines.filter((line) => line.kind === LineKind.Heading);

    expect(headingLines).toHaveLength(body.querySelectorAll(HEADINGS_SELECTOR).length);
  });

  it.each(LONG_SAMPLES)('makes a line of every list item in %s', (_, html) => {
    const body = parseHtml(html);
    const allLines = splitLines(body, ID_PREFIX);
    const itemLines = allLines.filter((line) => line.kind === LineKind.ListItem);

    expect(itemLines).toHaveLength(body.querySelectorAll(LIST_ITEMS_SELECTOR).length);
  });

  it('gives each piece of text its format', () => {
    const [line] = splitDocument('<p>Read the <b>full</b> guide.</p>');
    const bold = { ...PLAIN_FORMAT, styles: [TextStyle.Bold] };

    expect(line.formats).toEqual([
      { start: 0, end: 9, format: PLAIN_FORMAT },
      { start: 9, end: 13, format: bold },
      { start: 13, end: 20, format: PLAIN_FORMAT },
    ]);
  });

  it('prefixes ids in the HTML of a line, but reads links as they are written', () => {
    const [line] = splitDocument('<p>See note<a href="#note">1</a>.</p><p id="note">Note.</p>');
    const linkFormat = line.formats.find((range) => range.format.link !== null)?.format;

    expect(line.html).toBe('<p>See note<a href="#diff-note">1</a>.</p>');
    expect(linkFormat?.link).toBe('#note');
  });
});
