import { parseHtml } from '../html/parse-html';
import { splitLines } from '../html/split-lines';
import { type Line, LineKind, type TextRange } from '../model';
import {
  ADDED_TEXT_MARKER,
  type ChangeMarker,
  REMOVED_TEXT_MARKER,
  markChanges,
} from './mark-changes';

const REMOVED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--removed';
const ADDED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--added';
const ID_PREFIX = 'diff-';

/** Expected HTML of a removed part. */
function removed(html: string): string {
  return `<del class="${REMOVED_CLASSES}">${html}</del>`;
}

/** Expected HTML of an added part. */
function added(html: string): string {
  return `<ins class="${ADDED_CLASSES}">${html}</ins>`;
}

/** The first line of a document. */
function lineOf(html: string): Line {
  const [line] = splitLines(parseHtml(html), ID_PREFIX);
  return line;
}

/** Marks the given parts of the line's text, searched for in order. */
function mark(
  html: string,
  parts: readonly string[],
  marker: ChangeMarker = REMOVED_TEXT_MARKER,
): string {
  const line = lineOf(html);
  return markChanges(line, rangesOf(line.text, parts), marker);
}

function rangesOf(text: string, parts: readonly string[]): TextRange[] {
  const ranges: TextRange[] = [];
  let searchFrom = 0;

  for (const part of parts) {
    const start = text.indexOf(part, searchFrom);

    searchFrom = start + part.length;
    ranges.push({ start, end: searchFrom });
  }

  return ranges;
}

describe('markChanges', () => {
  it('wraps removed text in a del marker (T2)', () => {
    expect(mark('<p>Konto można usunąć w ustawieniach.</p>', ['usunąć'])).toBe(
      `<p>Konto można ${removed('usunąć')} w ustawieniach.</p>`,
    );
  });

  it('wraps added text in an ins marker', () => {
    expect(mark('<p>Konto można zamknąć w ustawieniach.</p>', ['zamknąć'], ADDED_TEXT_MARKER)).toBe(
      `<p>Konto można ${added('zamknąć')} w ustawieniach.</p>`,
    );
  });

  it('marks two changes in one line separately (T3)', () => {
    expect(mark('<p>Opłata wynosi 19 zł i jest pobierana z góry.</p>', ['19', 'góry'])).toBe(
      `<p>Opłata wynosi ${removed('19')} zł i jest pobierana z ${removed('góry')}.</p>`,
    );
  });

  it('puts the marker inside bold text, so the bold stays', () => {
    expect(mark('<p>Przerwa w <strong>sobotę</strong> rano</p>', ['sobotę'])).toBe(
      `<p>Przerwa w <strong>${removed('sobotę')}</strong> rano</p>`,
    );
  });

  it('puts the marker inside a link, so the link stays', () => {
    expect(mark('<p>Zobacz <a href="/status">komunikat</a>.</p>', ['komunikat'])).toBe(
      `<p>Zobacz <a href="/status">${removed('komunikat')}</a>.</p>`,
    );
  });

  it('marks each part of a word split by formatting', () => {
    expect(mark('<p>Przeczytaj regu<i>lamin</i>.</p>', ['regulamin'])).toBe(
      `<p>Przeczytaj ${removed('regu')}<i>${removed('lamin')}</i>.</p>`,
    );
  });

  it('keeps the whitespace between marked words inside one marker', () => {
    expect(mark('<p>stara \n nazwa planu</p>', ['stara nazwa'])).toBe(
      `<p>${removed('stara \n nazwa')} planu</p>`,
    );
  });

  it('marks the space before formatting together with the word before it', () => {
    expect(mark('<p>stara <b>nazwa</b> planu</p>', ['stara nazwa'])).toBe(
      `<p>${removed('stara ')}<b>${removed('nazwa')}</b> planu</p>`,
    );
  });

  it('leaves the space between blocks unmarked', () => {
    expect(mark('<ul><li>Jeden</li><li>Dwa</li></ul>', ['Jeden Dwa'])).toBe(
      `<ul><li>${removed('Jeden')}</li><li>${removed('Dwa')}</li></ul>`,
    );
  });

  it('keeps entities and no-break spaces (T11)', () => {
    expect(mark('<p>Rabat &lt; 20&nbsp;zł &amp; dostawa</p>', ['20 zł'])).toBe(
      `<p>Rabat &lt; ${removed('20&nbsp;zł')} &amp; dostawa</p>`,
    );
  });

  it('keeps text that looks like HTML escaped', () => {
    expect(mark('<p>&lt;img src=x onerror=alert(1)&gt; tekst</p>', ['tekst'])).toBe(
      `<p>&lt;img src=x onerror=alert(1)&gt; ${removed('tekst')}</p>`,
    );
  });

  it('marks text inside a quote', () => {
    expect(mark('<blockquote><p>Treść cytatu</p></blockquote>', ['cytatu'])).toBe(
      `<blockquote><p>Treść ${removed('cytatu')}</p></blockquote>`,
    );
  });

  it('marks changed whitespace in a code block', () => {
    expect(mark('<pre>let a  = 1;</pre>', ['  '])).toBe(`<pre>let a${removed('  ')}= 1;</pre>`);
  });

  it('leaves text unmarked where a marker would break the HTML', () => {
    const html = '<p>Pole <textarea>stare</textarea> i rysunek <svg><text>stary</text></svg>.</p>';

    expect(mark(html, ['stare', 'stary'])).toBe(lineOf(html).html);
  });

  it('leaves the HTML unmarked when parsing it again changes its text', () => {
    const codeStartingWithNewline: Line = {
      kind: LineKind.Block,
      tag: 'pre',
      text: '\nkod',
      formats: [],
      html: '<pre>\nkod</pre>',
    };

    expect(markChanges(codeStartingWithNewline, [{ start: 1, end: 4 }], REMOVED_TEXT_MARKER)).toBe(
      codeStartingWithNewline.html,
    );
  });

  it('returns the HTML as it is without ranges', () => {
    const line = lineOf('<p>Bez zmian</p>');

    expect(markChanges(line, [], REMOVED_TEXT_MARKER)).toBe(line.html);
  });
});
