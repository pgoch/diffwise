import { diffWords } from '../compare/diff-words';
import { ADDED_TEXT_MARKER, REMOVED_TEXT_MARKER } from '../mark/mark-changes';
import { DEFAULT_DIFF_OPTIONS, type Line, type WordChanges } from '../model';
import { markedTextHtml, mergedTextHtml, textHtml } from './text-line-html';
import { textLines } from './text-lines';

const TEMPLATE_TAG = 'template';
const ANY_ELEMENT = '*';
const REMOVED_START = '<del class="diffwise-diff__highlight diffwise-diff__highlight--removed"';
const ADDED_START = '<ins class="diffwise-diff__highlight diffwise-diff__highlight--added">';
const REPLACED_ATTRIBUTE = ' data-diffwise-replaced=""';
const HIDDEN_SPACE = '<span data-diffwise-hidden-space=""> </span>';

/** A space and a tab of changed text, which styles show as signs. */
const SPACE = '<span class="diffwise-diff__whitespace diffwise-diff__whitespace--space"> </span>';
const TAB = '<span class="diffwise-diff__whitespace diffwise-diff__whitespace--tab">\t</span>';

/** Expected HTML of removed text. */
function removed(html: string): string {
  return `${REMOVED_START}>${html}</del>`;
}

/** Expected HTML of removed text that added text replaces right after it. */
function replaced(html: string): string {
  return `${REMOVED_START}${REPLACED_ATTRIBUTE}>${html}</del>${HIDDEN_SPACE}`;
}

/** Expected HTML of added text. */
function added(html: string): string {
  return `${ADDED_START}${html}</ins>`;
}

/** The line of plain text, also an empty one. */
function textLine(text: string): Line {
  const [line] = textLines(`${text}\n`);
  return line;
}

/** HTML of the old line, the new line and the merged line of two lines compared word by word. */
function pairHtml(oldText: string, newText: string) {
  const oldLine = textLine(oldText);
  const newLine = textLine(newText);
  const wordChanges = diffWords(oldLine, newLine, DEFAULT_DIFF_OPTIONS);

  return {
    old: markedTextHtml(oldText, wordChanges.removed, REMOVED_TEXT_MARKER),
    new: markedTextHtml(newText, wordChanges.added, ADDED_TEXT_MARKER),
    merged: mergedTextHtml({ oldLine, newLine, wordChanges }),
  };
}

/** The text and the elements a browser makes of the HTML. */
function parsed(html: string) {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  const elements = Array.from(
    template.content.querySelectorAll(ANY_ELEMENT),
    (element) => element.localName,
  );

  return { text: template.content.textContent, elements };
}

describe('textHtml', () => {
  it('escapes the characters of markup and keeps the rest of the text', () => {
    expect(textHtml('<img src=x onerror="alert(1)"> & &lt; \'quotes\'')).toBe(
      '&lt;img src=x onerror="alert(1)"&gt; &amp; &amp;lt; \'quotes\'',
    );
  });

  it('gives HTML that a browser shows as the text itself, without elements', () => {
    const text = '<script>alert(1)</script> <b>bold</b> &amp; &#60; <!-- comment -->';

    expect(parsed(textHtml(text))).toEqual({ text, elements: [] });
  });
});

describe('markedTextHtml', () => {
  it('puts each range in a marker and escapes the text inside and outside the markers', () => {
    const ranges = [
      { start: 0, end: 3 },
      { start: 8, end: 11 },
    ];

    expect(markedTextHtml('<b> and <i>', ranges, REMOVED_TEXT_MARKER)).toBe(
      `${removed('&lt;b&gt;')} and ${removed('&lt;i&gt;')}`,
    );
  });

  it('shows each space and tab in a marker as a sign, and the others as they are', () => {
    const ranges = [{ start: 2, end: 8 }];

    expect(markedTextHtml('a  b\t\tc  d', ranges, ADDED_TEXT_MARKER)).toBe(
      `a ${added(`${SPACE}b${TAB}${TAB}c${SPACE}`)} d`,
    );
  });

  it('gives the escaped text without ranges', () => {
    expect(markedTextHtml('x < y', [], ADDED_TEXT_MARKER)).toBe('x &lt; y');
  });
});

describe('mergedTextHtml', () => {
  it('puts removed text before the added text that replaces it', () => {
    expect(pairHtml('The quick brown fox', 'The slow brown fox')).toEqual({
      old: `The ${removed('quick')} brown fox`,
      new: `The ${added('slow')} brown fox`,
      merged: `The ${replaced('quick')}${added('slow')} brown fox`,
    });
  });

  it('puts removed text between the words it stood between, with the space it had', () => {
    expect(pairHtml('one two three', 'one three').merged).toBe(`one ${removed('two')} three`);
  });

  it('puts a space before text removed from the end of a line', () => {
    expect(pairHtml('Click here', 'Click').merged).toBe(`Click ${removed('here')}`);
  });

  it('shows a changed indentation as the old indentation before the new one', () => {
    expect(pairHtml('  indented', '    indented')).toEqual({
      old: `${removed(`${SPACE}${SPACE}`)}indented`,
      new: `${added(`${SPACE}${SPACE}${SPACE}${SPACE}`)}indented`,
      merged: `${replaced(`${SPACE}${SPACE}`)}${added(`${SPACE}${SPACE}${SPACE}${SPACE}`)}indented`,
    });
  });

  it('shows a tab turned into spaces and spaces added at the end of a line', () => {
    expect(pairHtml('\tindented', '    indented').merged).toBe(
      `${replaced(TAB)}${added(`${SPACE}${SPACE}${SPACE}${SPACE}`)}indented`,
    );
    expect(pairHtml('end', 'end  ').merged).toBe(`end${added(`${SPACE}${SPACE}`)}`);
  });

  it('escapes the characters of markup in removed, added and unchanged text', () => {
    expect(pairHtml('a <b> & c', 'a <i> & c').merged).toBe(
      `a &lt;${replaced('b')}${added('i')}&gt; &amp; c`,
    );
  });

  it('cuts added text where removed text stands inside it', () => {
    const oldLine = textLine(' bar');
    const newLine = textLine('baz qux');
    const wordChanges: WordChanges = {
      removed: [{ start: 1, end: 4, newPosition: 4 }],
      added: [{ start: 0, end: 7 }],
    };

    expect(mergedTextHtml({ oldLine, newLine, wordChanges })).toBe(
      `${added(`baz${SPACE}`)}${removed('bar')}${added('qux')}`,
    );
  });

  it('shows the text of both lines in their order when a browser reads it', () => {
    const { merged } = pairHtml('Sync <every> 15 minutes', 'Sync <each> 30 minutes, also offline');

    expect(parsed(merged)).toEqual({
      text: 'Sync <every each> 15 30 minutes, also offline',
      elements: ['del', 'span', 'ins', 'del', 'span', 'ins', 'ins', 'span', 'span'],
    });
  });
});
