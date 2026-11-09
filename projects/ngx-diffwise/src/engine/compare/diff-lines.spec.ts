import { diffLines } from './diff-lines';
import { DEFAULT_DIFF_OPTIONS, type DiffOptions, LineChangeKind } from '../model';
import { parseHtml } from '../html/parse-html';
import { splitLines } from '../html/split-lines';

const NO_CHANGES = { addedLines: 0, removedLines: 0, changedLines: 0 };
const OLD_ID_PREFIX = 'diff-old-';
const NEW_ID_PREFIX = 'diff-new-';

function diff(oldHtml: string, newHtml: string, options: DiffOptions = DEFAULT_DIFF_OPTIONS) {
  const oldLines = splitLines(parseHtml(oldHtml), OLD_ID_PREFIX);
  const newLines = splitLines(parseHtml(newHtml), NEW_ID_PREFIX);

  return diffLines(oldLines, newLines, options);
}

/** Changes as `[kind, old text, new text]`; a missing side is `null`. */
function summary(oldHtml: string, newHtml: string, options?: DiffOptions) {
  return diff(oldHtml, newHtml, options).changes.map((change) => {
    switch (change.kind) {
      case LineChangeKind.Removed:
        return [change.kind, change.oldLine.text, null];
      case LineChangeKind.Added:
        return [change.kind, null, change.newLine.text];
      default:
        return [change.kind, change.oldLine.text, change.newLine.text];
    }
  });
}

describe('diffLines', () => {
  it('finds no changes in identical documents (T1)', () => {
    const html = '<p>Serwis działa całą dobę.</p>';

    expect(summary(html, html)).toEqual([
      [LineChangeKind.Unchanged, 'Serwis działa całą dobę.', 'Serwis działa całą dobę.'],
    ]);
    expect(diff(html, html).stats).toEqual(NO_CHANGES);
  });

  it('pairs a line with a changed word as one changed line (T2)', () => {
    const oldHtml = '<p>Konto można usunąć w ustawieniach.</p>';
    const newHtml = '<p>Konto można zamknąć w ustawieniach.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [
        LineChangeKind.Changed,
        'Konto można usunąć w ustawieniach.',
        'Konto można zamknąć w ustawieniach.',
      ],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
  });

  it('finds a paragraph added in the middle (T4)', () => {
    const oldHtml = '<p>Zasady ogólne.</p><p>Kontakt.</p>';
    const newHtml = '<p>Zasady ogólne.</p><p>Płatności.</p><p>Kontakt.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Zasady ogólne.', 'Zasady ogólne.'],
      [LineChangeKind.Added, null, 'Płatności.'],
      [LineChangeKind.Unchanged, 'Kontakt.', 'Kontakt.'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 1 });
  });

  it('finds a removed paragraph (T5)', () => {
    const oldHtml = '<p>Zasady ogólne.</p><p>Okres próbny.</p><p>Kontakt.</p>';
    const newHtml = '<p>Zasady ogólne.</p><p>Kontakt.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Zasady ogólne.', 'Zasady ogólne.'],
      [LineChangeKind.Removed, 'Okres próbny.', null],
      [LineChangeKind.Unchanged, 'Kontakt.', 'Kontakt.'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, removedLines: 1 });
  });

  it('shows swapped paragraphs as removed and added (T6)', () => {
    const oldHtml = '<p>Rejestracja.</p><p>Logowanie.</p>';
    const newHtml = '<p>Logowanie.</p><p>Rejestracja.</p>';

    expect(diff(oldHtml, newHtml).stats).toEqual({
      addedLines: 1,
      removedLines: 1,
      changedLines: 0,
    });
  });

  it('adds every line when the old document is empty (T7)', () => {
    const newHtml = '<p>Jeden.</p><p>Dwa.</p><p>Trzy.</p>';

    expect(summary('', newHtml)).toEqual([
      [LineChangeKind.Added, null, 'Jeden.'],
      [LineChangeKind.Added, null, 'Dwa.'],
      [LineChangeKind.Added, null, 'Trzy.'],
    ]);
    expect(diff('', newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 3 });
  });

  it('finds a change of letter case unless case is ignored (T9)', () => {
    const oldHtml = '<p>Konto Firmowe</p>';
    const newHtml = '<p>Konto firmowe</p>';
    const ignoreCase = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreCase).stats).toEqual(NO_CHANGES);
  });

  it('finds a change of whitespace in code unless whitespace is ignored', () => {
    const oldHtml = '<pre>let a  = 1;</pre>';
    const newHtml = '<pre>let a = 1;</pre>';
    const ignoreWhitespace = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreWhitespace).stats).toEqual(NO_CHANGES);
  });

  it('shows a paragraph turned into a heading as changed', () => {
    expect(summary('<p>Cennik</p>', '<h2>Cennik</h2>')).toEqual([
      [LineChangeKind.Changed, 'Cennik', 'Cennik'],
    ]);
  });
});
