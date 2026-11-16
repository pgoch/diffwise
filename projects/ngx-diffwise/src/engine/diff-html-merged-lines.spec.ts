import { diffHtml } from './diff-html';
import { DEFAULT_DIFF_OPTIONS, type DiffOptions, LineChangeKind, type ViewRow } from './model';

const ID_PREFIX = 'diff';
const TEMPLATE_TAG = 'template';
const REMOVED = 'class="diffwise-diff__highlight diffwise-diff__highlight--removed"';
const REPLACED = `${REMOVED} data-diffwise-replaced=""`;
const HIDDEN_SPACE = '<span data-diffwise-hidden-space=""> </span>';
const ADDED = 'class="diffwise-diff__highlight diffwise-diff__highlight--added"';
const REMOVED_IMAGE =
  'class="diffwise-diff__highlight diffwise-diff__highlight--removed diffwise-diff__highlight--image"';
const ADDED_IMAGE =
  'class="diffwise-diff__highlight diffwise-diff__highlight--added diffwise-diff__highlight--image"';
const REMOVED_LIST_MARKER =
  'class="diffwise-diff__highlight diffwise-diff__highlight--removed diffwise-diff__highlight--list-marker"';
const ADDED_LIST_MARKER =
  'class="diffwise-diff__highlight diffwise-diff__highlight--added diffwise-diff__highlight--list-marker"';
const REMOVED_CHECKBOX =
  'class="diffwise-diff__highlight diffwise-diff__highlight--removed diffwise-diff__highlight--checkbox"';
const ADDED_CHECKBOX =
  'class="diffwise-diff__highlight diffwise-diff__highlight--added diffwise-diff__highlight--checkbox"';
const CHECKBOX_FRAMES_SELECTOR = 'label > .diffwise-diff__highlight--checkbox';
const CHECKED_ATTRIBUTE = 'checked';
const FIRST_DETAIL = 'data-diffwise-change-details="0"';
const ARROW = '<span class="diffwise-diff__image-change-arrow" aria-hidden="true"></span>';
const LINE_ITEM = 'data-diffwise-line-item=""';
const CONTINUED_ITEM = 'data-diffwise-continued-item=""';
const REMOVED_SELECTOR = '.diffwise-diff__highlight--removed';
const ID_SELECTOR = '[id]';
const UNSAFE_HTML = /onclick|javascript:|<script/i;
const IGNORE_WHITESPACE_AND_CASE: DiffOptions = {
  ...DEFAULT_DIFF_OPTIONS,
  ignoreWhitespace: true,
  ignoreCase: true,
};

/** Rows of two documents compared with merged lines. */
function compare(oldHtml: string, newHtml: string, options = DEFAULT_DIFF_OPTIONS): ViewRow[] {
  const settings = { options, idPrefix: ID_PREFIX, mergesChangedLines: true };
  return [...diffHtml(oldHtml, newHtml, settings).rows];
}

/** HTML of the merged line of each row; `null` for a row without one. */
function mergedLines(oldHtml: string, newHtml: string, options?: DiffOptions): (string | null)[] {
  return compare(oldHtml, newHtml, options).map((row) => row.mergedLine?.html ?? null);
}

/** HTML of the merged line of the only row of two one-line documents. */
function mergedLine(oldHtml: string, newHtml: string, options?: DiffOptions): string | null {
  return mergedLines(oldHtml, newHtml, options)[0];
}

function parsed(html: string | null): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html ?? '';

  return template.content;
}

describe('diffHtml with merged lines', () => {
  it('puts a replaced word before the word that replaces it', () => {
    expect(
      mergedLine(
        '<p>You can create one account today.</p>',
        '<p>You can create up to three accounts today.</p>',
      ),
    ).toBe(
      `<p>You can create <del ${REPLACED}>one account</del>${HIDDEN_SPACE}<ins ${ADDED}>up to three accounts</ins> today.</p>`,
    );
  });

  it('puts removed text where it stood, with a space on each side', () => {
    expect(
      mergedLine('<p>You can create one account today.</p>', '<p>You can create today.</p>'),
    ).toBe(`<p>You can create <del ${REMOVED}>one account</del> today.</p>`);
  });

  it('puts text removed from the start and from the end of a line there', () => {
    expect(mergedLine('<p>Old intro. The rest stays.</p>', '<p>The rest stays.</p>')).toBe(
      `<p><del ${REMOVED}>Old intro.</del> The rest stays.</p>`,
    );
    expect(mergedLine('<p>The rest stays. Old outro</p>', '<p>The rest stays.</p>')).toBe(
      `<p>The rest stays. <del ${REMOVED}>Old outro</del></p>`,
    );
  });

  it('puts a removed sentence after the full stop it slid behind', () => {
    expect(mergedLine('<p>First. Next one.</p>', '<p>First.</p>')).toBe(
      `<p>First. <del ${REMOVED}>Next one.</del></p>`,
    );
  });

  it('adds no space where the old line had none', () => {
    expect(mergedLine('<p>Call sync(force) twice.</p>', '<p>Call sync() twice.</p>')).toBe(
      `<p>Call sync(<del ${REMOVED}>force</del>) twice.</p>`,
    );
  });

  it('separates a removed character from the one that replaces it', () => {
    expect(mergedLine('<p>Hello, world</p>', '<p>Hello. world</p>')).toBe(
      `<p>Hello<del ${REPLACED}>,</del>${HIDDEN_SPACE}<ins ${ADDED}>.</ins> world</p>`,
    );
  });

  it('keeps only added text marked in a line that lost nothing', () => {
    expect(mergedLine('<p>Reply soon.</p>', '<p>Reply very soon.</p>')).toBe(
      `<p>Reply <ins ${ADDED}>very</ins> soon.</p>`,
    );
  });

  it('merges several changes of one line, each in its place', () => {
    expect(
      mergedLine(
        '<p>The fee is 19 USD and is charged in advance.</p>',
        '<p>The fee is 29 USD and is charged afterwards.</p>',
      ),
    ).toBe(
      `<p>The fee is <del ${REPLACED}>19</del>${HIDDEN_SPACE}<ins ${ADDED}>29</ins> USD and is charged <del ${REPLACED}>in advance</del>${HIDDEN_SPACE}<ins ${ADDED}>afterwards</ins>.</p>`,
    );
  });

  it('shows removed text in its own formatting, outside the formatting of the new text', () => {
    expect(
      mergedLine('<p>Pay <b>19 USD</b> a month now.</p>', '<p>Pay <i>29 EUR</i> a month now.</p>'),
    ).toBe(
      `<p>Pay <b><del ${REPLACED}>19 USD</del></b>${HIDDEN_SPACE}<i><ins ${ADDED}>29 EUR</ins></i> a month now.</p>`,
    );
  });

  it('keeps the formatting inside removed text that is formatted in part', () => {
    expect(mergedLine('<p>Text with <b>a bold</b> ending here</p>', '<p>Text here</p>')).toBe(
      `<p>Text <del ${REMOVED}>with </del><b><del ${REMOVED}>a bold</del></b><del ${REMOVED}> ending</del> here</p>`,
    );
  });

  it('shows a removed link as a link', () => {
    expect(
      mergedLine('<p>See <a href="/guide">the guide</a> first.</p>', '<p>See first.</p>'),
    ).toBe(`<p>See <a href="/guide"><del ${REMOVED}>the guide</del></a> first.</p>`);
  });

  it('puts text removed from inside a link into the link, without a link of its own', () => {
    expect(
      mergedLine(
        '<p>See <a href="/guide">the old long guide</a> now.</p>',
        '<p>See <a href="/guide">the guide</a> now.</p>',
      ),
    ).toBe(`<p>See <a href="/guide">the <del ${REMOVED}>old long</del> guide</a> now.</p>`);
  });

  it('gives removed text no ids', () => {
    const line = mergedLine(
      '<p>The plan has <b id="pricing">a price</b> and <a id="note" href="#pricing">a note</a> for every team.</p>',
      '<p>The plan has for every team.</p>',
    );
    const removedText = parsed(line).querySelectorAll(REMOVED_SELECTOR);

    expect(Array.from(removedText, (marker) => marker.textContent)).toEqual([
      'a price',
      ' and ',
      'a note',
    ]);
    expect(parsed(line).querySelector(ID_SELECTOR)).toBeNull();
  });

  it('frames a removed image', () => {
    expect(mergedLine('<p>Remove <img src="a.png" alt="A"> image</p>', '<p>Remove image</p>')).toBe(
      `<p>Remove <del ${REMOVED_IMAGE}><img src="a.png" alt="A"></del> image</p>`,
    );
  });

  it('shows a replaced image as the old and the new image with an arrow between them', () => {
    expect(
      mergedLine(
        '<p>Logo <img src="a.png" alt="A"> here</p>',
        '<p>Logo <img src="b.png" alt="A"> here</p>',
      ),
    ).toBe(
      `<p>Logo <del ${REMOVED_IMAGE} ${FIRST_DETAIL}><img src="a.png" alt="A"></del>${ARROW}<ins ${ADDED_IMAGE} ${FIRST_DETAIL}><img src="b.png" alt="A"></ins> here</p>`,
    );
  });

  it('shows an image with another alternative text as the old and the new image', () => {
    expect(
      mergedLine(
        '<p>Logo <img src="a.png" alt="A"> here</p>',
        '<p>Logo <img src="a.png" alt="B"> here</p>',
      ),
    ).toBe(
      `<p>Logo <del ${REMOVED_IMAGE} ${FIRST_DETAIL}><img src="a.png" alt="A"></del>${ARROW}<ins ${ADDED_IMAGE} ${FIRST_DETAIL}><img src="a.png" alt="B"></ins> here</p>`,
    );
  });

  it('puts removed text before a changed image that follows it', () => {
    expect(
      mergedLine(
        '<p>Old <img src="a.png" alt="A"> here</p>',
        '<p><img src="a.png" alt="B"> here</p>',
      ),
    ).toBe(
      `<p><del ${REMOVED}>Old</del> <del ${REMOVED_IMAGE} ${FIRST_DETAIL}><img src="a.png" alt="A"></del>${ARROW}<ins ${ADDED_IMAGE} ${FIRST_DETAIL}><img src="a.png" alt="B"></ins> here</p>`,
    );
  });

  it('shows changed formatting and a changed link as in the new line, with their details', () => {
    expect(
      mergedLine('<p>Some <i>marked words</i> here.</p>', '<p>Some <b>marked words</b> here.</p>'),
    ).toBe(`<p>Some <b><ins ${ADDED} ${FIRST_DETAIL}>marked words</ins></b> here.</p>`);
    expect(
      mergedLine(
        '<p>Go <a href="/old">to the page</a> now.</p>',
        '<p>Go <a href="/new">to the page</a> now.</p>',
      ),
    ).toBe(`<p>Go <a href="/new"><ins ${ADDED} ${FIRST_DETAIL}>to the page</ins></a> now.</p>`);
  });

  it('draws the old list marker inside the new one, which keeps it before the new one', () => {
    expect(mergedLine('<ul><li>First item</li></ul>', '<ol><li>First item</li></ol>')).toBe(
      `<ol><li value="1" ${LINE_ITEM}><ins ${ADDED_LIST_MARKER} data-diffwise-list-marker="1."><del ${REMOVED_LIST_MARKER} data-diffwise-list-marker="•"></del></ins>First item</li></ol>`,
    );
  });

  it('draws the old and the new number of a list item that only moved up', () => {
    const lines = mergedLines(
      '<ol><li>One</li><li>Two</li><li>Three here</li></ol>',
      '<ol><li>One</li><li>Three there</li></ol>',
    );

    expect(lines.at(-1)).toBe(
      `<ol><li value="2" ${LINE_ITEM}><ins ${ADDED_LIST_MARKER} data-diffwise-list-marker="2."><del ${REMOVED_LIST_MARKER} data-diffwise-list-marker="3."></del></ins>Three <del ${REPLACED}>here</del>${HIDDEN_SPACE}<ins ${ADDED}>there</ins></li></ol>`,
    );
  });

  it('draws the old state of a checked checkbox before the new one, each framed', () => {
    expect(
      mergedLine(
        '<ul><li><input type="checkbox"> Buy milk</li></ul>',
        '<ul><li><input type="checkbox" checked> Buy oat milk</li></ul>',
      ),
    ).toBe(
      `<ul><li value="1" ${LINE_ITEM}><del ${REMOVED_CHECKBOX}><input type="checkbox" disabled=""></del><ins ${ADDED_CHECKBOX}><input type="checkbox" checked="" disabled=""></ins> Buy <ins ${ADDED}>oat</ins> milk</li></ul>`,
    );
  });

  it('draws the old state of a cleared checkbox in its label, without the id of the new one', () => {
    const line = mergedLine(
      '<ul><li><label><input type="checkbox" id="milk" checked> Buy milk</label></li></ul>',
      '<ul><li><label><input type="checkbox" id="milk"> Buy milk</label></li></ul>',
    );
    const frames = Array.from(parsed(line).querySelectorAll(CHECKBOX_FRAMES_SELECTOR));
    const checkboxes = frames.map((frame) => frame.firstElementChild);

    expect(frames.map((frame) => frame.localName)).toEqual(['del', 'ins']);
    expect(checkboxes.map((checkbox) => checkbox?.hasAttribute(CHECKED_ATTRIBUTE))).toEqual([
      true,
      false,
    ]);
    expect(parsed(line).querySelectorAll(ID_SELECTOR)).toHaveLength(1);
    expect(checkboxes[1]?.matches(ID_SELECTOR)).toBe(true);
  });

  it('merges a line inside a quote and inside a nested list', () => {
    expect(
      mergedLine(
        '<blockquote><p>Quoted old text.</p></blockquote>',
        '<blockquote><p>Quoted new text.</p></blockquote>',
      ),
    ).toBe(
      `<blockquote><p>Quoted <del ${REPLACED}>old</del>${HIDDEN_SPACE}<ins ${ADDED}>new</ins> text.</p></blockquote>`,
    );
    expect(
      mergedLines(
        '<ul><li>Outer<ul><li>Inner old text</li></ul></li></ul>',
        '<ul><li>Outer<ul><li>Inner new text</li></ul></li></ul>',
      ).at(-1),
    ).toBe(
      `<ul><li value="1" ${CONTINUED_ITEM}><ul><li value="1" ${LINE_ITEM}>Inner <del ${REPLACED}>old</del>${HIDDEN_SPACE}<ins ${ADDED}>new</ins> text</li></ul></li></ul>`,
    );
  });

  it('merges a paragraph that became a heading as a heading', () => {
    expect(mergedLine('<p>Old title here</p>', '<h2>New title here</h2>')).toBe(
      `<h2><del ${REPLACED}>Old</del>${HIDDEN_SPACE}<ins ${ADDED}>New</ins> <ins ${ADDED} ${FIRST_DETAIL}>title here</ins></h2>`,
    );
  });

  it('leaves out differences that the options ignore', () => {
    expect(
      mergedLine(
        '<p>Keep   the  spaces and Case then</p>',
        '<p>Keep the spaces and case now</p>',
        IGNORE_WHITESPACE_AND_CASE,
      ),
    ).toBe(
      `<p>Keep the spaces and case <del ${REPLACED}>then</del>${HIDDEN_SPACE}<ins ${ADDED}>now</ins></p>`,
    );
  });

  it('sanitizes the merged line', () => {
    const line = mergedLine(
      '<p>A <span onclick="steal()">bad <a href="javascript:steal()">old</a></span> word</p>',
      '<p>A word</p>',
    );

    expect(line).not.toMatch(UNSAFE_HTML);
    expect(parsed(line).textContent).toBe('A bad old word');
  });

  it('merges only changed pairs', () => {
    const rows = compare(
      '<p>Stays.</p><p>Goes away.</p><p>Reply within 24 hours.</p>',
      '<p>Stays.</p><p>Reply within 48 hours.</p><p>Arrives.</p>',
    );

    expect(rows.map((row) => [row.kind, row.mergedLine !== null])).toEqual([
      [LineChangeKind.Unchanged, false],
      [LineChangeKind.Removed, false],
      [LineChangeKind.Changed, true],
      [LineChangeKind.Added, false],
    ]);
  });

  it('gives the merged line the kind and the number of the new line', () => {
    const [, row] = compare(
      '<p>Reply within 24 hours.</p>',
      '<p>Intro.</p><p>Reply within 48 hours.</p>',
    );

    expect(row.mergedLine).toEqual({ ...row.newLine, html: row.mergedLine?.html });
    expect(row.newLine?.number).toBe(2);
  });

  it('leaves a pair as two lines when removed text reaches from one block into another', () => {
    const [row] = compare(
      '<figure><img src="a.png" alt="A"><figcaption>Old caption</figcaption></figure>',
      '<figure><img src="b.png" alt="A"><figcaption>New caption</figcaption></figure>',
    );

    expect(row.kind).toBe(LineChangeKind.Changed);
    expect(row.mergedLine).toBeNull();
  });

  it('merges no lines unless the settings ask for it', () => {
    const settings = {
      options: DEFAULT_DIFF_OPTIONS,
      idPrefix: ID_PREFIX,
      mergesChangedLines: false,
    };
    const { rows } = diffHtml(
      '<p>Reply within 24 hours.</p>',
      '<p>Reply within 48 hours.</p>',
      settings,
    );

    expect(rows[0].mergedLine).toBeNull();
  });
});
