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
    const html = '<p>The service runs day and night.</p>';

    expect(summary(html, html)).toEqual([
      [
        LineChangeKind.Unchanged,
        'The service runs day and night.',
        'The service runs day and night.',
      ],
    ]);
    expect(diff(html, html).stats).toEqual(NO_CHANGES);
  });

  it('pairs a line with a changed word as one changed line', () => {
    const oldHtml = '<p>You can delete the account in the settings.</p>';
    const newHtml = '<p>You can close the account in the settings.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [
        LineChangeKind.Changed,
        'You can delete the account in the settings.',
        'You can close the account in the settings.',
      ],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
  });

  it('finds a paragraph added in the middle', () => {
    const oldHtml = '<p>General rules.</p><p>Contact.</p>';
    const newHtml = '<p>General rules.</p><p>Payments.</p><p>Contact.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'General rules.', 'General rules.'],
      [LineChangeKind.Added, null, 'Payments.'],
      [LineChangeKind.Unchanged, 'Contact.', 'Contact.'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 1 });
  });

  it('finds a removed paragraph', () => {
    const oldHtml = '<p>General rules.</p><p>Trial period.</p><p>Contact.</p>';
    const newHtml = '<p>General rules.</p><p>Contact.</p>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'General rules.', 'General rules.'],
      [LineChangeKind.Removed, 'Trial period.', null],
      [LineChangeKind.Unchanged, 'Contact.', 'Contact.'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, removedLines: 1 });
  });

  it('shows swapped paragraphs as removed and added', () => {
    const oldHtml = '<p>Registration.</p><p>Login.</p>';
    const newHtml = '<p>Login.</p><p>Registration.</p>';

    expect(diff(oldHtml, newHtml).stats).toEqual({
      addedLines: 1,
      removedLines: 1,
      changedLines: 0,
    });
  });

  it('adds every line when the old document is empty', () => {
    const newHtml = '<p>One.</p><p>Two.</p><p>Three.</p>';

    expect(summary('', newHtml)).toEqual([
      [LineChangeKind.Added, null, 'One.'],
      [LineChangeKind.Added, null, 'Two.'],
      [LineChangeKind.Added, null, 'Three.'],
    ]);
    expect(diff('', newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 3 });
  });

  it('finds a change of letter case unless case is ignored', () => {
    const oldHtml = '<p>Business Account</p>';
    const newHtml = '<p>Business account</p>';
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
    expect(summary('<p>Pricing</p>', '<h2>Pricing</h2>')).toEqual([
      [LineChangeKind.Changed, 'Pricing', 'Pricing'],
    ]);
  });

  it('finds an item added to a list and another removed from it', () => {
    const oldHtml = '<ul><li>Personal</li><li>Family</li><li>Business</li></ul>';
    const newHtml = '<ul><li>Personal</li><li>Business</li><li>Team</li></ul>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Personal', 'Personal'],
      [LineChangeKind.Removed, 'Family', null],
      [LineChangeKind.Unchanged, 'Business', 'Business'],
      [LineChangeKind.Added, null, 'Team'],
    ]);
    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, addedLines: 1, removedLines: 1 });
  });

  it('finds a change in a nested list only in its item', () => {
    const oldHtml =
      '<ul><li>Accounts<ul><li>personal account</li><li>business account</li></ul></li></ul>';
    const newHtml =
      '<ul><li>Accounts<ul><li>private account</li><li>business account</li></ul></li></ul>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Accounts', 'Accounts'],
      [LineChangeKind.Changed, 'personal account', 'private account'],
      [LineChangeKind.Unchanged, 'business account', 'business account'],
    ]);
  });

  it('finds no change in an item whose text got a paragraph around it', () => {
    const oldHtml = '<ol><li>Create an account.</li><li>Sign in.</li></ol>';
    const newHtml = '<ol><li><p>Create an account.</p></li><li><p>Sign in.</p></li></ol>';

    expect(diff(oldHtml, newHtml).stats).toEqual(NO_CHANGES);
  });

  it('counts an item whose number an added item moved as a changed line', () => {
    const oldHtml = '<ol><li>Create an account.</li><li>Sign in.</li></ol>';
    const newHtml =
      '<ol><li>Create an account.</li><li>Confirm your address.</li><li>Sign in.</li></ol>';

    expect(summary(oldHtml, newHtml)).toEqual([
      [LineChangeKind.Unchanged, 'Create an account.', 'Create an account.'],
      [LineChangeKind.Added, null, 'Confirm your address.'],
      [LineChangeKind.Changed, 'Sign in.', 'Sign in.'],
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
    const italicToBold = [
      '<p><i>Important:</i> protect passwords.</p>',
      '<p><b>Important:</b> protect passwords.</p>',
    ];
    const otherAddress = [
      '<p><a href="/terms-2025">Terms</a></p>',
      '<p><a href="/terms-2026">Terms</a></p>',
    ];

    expect(summary(italicToBold[0], italicToBold[1])).toEqual([
      [LineChangeKind.Changed, 'Important: protect passwords.', 'Important: protect passwords.'],
    ]);
    expect(summary(otherAddress[0], otherAddress[1])).toEqual([
      [LineChangeKind.Changed, 'Terms', 'Terms'],
    ]);
  });

  it('finds no change in other markup of the same look or in the format of spaces', () => {
    const oldHtml =
      '<p><b>Important:</b> <em>protect</em> <u>passwords</u>.</p><p><b>one</b> <b>two</b></p>';
    const newHtml =
      '<p><strong>Important:</strong> <i>protect</i> <span style="text-decoration: underline">passwords</span>.</p><p><b>one two</b></p>';

    expect(diff(oldHtml, newHtml).stats).toEqual(NO_CHANGES);
  });

  it('ignores formatting and heading levels with ignoreFormatting', () => {
    const ignoreFormatting = { ...DEFAULT_DIFF_OPTIONS, ignoreFormatting: true };

    expect(diff('<h2>Pricing</h2>', '<h3>Pricing</h3>').stats).toEqual({
      ...NO_CHANGES,
      changedLines: 1,
    });
    expect(diff('<h2>Pricing</h2>', '<h3>Pricing</h3>', ignoreFormatting).stats).toEqual(
      NO_CHANGES,
    );
    expect(diff('<p><i>Pricing</i></p>', '<h2>Pricing</h2>', ignoreFormatting).stats).toEqual(
      NO_CHANGES,
    );
  });

  it('ignores links added, removed or changed with ignoreLinkChanges', () => {
    const ignoreLinkChanges = { ...DEFAULT_DIFF_OPTIONS, ignoreLinkChanges: true };
    const oldHtml = '<p>See the terms.</p>';
    const newHtml = '<p>See the <a href="/terms">terms</a>.</p>';

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreLinkChanges).stats).toEqual(NO_CHANGES);
  });

  it('compares links within the document without the id prefixes of the versions', () => {
    const html = '<p>Data is encrypted<a href="#note-1">1</a>.</p><p id="note-1">TLS 1.3.</p>';

    expect(diff(html, html).stats).toEqual(NO_CHANGES);
  });

  it('finds another file, size or alternative text of an image', () => {
    const logo = '<p><img src="images/logo-2025.svg" alt="Logo" width="160"></p>';
    const otherVersions = [
      '<p><img src="images/logo-2026.svg" alt="Logo" width="160"></p>',
      '<p><img src="images/logo-2025.svg" alt="Notebook logo" width="160"></p>',
      '<p><img src="images/logo-2025.svg" alt="Logo" width="220"></p>',
    ];

    expect(diff(logo, logo).stats).toEqual(NO_CHANGES);

    for (const otherVersion of otherVersions) {
      expect(diff(logo, otherVersion).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    }
  });

  it('compares alternative texts in the case the options say', () => {
    const ignoreCase = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };
    const oldHtml = '<p><img src="images/logo-2025.svg" alt="Notebook logo"></p>';
    const newHtml = '<p><img src="images/logo-2025.svg" alt="notebook logo"></p>';

    expect(diff(oldHtml, newHtml).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
    expect(diff(oldHtml, newHtml, ignoreCase).stats).toEqual(NO_CHANGES);
  });

  it('finds a line with only an image added or removed', () => {
    const textHtml = '<p>Notes sync in the background.</p>';
    const imageHtml = '<p><img src="images/sync-diagram.svg" alt="Sync"></p>';

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
