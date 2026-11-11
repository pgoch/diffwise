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
  it('finds no changes in identical documents', () => {
    const html = '<p>Serwis działa całą dobę.</p>';

    expect(summary(html, html)).toEqual([
      [LineChangeKind.Unchanged, 'Serwis działa całą dobę.', 'Serwis działa całą dobę.'],
    ]);
    expect(diff(html, html).stats).toEqual(NO_CHANGES);
  });

  it('pairs a line with a changed word as one changed line', () => {
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

  it('finds a paragraph added in the middle', () => {
    const oldHtml = '<p>Zasady ogólne.</p><p>Kontakt.</p>';
    const newHtml = '<p>Zasady ogólne.</p><p>Płatności.</p><p>Kontakt.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Zasady ogólne.', 'Zasady ogólne.'],
      [LineChangeKind.Added, null, 'Płatności.'],
      [LineChangeKind.Unchanged, 'Kontakt.', 'Kontakt.'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 1 });
  });

  it('finds a removed paragraph', () => {
    const oldHtml = '<p>Zasady ogólne.</p><p>Okres próbny.</p><p>Kontakt.</p>';
    const newHtml = '<p>Zasady ogólne.</p><p>Kontakt.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Zasady ogólne.', 'Zasady ogólne.'],
      [LineChangeKind.Removed, 'Okres próbny.', null],
      [LineChangeKind.Unchanged, 'Kontakt.', 'Kontakt.'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, removedLines: 1 });
  });

  it('shows swapped paragraphs as removed and added', () => {
    const oldHtml = '<p>Rejestracja.</p><p>Logowanie.</p>';
    const newHtml = '<p>Logowanie.</p><p>Rejestracja.</p>';

    expect(diff(oldHtml, newHtml).stats).toEqual({
      addedLines: 1,
      removedLines: 1,
      changedLines: 0,
    });
  });

  it('adds every line when the old document is empty', () => {
    const newHtml = '<p>Jeden.</p><p>Dwa.</p><p>Trzy.</p>';

    expect(summary('', newHtml)).toEqual([
      [LineChangeKind.Added, null, 'Jeden.'],
      [LineChangeKind.Added, null, 'Dwa.'],
      [LineChangeKind.Added, null, 'Trzy.'],
    ]);
    expect(diff('', newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 3 });
  });

  it('finds a change of letter case unless case is ignored', () => {
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

  it('finds an item added to a list and another removed from it', () => {
    const oldHtml = '<ul><li>Osobisty</li><li>Rodzinny</li><li>Firmowy</li></ul>';
    const newHtml = '<ul><li>Osobisty</li><li>Firmowy</li><li>Zespołowy</li></ul>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Osobisty', 'Osobisty'],
      [LineChangeKind.Removed, 'Rodzinny', null],
      [LineChangeKind.Unchanged, 'Firmowy', 'Firmowy'],
      [LineChangeKind.Added, null, 'Zespołowy'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 1, removedLines: 1 });
  });

  it('finds a change in a nested list only in its item', () => {
    const oldHtml = '<ul><li>Konta<ul><li>konto osobiste</li><li>konto firmowe</li></ul></li></ul>';
    const newHtml = '<ul><li>Konta<ul><li>konto prywatne</li><li>konto firmowe</li></ul></li></ul>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Konta', 'Konta'],
      [LineChangeKind.Changed, 'konto osobiste', 'konto prywatne'],
      [LineChangeKind.Unchanged, 'konto firmowe', 'konto firmowe'],
    ]);
  });

  it('finds no change in an item whose text got a paragraph around it', () => {
    const oldHtml = '<ol><li>Utwórz konto.</li><li>Zaloguj się.</li></ol>';
    const newHtml = '<ol><li><p>Utwórz konto.</p></li><li><p>Zaloguj się.</p></li></ol>';

    expect(diff(oldHtml, newHtml).stats).toEqual(NO_CHANGES);
  });

  it('finds no change in the numbers of items that an added item moved', () => {
    const oldHtml = '<ol><li>Utwórz konto.</li><li>Zaloguj się.</li></ol>';
    const newHtml = '<ol><li>Utwórz konto.</li><li>Potwierdź adres.</li><li>Zaloguj się.</li></ol>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Utwórz konto.', 'Utwórz konto.'],
      [LineChangeKind.Added, null, 'Potwierdź adres.'],
      [LineChangeKind.Unchanged, 'Zaloguj się.', 'Zaloguj się.'],
    ]);
  });

  it('counts an item with only another marker or checkbox as a changed line', () => {
    const oldHtml = '<ul><li>Notes</li><li><input type="checkbox"> Backups</li></ul>';
    const newHtml =
      '<ol><li>Notes</li></ol><ul><li><input type="checkbox" checked> Backups</li></ul>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Changed, 'Notes', 'Notes'],
      [LineChangeKind.Changed, 'Backups', 'Backups'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 2 });
  });

  it('counts a paragraph turned into a list item as changed, unless formatting is ignored', () => {
    const ignoreFormatting = { ...DEFAULT_DIFF_OPTIONS, ignoreFormatting: true };
    const oldHtml = '<p>Turn on backups.</p>';
    const newHtml = '<ul><li>Turn on backups.</li></ul>';

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreFormatting).stats).toEqual(NO_CHANGES);
  });

  it('finds a change of formatting or of a link in the same text', () => {
    const italicToBold = ['<p><i>Ważne:</i> chroń hasło.</p>', '<p><b>Ważne:</b> chroń hasło.</p>'];
    const otherAddress = [
      '<p><a href="/regulamin-2025">Regulamin</a></p>',
      '<p><a href="/regulamin-2026">Regulamin</a></p>',
    ];

    expect(summary(italicToBold[0], italicToBold[1])).toEqual([
      [LineChangeKind.Changed, 'Ważne: chroń hasło.', 'Ważne: chroń hasło.'],
    ]);
    expect(summary(otherAddress[0], otherAddress[1])).toEqual([
      [LineChangeKind.Changed, 'Regulamin', 'Regulamin'],
    ]);
  });

  it('finds no change in other markup of the same look or in the format of spaces', () => {
    const oldHtml =
      '<p><b>Ważne:</b> <em>chroń</em> <u>hasło</u>.</p><p><b>jeden</b> <b>dwa</b></p>';
    const newHtml =
      '<p><strong>Ważne:</strong> <i>chroń</i> <span style="text-decoration: underline">hasło</span>.</p><p><b>jeden dwa</b></p>';

    expect(diff(oldHtml, newHtml).stats).toEqual(NO_CHANGES);
  });

  it('ignores formatting and heading levels with ignoreFormatting', () => {
    const ignoreFormatting = { ...DEFAULT_DIFF_OPTIONS, ignoreFormatting: true };

    expect(diff('<h2>Cennik</h2>', '<h3>Cennik</h3>').stats).toEqual({
      ...NO_CHANGES,
      changedLines: 1,
    });
    expect(diff('<h2>Cennik</h2>', '<h3>Cennik</h3>', ignoreFormatting).stats).toEqual(NO_CHANGES);
    expect(diff('<p><i>Cennik</i></p>', '<h2>Cennik</h2>', ignoreFormatting).stats).toEqual(
      NO_CHANGES,
    );
  });

  it('ignores links added, removed or changed with ignoreLinkChanges', () => {
    const ignoreLinkChanges = { ...DEFAULT_DIFF_OPTIONS, ignoreLinkChanges: true };
    const oldHtml = '<p>Zobacz regulamin.</p>';
    const newHtml = '<p>Zobacz <a href="/regulamin">regulamin</a>.</p>';

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreLinkChanges).stats).toEqual(NO_CHANGES);
  });

  it('compares links within the document without the id prefixes of the versions', () => {
    const html = '<p>Dane są szyfrowane<a href="#note-1">1</a>.</p><p id="note-1">TLS 1.3.</p>';

    expect(diff(html, html).stats).toEqual(NO_CHANGES);
  });

  it('finds another file, size or alternative text of an image', () => {
    const logo = '<p><img src="images/logo-2025.svg" alt="Logo" width="160"></p>';
    const otherVersions = [
      '<p><img src="images/logo-2026.svg" alt="Logo" width="160"></p>',
      '<p><img src="images/logo-2025.svg" alt="Logo serwisu" width="160"></p>',
      '<p><img src="images/logo-2025.svg" alt="Logo" width="220"></p>',
    ];

    expect(diff(logo, logo).stats).toEqual(NO_CHANGES);

    for (const otherVersion of otherVersions) {
      expect(diff(logo, otherVersion).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    }
  });

  it('compares alternative texts in the case the options say', () => {
    const ignoreCase = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };
    const oldHtml = '<p><img src="images/logo-2025.svg" alt="Logo serwisu"></p>';
    const newHtml = '<p><img src="images/logo-2025.svg" alt="logo serwisu"></p>';

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreCase).stats).toEqual(NO_CHANGES);
  });

  it('finds a line with only an image added or removed', () => {
    const textHtml = '<p>Notatki synchronizują się w tle.</p>';
    const imageHtml = '<p><img src="images/sync-diagram.svg" alt="Synchronizacja"></p>';

    expect(diff(textHtml, textHtml + imageHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 1 });
    expect(diff(textHtml + imageHtml, textHtml).stats).toEqual({ ...NO_CHANGES, removedLines: 1 });
  });

  it('compares the rows of a table one by one, as lines', () => {
    const oldHtml =
      '<table><tr><td>Free</td><td>0</td></tr><tr><td>Personal</td><td>4</td></tr></table>';
    const newHtml =
      '<table><tr><td>Free</td><td>0</td></tr><tr><td>Personal</td><td>5</td></tr></table>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Free 0', 'Free 0'],
      [LineChangeKind.Changed, 'Personal 4', 'Personal 5'],
    ]);
  });

  it('finds text moved to another cell of a row, which keeps the text of the row', () => {
    const oldHtml = '<table><tr><td>Offline access</td><td>yes</td><td></td></tr></table>';
    const newHtml = '<table><tr><td>Offline access</td><td></td><td>yes</td></tr></table>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Changed, 'Offline access yes', 'Offline access yes'],
    ]);
  });

  it('finds two cells merged into one with the same text', () => {
    const oldHtml = '<table><tr><td>1 TB</td><td></td></tr></table>';
    const newHtml = '<table><tr><td colspan="2">1 TB</td></tr></table>';

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
  });

  it('compares the texts of cells as the options say', () => {
    const ignoreWhitespace = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };
    const oldHtml = '<table><tr><td>Storage</td><td>1 GB for notes and files</td></tr></table>';
    const newHtml = '<table><tr><td>Storage</td><td>1GB for notes and files</td></tr></table>';

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreWhitespace).stats).toEqual(NO_CHANGES);
  });
});
