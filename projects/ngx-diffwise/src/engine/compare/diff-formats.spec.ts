import { diffFormats } from './diff-formats';
import { diffWords } from './diff-words';
import { parseHtml } from '../html/parse-html';
import { IMAGE_CHARACTER } from '../html/reader-text';
import { splitLines } from '../html/split-lines';
import {
  ChangeDetailKind,
  DEFAULT_DIFF_OPTIONS,
  type DiffOptions,
  type FormattingChangeDetail,
  FormattingValue,
  type FormattingValueChange,
  type Line,
  type LinkChangeDetail,
  type TextRange,
  TextStyle,
} from '../model';

const OLD_ID_PREFIX = 'diff-old-';
const NEW_ID_PREFIX = 'diff-new-';
const IGNORE_FORMATTING: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreFormatting: true };
const IGNORE_LINK_CHANGES: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreLinkChanges: true };
const IGNORE_BOTH: DiffOptions = { ...IGNORE_FORMATTING, ignoreLinkChanges: true };

/** Compares the formats of the first lines of two documents, whose ids get different prefixes. */
function compareFormats(
  oldHtml: string,
  newHtml: string,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
) {
  const [oldLine] = splitLines(parseHtml(oldHtml), OLD_ID_PREFIX);
  const [newLine] = splitLines(parseHtml(newHtml), NEW_ID_PREFIX);
  const wordChanges = diffWords(oldLine, newLine, options);
  const formatChanges = diffFormats(oldLine, newLine, wordChanges, options);

  return { oldLine, newLine, ...formatChanges };
}

/** Changes as `[old text, new text, details]`. */
function formatChanges(oldHtml: string, newHtml: string, options?: DiffOptions) {
  const { oldLine, newLine, oldRanges, newRanges, details } = compareFormats(
    oldHtml,
    newHtml,
    options,
  );

  return oldRanges.map((oldRange, index) => [
    textOf(oldLine, oldRange),
    textOf(newLine, newRanges[index]),
    oldRange.detailIndices?.map((detailIndex) => details[detailIndex]),
  ]);
}

function textOf(line: Line, range: TextRange): string {
  return line.text.slice(range.start, range.end);
}

function formatting(
  removedStyles: TextStyle[],
  addedStyles: TextStyle[],
  changedValues: FormattingValueChange[] = [],
): FormattingChangeDetail {
  return { kind: ChangeDetailKind.Formatting, removedStyles, addedStyles, changedValues };
}

function valueChange(
  name: FormattingValue,
  oldValue: string | null,
  newValue: string | null,
): FormattingValueChange {
  return { name, oldValue, newValue };
}

function link(oldLink: string | null, newLink: string | null): LinkChangeDetail {
  return { kind: ChangeDetailKind.Link, oldLink, newLink };
}

describe('diffFormats', () => {
  it('finds italic changed to bold', () => {
    expect(
      formatChanges(
        '<p><i>Important:</i> protect passwords.</p>',
        '<p><b>Important:</b> protect passwords.</p>',
      ),
    ).toEqual([['Important:', 'Important:', [formatting([TextStyle.Italic], [TextStyle.Bold])]]]);
  });

  it('joins words with the same change across the spaces between them', () => {
    const oldHtml = '<p>Detailed rules are described below.</p>';
    const newHtml = '<p><b>Detailed rules</b> are described below.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['Detailed rules', 'Detailed rules', [formatting([], [TextStyle.Bold])]],
    ]);
  });

  it('compares the formatting of unchanged words only', () => {
    const oldHtml = '<p><i>Note:</i> one account.</p>';
    const newHtml = '<p><b>Note:</b> <b>three</b> accounts.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['Note:', 'Note:', [formatting([TextStyle.Italic], [TextStyle.Bold])]],
    ]);
  });

  it('finds another address of a link', () => {
    const oldLink = 'https://example.com/terms-2025';
    const newLink = 'https://example.com/terms-2026';
    const oldHtml = `<p>The rules are in the <a href="${oldLink}">terms</a>.</p>`;
    const newHtml = `<p>The rules are in the <a href="${newLink}">terms</a>.</p>`;

    expect(formatChanges(oldHtml, newHtml)).toEqual([['terms', 'terms', [link(oldLink, newLink)]]]);
  });

  it('finds no link change when only the text of a link changed', () => {
    const oldHtml = '<p>See the <a href="/help">help</a>.</p>';
    const newHtml = '<p>See the <a href="/help">help center</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([]);
  });

  it('finds a link added around unchanged text', () => {
    const oldHtml = '<p>See the terms.</p>';
    const newHtml = '<p>See the <a href="/terms">terms</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([['terms', 'terms', [link(null, '/terms')]]]);
  });

  it('describes each change of a line separately, for markers on both sides', () => {
    const oldHtml = '<p>Detailed rules are in the <a href="/terms-2025">terms</a>.</p>';
    const newHtml = '<p><b>Detailed rules</b> are in the <a href="/terms-2026">terms</a>.</p>';
    const { oldRanges, newRanges } = compareFormats(oldHtml, newHtml);

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['Detailed rules', 'Detailed rules', [formatting([], [TextStyle.Bold])]],
      ['terms', 'terms', [link('/terms-2025', '/terms-2026')]],
    ]);
    expect(oldRanges.map((range) => range.detailIndices)).toEqual([[0], [1]]);
    expect(newRanges.map((range) => range.detailIndices)).toEqual([[0], [1]]);
  });

  it('finds a changed heading level in the whole heading', () => {
    const headingChange = valueChange(FormattingValue.HeadingLevel, '2', '3');
    const paragraphChange = valueChange(FormattingValue.HeadingLevel, null, '2');

    expect(formatChanges('<h2>Plans and prices</h2>', '<h3>Plans and prices</h3>')).toEqual([
      ['Plans and prices', 'Plans and prices', [formatting([], [], [headingChange])]],
    ]);
    expect(formatChanges('<p>Plans and prices</p>', '<h2>Plans and prices</h2>')).toEqual([
      ['Plans and prices', 'Plans and prices', [formatting([], [], [paragraphChange])]],
    ]);
  });

  it('finds another text color', () => {
    const oldHtml = '<p>The text has <span style="color: #c0392b">color</span>.</p>';
    const newHtml = '<p>The text has <span style="color: #1e7d4f">color</span>.</p>';
    const colorChange = valueChange(
      FormattingValue.TextColor,
      'rgb(192, 57, 43)',
      'rgb(30, 125, 79)',
    );

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['color', 'color', [formatting([], [], [colorChange])]],
    ]);
  });

  it('marks only the part of a word whose format changed', () => {
    expect(formatChanges('<p>Read the terms.</p>', '<p>Read the <b>ter</b>ms.</p>')).toEqual([
      ['ter', 'ter', [formatting([], [TextStyle.Bold])]],
    ]);
  });

  it('gives text a change of formatting and a change of link at once', () => {
    const oldHtml = '<p>See the <b>terms</b>.</p>';
    const newHtml = '<p>See the <a href="/terms">terms</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['terms', 'terms', [formatting([TextStyle.Bold], []), link(null, '/terms')]],
    ]);
  });

  it('joins words whose formats changed the same way, even from different formats', () => {
    const oldHtml = '<p><i>one</i> two three</p>';
    const newHtml = '<p><b><i>one</i> two</b> three</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['one two', 'one two', [formatting([], [TextStyle.Bold])]],
    ]);
  });

  it('does not join changes across changed text', () => {
    const oldHtml = '<p>one two three</p>';
    const newHtml = '<p><b>one</b> four <b>three</b></p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['one', 'one', [formatting([], [TextStyle.Bold])]],
      ['three', 'three', [formatting([], [TextStyle.Bold])]],
    ]);
  });

  it('finds no change in other markup of the same look or in the format of spaces', () => {
    const differentTags = [
      '<p><b>Important:</b> <em>protect</em> passwords.</p>',
      '<p><strong>Important:</strong> <i>protect</i> passwords.</p>',
    ] as const;
    const boldSpace = [
      '<p><b>one</b> <b>two</b> three</p>',
      '<p><b>one two </b>three</p>',
    ] as const;

    expect(formatChanges(...differentTags)).toEqual([]);
    expect(formatChanges(...boldSpace)).toEqual([]);
  });

  it('finds another link around an image, together with the words next to it', () => {
    const oldHtml = '<p><a href="/old"><img src="logo.svg" alt="Logo"> Notebook</a> Online</p>';
    const newHtml = '<p><a href="/new"><img src="logo.svg" alt="Logo"> Notebook</a> Online</p>';
    const imageAndWord = `${IMAGE_CHARACTER} Notebook`;

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      [imageAndWord, imageAndWord, [link('/old', '/new')]],
    ]);
  });

  it('compares links within the document without the id prefixes of the versions', () => {
    const oldHtml = '<p>Data is encrypted<a href="#note-1">1</a>.</p>';
    const newHtml = '<p>Data is always encrypted<a href="#note-1">1</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([]);
  });

  it('ignores formatting, links or both when the options say so', () => {
    const oldHtml = '<p>See the <b>terms</b>.</p>';
    const newHtml = '<p>See the <a href="/terms">terms</a>.</p>';

    expect(formatChanges(oldHtml, newHtml, IGNORE_FORMATTING)).toEqual([
      ['terms', 'terms', [link(null, '/terms')]],
    ]);
    expect(formatChanges(oldHtml, newHtml, IGNORE_LINK_CHANGES)).toEqual([
      ['terms', 'terms', [formatting([TextStyle.Bold], [])]],
    ]);
    expect(formatChanges(oldHtml, newHtml, IGNORE_BOTH)).toEqual([]);
  });
});
