import { diffHtml } from './diff-html';
import type * as SanitizeHtmlModule from './html/sanitize-html';
import { sanitizeHtmlPieces } from './html/sanitize-html';
import { DEFAULT_DIFF_OPTIONS, LineChangeKind, type ViewLine, type ViewRow } from './model';

vi.mock('./html/sanitize-html', async (importOriginal) => {
  const original = await importOriginal<typeof SanitizeHtmlModule>();

  return { ...original, sanitizeHtmlPieces: vi.fn(original.sanitizeHtmlPieces) };
});

const ID_PREFIX = 'diff';
const TEMPLATE_TAG = 'template';
const NO_TEXT = '';
const FIRST_TEXT = 'The first paragraph stays the same.';
const LAST_TEXT = 'The last paragraph stays the same.';
const OLD_TEXT = 'The middle paragraph has old words.';
const NEW_TEXT = 'The middle paragraph has new words.';
const CHANGED_PARAGRAPH_START = 'The middle paragraph';
const CELL_TEXT = 'A cell that stays the same.';
const TABLE = `<table><tbody><tr><td>${CELL_TEXT}</td></tr></tbody></table>`;

/** Lines of the changed pair cleaned again with merged lines: the old, the new and the merged one. */
const CHANGED_PAIR_LINES_WITH_MERGED_LINE = 3;

/**
 * Known ways to slip script past a sanitizer, many of them mutation XSS: HTML that a parser reads
 * one way when it is cleaned and another way when the cleaned HTML is read again.
 */
const ATTACKS = [
  { name: 'an event handler', html: '<img src="x" onerror="alert(1)">' },
  { name: 'a javascript: link', html: '<a href="javascript:alert(1)">link</a>' },
  {
    name: 'a javascript: link with character references',
    html: '<a href="&#106;avascript&#58;alert(1)">link</a>',
  },
  { name: 'an event handler in SVG', html: '<svg><g onload="alert(1)"></g></svg>' },
  {
    name: 'a javascript: link in SVG',
    html: '<svg><a xlink:href="javascript:alert(1)"><text x="0" y="10">link</text></a></svg>',
  },
  {
    name: 'an SVG animation that runs script',
    html: '<svg><animate onbegin="alert(1)" attributeName="x" dur="1s"></animate></svg>',
  },
  {
    name: 'a style element in MathML',
    html: '<math><mtext><table><mglyph><style><img src="x" onerror="alert(1)">',
  },
  {
    name: 'a style element closed inside an attribute',
    html: '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
  },
  {
    name: 'forms nested in MathML',
    html: '<form><math><mtext></form><form><mglyph><svg><mtext><style><path id="</style><img onerror=alert(1) src>">',
  },
  {
    name: 'noscript closed inside an attribute',
    html: '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript>',
  },
  { name: 'markup in a comment', html: '<p><!--<img src=x onerror=alert(1)>--> text</p>' },
  {
    name: 'markup in a text area',
    html: '<p><textarea><img src=x onerror=alert(1)></textarea></p>',
  },
  {
    name: 'a frame with a document of its own',
    html: '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  },
  { name: 'an object that runs script', html: '<object data="javascript:alert(1)"></object>' },
  {
    name: 'a style that loads script',
    html: '<p style="background-image: url(javascript:alert(1))">text</p>',
  },
  {
    name: 'a handler of an opened details element',
    html: '<details open ontoggle="alert(1)"><summary>more</summary></details>',
  },
  {
    name: 'names that clobber the document',
    html: '<p><img name="getElementById"><a id="cookie" name="cookie">link</a></p>',
  },
];

/** Settings of a comparison with the default options. */
function settingsOf(mergesChangedLines: boolean) {
  return {
    options: DEFAULT_DIFF_OPTIONS,
    idPrefix: ID_PREFIX,
    mergesChangedLines,
    marksAllWhitespace: false,
  };
}

/** The text of a piece of HTML. */
function textOf(html: string): string {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content.textContent ?? NO_TEXT;
}

/** Texts of the pieces of HTML that the diff cleaned again since the last reset. */
function textsCleanedAgain(): string[] {
  return vi.mocked(sanitizeHtmlPieces).mock.calls.flatMap(([pieces]) => pieces.map(textOf));
}

/** True for an unchanged row whose two lines are not lines of a table. */
function isUnchangedOutsideTables({ kind, oldLine, newLine }: ViewRow): boolean {
  return kind === LineChangeKind.Unchanged && oldLine?.table === null && newLine?.table === null;
}

/** True when the line is there. */
function isLine(line: ViewLine | null): line is ViewLine {
  return line !== null;
}

/** HTML of both lines of every unchanged row outside tables. */
function unchangedHtmlOutsideTables(rows: readonly ViewRow[]): string[] {
  return rows
    .filter(isUnchangedOutsideTables)
    .flatMap(({ oldLine, newLine }) => [oldLine, newLine])
    .filter(isLine)
    .map(({ html }) => html);
}

/** Two versions around one changed paragraph: the same `middle` part and a table in both. */
function versionsAround(middle: string): [string, string] {
  const before = `<p>${FIRST_TEXT}</p>${middle}<p>${OLD_TEXT}</p>${TABLE}<p>${LAST_TEXT}</p>`;
  const after = `<p>${FIRST_TEXT}</p>${middle}<p>${NEW_TEXT}</p>${TABLE}<p>${LAST_TEXT}</p>`;

  return [before, after];
}

describe('diffHtml cleaning the lines again', () => {
  beforeEach(() => {
    vi.mocked(sanitizeHtmlPieces).mockClear();
  });

  it('cleans again the lines it marks and the lines of tables, not unchanged lines', () => {
    const [before, after] = versionsAround(NO_TEXT);

    diffHtml(before, after, settingsOf(false));

    const texts = textsCleanedAgain();
    const changedPairTexts = texts.filter((text) => text.startsWith(CHANGED_PARAGRAPH_START));

    expect(changedPairTexts).toEqual([OLD_TEXT, NEW_TEXT]);
    expect(texts.some((text) => text.includes(CELL_TEXT))).toBe(true);
    expect(texts).not.toContain(FIRST_TEXT);
    expect(texts).not.toContain(LAST_TEXT);
  });

  it('cleans again the merged line of a changed pair', () => {
    const [before, after] = versionsAround(NO_TEXT);

    diffHtml(before, after, settingsOf(true));

    const texts = textsCleanedAgain();
    const changedPairTexts = texts.filter((text) => text.startsWith(CHANGED_PARAGRAPH_START));

    expect(changedPairTexts).toHaveLength(CHANGED_PAIR_LINES_WITH_MERGED_LINE);
    expect(texts).not.toContain(FIRST_TEXT);
  });

  it('keeps the text of a customized built-in element in a line it cleans again', () => {
    const added = '<p is="my-paragraph">An added paragraph.</p>';
    const table =
      '<table><tbody><tr><td><span is="my-span">A cell.</span></td></tr></tbody></table>';
    const { rows } = diffHtml(
      `${table}<p>${FIRST_TEXT}</p>`,
      `${table}<p>${FIRST_TEXT}</p>${added}`,
      settingsOf(false),
    );
    const newTexts = rows.map(({ newLine }) => textOf(newLine?.html ?? NO_TEXT));

    expect(newTexts).toContain('An added paragraph.');
    expect(newTexts.some((text) => text.includes('A cell.'))).toBe(true);
  });

  it.each(ATTACKS)('needs no second cleaning of unchanged lines with $name', ({ html }) => {
    const [before, after] = versionsAround(html);

    for (const mergesChangedLines of [false, true]) {
      const { rows } = diffHtml(before, after, settingsOf(mergesChangedLines));
      const unchangedHtml = unchangedHtmlOutsideTables(rows);

      expect(unchangedHtml.length).toBeGreaterThan(0);
      expect(sanitizeHtmlPieces(unchangedHtml)).toEqual(unchangedHtml);
    }
  });
});
