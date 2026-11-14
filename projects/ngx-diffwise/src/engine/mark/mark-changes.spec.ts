import { parseHtml } from '../html/parse-html';
import { IMAGE_CHARACTER, readerText } from '../html/reader-text';
import { splitLines } from '../html/split-lines';
import { type Line, LineKind, type TextRange } from '../model';
import {
  ADDED_TEXT_MARKER,
  type ChangeMarker,
  type ListItemMarks,
  NO_LIST_ITEM_MARKS,
  REMOVED_TEXT_MARKER,
  markChanges,
  markWholeCells,
  markWholeTableLine,
} from './mark-changes';

const REMOVED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--removed';
const ADDED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--added';
const IMAGE_CLASS = 'diffwise-html-diff__highlight--image';
const LIST_MARKER_CLASS = 'diffwise-html-diff__highlight--list-marker';
const CHECKBOX_CLASS = 'diffwise-html-diff__highlight--checkbox';
const CHECKBOX_MARKER_SELECTOR = `ins.${CHECKBOX_CLASS}`;
const CHECKBOX_SELECTOR = 'input[type="checkbox"]';
const DETAILS_ATTRIBUTE = 'data-diffwise-change-details';
const TEMPLATE_TAG = 'template';
const ROW_SELECTOR = 'tr';
const CELL_CLASS = 'diffwise-html-diff__highlight--cell';
const ADDED_CELL_CLASSES = `${ADDED_CLASSES} ${CELL_CLASS}`;
const REMOVED_CELL_CLASSES = `${REMOVED_CLASSES} ${CELL_CLASS}`;
const ID_PREFIX = 'diff-';

/** Marks the list item that a line belongs to. */
const LINE_ITEM = 'data-diffwise-line-item=""';

/** Marks of a line whose list marker changed, by its look or only by its number. */
const CHANGED_LIST_MARKER: ListItemMarks = { ...NO_LIST_ITEM_MARKS, listMarkerChanged: true };

/** Marks of a line whose checkbox was checked or cleared. */
const CHANGED_CHECKBOX: ListItemMarks = { ...NO_LIST_ITEM_MARKS, checkboxChanged: true };

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

/** Marks the list item of the first line of a document. */
function markItem(
  html: string,
  itemMarks: ListItemMarks,
  marker: ChangeMarker = ADDED_TEXT_MARKER,
): string {
  return markChanges(lineOf(html), [], marker, itemMarks);
}

function fragmentOf(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content;
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
  it('wraps removed text in a del marker', () => {
    expect(mark('<p>Konto można usunąć w ustawieniach.</p>', ['usunąć'])).toBe(
      `<p>Konto można ${removed('usunąć')} w ustawieniach.</p>`,
    );
  });

  it('wraps added text in an ins marker', () => {
    expect(mark('<p>Konto można zamknąć w ustawieniach.</p>', ['zamknąć'], ADDED_TEXT_MARKER)).toBe(
      `<p>Konto można ${added('zamknąć')} w ustawieniach.</p>`,
    );
  });

  it('marks two changes in one line separately', () => {
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
    expect(mark('<details><summary>Jeden</summary><p>Dwa</p></details>', ['Jeden Dwa'])).toBe(
      `<details><summary>${removed('Jeden')}</summary><p>${removed('Dwa')}</p></details>`,
    );
  });

  it('marks text inside a list item and keeps its number', () => {
    expect(mark('<ol start="3"><li>Dodaj tagi</li><li>Przypnij</li></ol>', ['tagi'])).toBe(
      `<ol start="3"><li value="3" data-diffwise-line-item="">Dodaj ${removed('tagi')}</li></ol>`,
    );
  });

  it('keeps entities and no-break spaces', () => {
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
      images: [],
      html: '<pre>\nkod</pre>',
      marker: null,
      checkbox: null,
      table: null,
      cells: [],
    };

    expect(markChanges(codeStartingWithNewline, [{ start: 1, end: 4 }], REMOVED_TEXT_MARKER)).toBe(
      codeStartingWithNewline.html,
    );
  });

  it('returns the HTML as it is without ranges', () => {
    const line = lineOf('<p>Bez zmian</p>');

    expect(markChanges(line, [], REMOVED_TEXT_MARKER)).toBe(line.html);
  });

  it('lists the change details of a marker in its attribute', () => {
    const line = lineOf('<p>Zobacz <b>regulamin</b>.</p>');
    const [range] = rangesOf(line.text, ['regulamin']);
    const marker = `<ins class="${ADDED_CLASSES}" data-diffwise-change-details="0 1">regulamin</ins>`;

    expect(markChanges(line, [{ ...range, detailIndices: [0, 1] }], ADDED_TEXT_MARKER)).toBe(
      `<p>Zobacz <b>${marker}</b>.</p>`,
    );
  });

  it('frames an image with a marker of its own class', () => {
    const icon = '<img src="images/icon-share.svg" alt="">';
    const marker = `<del class="${REMOVED_CLASSES} ${IMAGE_CLASS}">${icon}</del>`;

    expect(mark(`<p>Kliknij ${icon} Udostępnij.</p>`, [IMAGE_CHARACTER])).toBe(
      `<p>Kliknij ${marker} Udostępnij.</p>`,
    );
  });

  it('marks text and an image in one range with separate markers', () => {
    const icon = '<img src="images/icon-share.svg" alt="">';
    const iconMarker = `<ins class="${ADDED_CLASSES} ${IMAGE_CLASS}">${icon}</ins>`;

    expect(
      mark(
        `<p>Kliknij ${icon} Udostępnij.</p>`,
        [`${IMAGE_CHARACTER} Udostępnij`],
        ADDED_TEXT_MARKER,
      ),
    ).toBe(`<p>Kliknij ${iconMarker} ${added('Udostępnij')}.</p>`);
  });

  it('frames the picture around an image, so its sources stay with it', () => {
    const picture =
      '<picture><source srcset="images/logo.webp"><img src="images/logo.png"></picture>';
    const marker = `<del class="${REMOVED_CLASSES} ${IMAGE_CLASS}">${picture}</del>`;

    expect(mark(`<p>${picture}</p>`, [IMAGE_CHARACTER])).toBe(`<p>${marker}</p>`);
  });

  it('gives an image covered by several ranges one marker with all their details', () => {
    const line = lineOf('<p>Logo <img src="images/logo-2026.svg" alt="Logo"></p>');
    const [imageRange] = rangesOf(line.text, [IMAGE_CHARACTER]);
    const ranges = [
      imageRange,
      { ...imageRange, detailIndices: [2] },
      { ...imageRange, detailIndices: [0] },
    ];
    const marker = `<ins class="${ADDED_CLASSES} ${IMAGE_CLASS}" data-diffwise-change-details="0 2">`;

    expect(markChanges(line, ranges, ADDED_TEXT_MARKER)).toBe(
      `<p>Logo ${marker}<img src="images/logo-2026.svg" alt="Logo"></ins></p>`,
    );
  });

  it('marks ranges given in any order', () => {
    const line = lineOf('<p>Opłata wynosi 19 zł i jest pobierana z góry.</p>');
    const ranges = rangesOf(line.text, ['19', 'góry']);

    expect(markChanges(line, [...ranges].reverse(), REMOVED_TEXT_MARKER)).toBe(
      markChanges(line, ranges, REMOVED_TEXT_MARKER),
    );
  });

  it('draws a changed list marker first in its item, with its text in an attribute and no details', () => {
    const drawnMarker = `<ins class="${ADDED_CLASSES} ${LIST_MARKER_CLASS}" data-diffwise-list-marker="6."></ins>`;

    expect(markItem('<ol start="6"><li>Import notes</li></ol>', CHANGED_LIST_MARKER)).toBe(
      `<ol start="6"><li value="6" ${LINE_ITEM}>${drawnMarker}Import notes</li></ol>`,
    );
  });

  it('draws a bullet before the paragraph of an item', () => {
    const drawnMarker = `<del class="${REMOVED_CLASSES} ${LIST_MARKER_CLASS}" data-diffwise-list-marker="•"></del>`;
    const html = '<ul><li><p>Notes</p></li></ul>';

    expect(markItem(html, CHANGED_LIST_MARKER, REMOVED_TEXT_MARKER)).toBe(
      `<ul><li value="1" ${LINE_ITEM}>${drawnMarker}<p>Notes</p></li></ul>`,
    );
  });

  it('draws no marker of a style it does not draw, in a later line of an item or without one', () => {
    const rareStyle = lineOf('<ol style="list-style-type: armenian"><li>Notes</li></ol>');
    const [, laterLine] = splitLines(parseHtml('<ol><li><p>A</p><p>B</p></li></ol>'), ID_PREFIX);
    const paragraph = lineOf('<p>Notes</p>');

    for (const line of [rareStyle, laterLine, paragraph]) {
      expect(markChanges(line, [], ADDED_TEXT_MARKER, CHANGED_LIST_MARKER)).toBe(line.html);
    }
  });

  it('frames a changed checkbox inside its label, with no details', () => {
    const html =
      '<ul><li><label><input type="checkbox" checked> Invite your family</label></li></ul>';
    const marked = fragmentOf(markItem(html, CHANGED_CHECKBOX));
    const checkboxMarker = marked.querySelector(CHECKBOX_MARKER_SELECTOR);

    expect(checkboxMarker?.className).toBe(`${ADDED_CLASSES} ${CHECKBOX_CLASS}`);
    expect(checkboxMarker?.hasAttribute(DETAILS_ATTRIBUTE)).toBe(false);
    expect(checkboxMarker?.parentElement?.localName).toBe('label');
    expect(checkboxMarker?.firstElementChild?.matches(CHECKBOX_SELECTOR)).toBe(true);
  });

  it('marks text, the list marker and the checkbox of a line together, keeping its text', () => {
    const line = lineOf('<ol start="2"><li><input type="checkbox"> Invite your family</li></ol>');
    const itemMarks = { listMarkerChanged: true, checkboxChanged: true };
    const marked = markChanges(line, rangesOf(line.text, ['family']), ADDED_TEXT_MARKER, itemMarks);
    const fragment = fragmentOf(marked);

    expect(fragment.querySelectorAll(`.${LIST_MARKER_CLASS}, .${CHECKBOX_CLASS}`).length).toBe(2);
    expect(readerText(fragment.childNodes)).toBe(line.text);
    expect(marked).toContain(added('family'));
  });
});

describe('markWholeTableLine', () => {
  it('gives every cell of a row the classes of the marker, also the place of a cell from above', () => {
    const html =
      '<table><tr><td rowspan="2">Free</td><td>0</td></tr><tr><th>1 GB</th></tr></table>';
    const [, row] = splitLines(parseHtml(html), ID_PREFIX);
    const marked = fragmentOf(markWholeTableLine(row, ADDED_TEXT_MARKER));

    expect(marked.querySelector(ROW_SELECTOR)?.outerHTML).toBe(
      `<tr><td data-diffwise-continued-cell="" class="${ADDED_CELL_CLASSES}"></td><th class="${ADDED_CELL_CLASSES}">1 GB</th></tr>`,
    );
  });

  it('keeps the classes a cell has and leaves the cells of a table inside a cell as they are', () => {
    const html =
      '<table><tr><td class="price"><table><tr><td>4</td></tr></table></td></tr></table>';
    const marked = markWholeTableLine(lineOf(html), REMOVED_TEXT_MARKER);

    expect(marked).toContain(
      `<td class="price ${REMOVED_CELL_CLASSES}"><table><tbody><tr><td>4</td>`,
    );
  });

  it('marks the whole text of a caption', () => {
    const caption = lineOf('<table><caption>Plans and <b>prices</b></caption></table>');

    expect(markWholeTableLine(caption, ADDED_TEXT_MARKER)).toBe(
      `<table data-diffwise-table-copy="" data-diffwise-first-table-line=""><caption>${added('Plans and ')}<b>${added('prices')}</b></caption></table>`,
    );
  });
});

describe('markWholeCells', () => {
  it('marks the cells at the positions, counting only the cells of the row itself', () => {
    const html =
      '<table><tr><td rowspan="2">Free</td><td>0</td></tr><tr><td>1 GB</td><td>2</td></tr></table>';
    const [, row] = splitLines(parseHtml(html), ID_PREFIX);
    const marked = fragmentOf(markWholeCells(row.html, [1], ADDED_TEXT_MARKER));

    expect(marked.querySelector(ROW_SELECTOR)?.outerHTML).toBe(
      `<tr><td data-diffwise-continued-cell=""></td><td>1 GB</td><td class="${ADDED_CELL_CLASSES}">2</td></tr>`,
    );
  });

  it('leaves the HTML as it is without positions', () => {
    const row = lineOf('<table><tr><td>Free</td></tr></table>');

    expect(markWholeCells(row.html, [], REMOVED_TEXT_MARKER)).toBe(row.html);
  });
});
