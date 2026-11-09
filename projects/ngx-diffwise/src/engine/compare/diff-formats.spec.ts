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
  it('finds italic changed to bold (T16)', () => {
    expect(
      formatChanges('<p><i>Ważne:</i> chroń hasło.</p>', '<p><b>Ważne:</b> chroń hasło.</p>'),
    ).toEqual([['Ważne:', 'Ważne:', [formatting([TextStyle.Italic], [TextStyle.Bold])]]]);
  });

  it('joins words with the same change across the spaces between them (T17)', () => {
    const oldHtml = '<p>Szczegółowe warunki opisano niżej.</p>';
    const newHtml = '<p><b>Szczegółowe warunki</b> opisano niżej.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['Szczegółowe warunki', 'Szczegółowe warunki', [formatting([], [TextStyle.Bold])]],
    ]);
  });

  it('compares the formatting of unchanged words only (T18)', () => {
    const oldHtml = '<p><i>Uwaga:</i> jedno konto.</p>';
    const newHtml = '<p><b>Uwaga:</b> <b>trzy</b> konta.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['Uwaga:', 'Uwaga:', [formatting([TextStyle.Italic], [TextStyle.Bold])]],
    ]);
  });

  it('finds another address of a link (T19)', () => {
    const oldLink = 'https://example.com/regulamin-2025';
    const newLink = 'https://example.com/regulamin-2026';
    const oldHtml = `<p>Zasady są w <a href="${oldLink}">regulaminie</a>.</p>`;
    const newHtml = `<p>Zasady są w <a href="${newLink}">regulaminie</a>.</p>`;

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['regulaminie', 'regulaminie', [link(oldLink, newLink)]],
    ]);
  });

  it('finds no link change when only the text of a link changed (T20)', () => {
    const oldHtml = '<p>Zobacz <a href="/pomoc">pomocy</a>.</p>';
    const newHtml = '<p>Zobacz <a href="/pomoc">centrum pomocy</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([]);
  });

  it('finds a link added around unchanged text (T21)', () => {
    const oldHtml = '<p>Zobacz regulamin.</p>';
    const newHtml = '<p>Zobacz <a href="/regulamin">regulamin</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['regulamin', 'regulamin', [link(null, '/regulamin')]],
    ]);
  });

  it('describes each change of a line separately, for markers on both sides (T22)', () => {
    const oldHtml = '<p>Szczegółowe warunki są w <a href="/regulamin-2025">regulaminie</a>.</p>';
    const newHtml =
      '<p><b>Szczegółowe warunki</b> są w <a href="/regulamin-2026">regulaminie</a>.</p>';
    const { oldRanges, newRanges } = compareFormats(oldHtml, newHtml);

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['Szczegółowe warunki', 'Szczegółowe warunki', [formatting([], [TextStyle.Bold])]],
      ['regulaminie', 'regulaminie', [link('/regulamin-2025', '/regulamin-2026')]],
    ]);
    expect(oldRanges.map((range) => range.detailIndices)).toEqual([[0], [1]]);
    expect(newRanges.map((range) => range.detailIndices)).toEqual([[0], [1]]);
  });

  it('finds a changed heading level in the whole heading (T12)', () => {
    const headingChange = valueChange(FormattingValue.HeadingLevel, '2', '3');
    const paragraphChange = valueChange(FormattingValue.HeadingLevel, null, '2');

    expect(formatChanges('<h2>Plany i ceny</h2>', '<h3>Plany i ceny</h3>')).toEqual([
      ['Plany i ceny', 'Plany i ceny', [formatting([], [], [headingChange])]],
    ]);
    expect(formatChanges('<p>Plany i ceny</p>', '<h2>Plany i ceny</h2>')).toEqual([
      ['Plany i ceny', 'Plany i ceny', [formatting([], [], [paragraphChange])]],
    ]);
  });

  it('finds another text color', () => {
    const oldHtml = '<p>Tekst ma <span style="color: #c0392b">kolor</span>.</p>';
    const newHtml = '<p>Tekst ma <span style="color: #1e7d4f">kolor</span>.</p>';
    const colorChange = valueChange(
      FormattingValue.TextColor,
      'rgb(192, 57, 43)',
      'rgb(30, 125, 79)',
    );

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['kolor', 'kolor', [formatting([], [], [colorChange])]],
    ]);
  });

  it('marks only the part of a word whose format changed', () => {
    expect(
      formatChanges('<p>Przeczytaj regulamin.</p>', '<p>Przeczytaj <b>regu</b>lamin.</p>'),
    ).toEqual([['regu', 'regu', [formatting([], [TextStyle.Bold])]]]);
  });

  it('gives text a change of formatting and a change of link at once', () => {
    const oldHtml = '<p>Zobacz <b>regulamin</b>.</p>';
    const newHtml = '<p>Zobacz <a href="/regulamin">regulamin</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['regulamin', 'regulamin', [formatting([TextStyle.Bold], []), link(null, '/regulamin')]],
    ]);
  });

  it('joins words whose formats changed the same way, even from different formats', () => {
    const oldHtml = '<p><i>jeden</i> dwa trzy</p>';
    const newHtml = '<p><b><i>jeden</i> dwa</b> trzy</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['jeden dwa', 'jeden dwa', [formatting([], [TextStyle.Bold])]],
    ]);
  });

  it('does not join changes across changed text', () => {
    const oldHtml = '<p>jeden dwa trzy</p>';
    const newHtml = '<p><b>jeden</b> cztery <b>trzy</b></p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      ['jeden', 'jeden', [formatting([], [TextStyle.Bold])]],
      ['trzy', 'trzy', [formatting([], [TextStyle.Bold])]],
    ]);
  });

  it('finds no change in other markup of the same look or in the format of spaces', () => {
    const differentTags = [
      '<p><b>Ważne:</b> <em>chroń</em> hasło.</p>',
      '<p><strong>Ważne:</strong> <i>chroń</i> hasło.</p>',
    ] as const;
    const boldSpace = [
      '<p><b>jeden</b> <b>dwa</b> trzy</p>',
      '<p><b>jeden dwa </b>trzy</p>',
    ] as const;

    expect(formatChanges(...differentTags)).toEqual([]);
    expect(formatChanges(...boldSpace)).toEqual([]);
  });

  it('finds another link around an image, together with the words next to it', () => {
    const oldHtml = '<p><a href="/stara"><img src="logo.svg" alt="Logo"> Notatnik</a> Online</p>';
    const newHtml = '<p><a href="/nowa"><img src="logo.svg" alt="Logo"> Notatnik</a> Online</p>';
    const imageAndWord = `${IMAGE_CHARACTER} Notatnik`;

    expect(formatChanges(oldHtml, newHtml)).toEqual([
      [imageAndWord, imageAndWord, [link('/stara', '/nowa')]],
    ]);
  });

  it('compares links within the document without the id prefixes of the versions', () => {
    const oldHtml = '<p>Dane są szyfrowane<a href="#note-1">1</a>.</p>';
    const newHtml = '<p>Dane są zawsze szyfrowane<a href="#note-1">1</a>.</p>';

    expect(formatChanges(oldHtml, newHtml)).toEqual([]);
  });

  it('ignores formatting, links or both when the options say so', () => {
    const oldHtml = '<p>Zobacz <b>regulamin</b>.</p>';
    const newHtml = '<p>Zobacz <a href="/regulamin">regulamin</a>.</p>';

    expect(formatChanges(oldHtml, newHtml, IGNORE_FORMATTING)).toEqual([
      ['regulamin', 'regulamin', [link(null, '/regulamin')]],
    ]);
    expect(formatChanges(oldHtml, newHtml, IGNORE_LINK_CHANGES)).toEqual([
      ['regulamin', 'regulamin', [formatting([TextStyle.Bold], [])]],
    ]);
    expect(formatChanges(oldHtml, newHtml, IGNORE_BOTH)).toEqual([]);
  });
});
