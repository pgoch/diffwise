import enLongAfter from '../../../../test-data/text/en/long/after.txt?raw';
import enLongBefore from '../../../../test-data/text/en/long/before.txt?raw';
import enMediumAfter from '../../../../test-data/text/en/medium/after.txt?raw';
import enMediumBefore from '../../../../test-data/text/en/medium/before.txt?raw';
import enShortAfter from '../../../../test-data/text/en/short/after.txt?raw';
import enShortBefore from '../../../../test-data/text/en/short/before.txt?raw';
import plLongAfter from '../../../../test-data/text/pl/long/after.txt?raw';
import plLongBefore from '../../../../test-data/text/pl/long/before.txt?raw';
import plMediumAfter from '../../../../test-data/text/pl/medium/after.txt?raw';
import plMediumBefore from '../../../../test-data/text/pl/medium/before.txt?raw';
import plShortAfter from '../../../../test-data/text/pl/short/after.txt?raw';
import plShortBefore from '../../../../test-data/text/pl/short/before.txt?raw';
import { diffText } from './diff-text';
import {
  type Comparison,
  DEFAULT_DIFF_OPTIONS,
  type DiffOptions,
  type DiffStats,
  LineChangeKind,
  LineKind,
  type ViewLine,
  type ViewRow,
} from './model';

const NO_TEXT = '';
const TEMPLATE_TAG = 'template';
const ID_PREFIX = 'diff';
const NO_CHANGES = { addedLines: 0, removedLines: 0, changedLines: 0 };
const REMOVED_SELECTOR = 'del.diffwise-diff__highlight--removed';
const ADDED_SELECTOR = 'ins.diffwise-diff__highlight--added';
const SPACE_SIGN_SELECTOR = '.diffwise-diff__whitespace--space';
const TAB_SIGN_SELECTOR = '.diffwise-diff__whitespace--tab';
const ANY_ELEMENT_SELECTOR = '*';
const MARKER_ELEMENTS = new Set(['del', 'ins', 'span']);
const LINE_END = /\r\n|\r|\n/;
const IGNORE_WHITESPACE: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };
const IGNORE_CASE: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };
const IGNORE_BLANK_LINES: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreBlankLines: true };

const SHORT = 'short';
const MEDIUM = 'medium';
const LONG = 'long';

/** Sample pairs from `test-data/text/`. */
const SAMPLES = [
  { language: 'en', size: SHORT, before: enShortBefore, after: enShortAfter },
  { language: 'en', size: MEDIUM, before: enMediumBefore, after: enMediumAfter },
  { language: 'en', size: LONG, before: enLongBefore, after: enLongAfter },
  { language: 'pl', size: SHORT, before: plShortBefore, after: plShortAfter },
  { language: 'pl', size: MEDIUM, before: plMediumBefore, after: plMediumAfter },
  { language: 'pl', size: LONG, before: plLongBefore, after: plLongAfter },
];

/** Changes in each sample size, the same in every language. */
const SAMPLE_STATS: Readonly<Record<string, DiffStats>> = {
  [SHORT]: { addedLines: 1, removedLines: 0, changedLines: 4 },
  [MEDIUM]: { addedLines: 8, removedLines: 1, changedLines: 9 },
  [LONG]: { addedLines: 13, removedLines: 2, changedLines: 22 },
};

function compare(
  oldText: string,
  newText: string,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
  mergesChangedLines = false,
  marksAllWhitespace = false,
): Comparison {
  const settings = { options, idPrefix: ID_PREFIX, mergesChangedLines, marksAllWhitespace };
  return diffText(oldText, newText, settings);
}

/** The content a browser makes of the HTML of a line. */
function parsedLine(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content;
}

/** The text a browser shows for a line; `null` for no line. */
function shownText(line: ViewLine | null): string | null {
  return line === null ? null : parsedLine(line.html).textContent;
}

/** Rows as `[kind, old number, new number, old text, new text]`; a missing line is `null`. */
function summary(oldText: string, newText: string, options?: DiffOptions) {
  return compare(oldText, newText, options).rows.map((row) => [
    row.kind,
    row.oldLine?.number ?? null,
    row.newLine?.number ?? null,
    shownText(row.oldLine),
    shownText(row.newLine),
  ]);
}

/** Texts of the markers in a line. */
function markerTexts(line: ViewLine | null, selector: string): string[] {
  const markers = line === null ? [] : Array.from(parsedLine(line.html).querySelectorAll(selector));
  return markers.map((marker) => marker.textContent ?? NO_TEXT);
}

/** Removed text of the old line and added text of the new line, row by row. */
function changedTexts(oldText: string, newText: string, options?: DiffOptions) {
  return compare(oldText, newText, options).rows.map((row) => ({
    removed: markerTexts(row.oldLine, REMOVED_SELECTOR),
    added: markerTexts(row.newLine, ADDED_SELECTOR),
  }));
}

/** Signs of spaces and tabs in a line. */
function signCounts(line: ViewLine | null) {
  const content = parsedLine(line?.html ?? NO_TEXT);
  const spaces = content.querySelectorAll(SPACE_SIGN_SELECTOR).length;
  const tabs = content.querySelectorAll(TAB_SIGN_SELECTOR).length;

  return { spaces, tabs };
}

/** Lines of a text as a file has them: without the line end at the end of the text. */
function linesOf(text: string): string[] {
  const lines = text.split(LINE_END);

  return lines.at(-1)?.length === 0 ? lines.slice(0, -1) : lines;
}

describe('diffText', () => {
  it('finds no changes in identical texts, whatever their line ends', () => {
    const { rows, stats } = compare('first\nsecond\n', 'first\r\nsecond');

    expect(rows.map((row) => row.kind)).toEqual([
      LineChangeKind.Unchanged,
      LineChangeKind.Unchanged,
    ]);
    expect(stats).toEqual(NO_CHANGES);
  });

  it('numbers the lines of each version from 1, empty lines too', () => {
    expect(summary('first\n\nthird', 'first\n\nnew line\nthird')).toEqual([
      [LineChangeKind.Unchanged, 1, 1, 'first', 'first'],
      [LineChangeKind.Unchanged, 2, 2, '', ''],
      [LineChangeKind.Added, null, 3, null, 'new line'],
      [LineChangeKind.Unchanged, 3, 4, 'third', 'third'],
    ]);
  });

  it('shows each line as a paragraph outside tables, without change details', () => {
    const [row] = compare('Sync runs hourly.', 'Sync runs daily.').rows;

    expect(row.oldLine?.kind).toBe(LineKind.Paragraph);
    expect(row.newLine?.table).toBeNull();
    expect(row.changeDetails).toEqual([]);
  });

  it('adds or removes every line next to an empty text', () => {
    expect(summary('', 'one\ntwo')).toEqual([
      [LineChangeKind.Added, null, 1, null, 'one'],
      [LineChangeKind.Added, null, 2, null, 'two'],
    ]);
    expect(compare('one\ntwo\n', '').stats).toEqual({ ...NO_CHANGES, removedLines: 2 });
  });

  it('finds no rows in two empty texts', () => {
    expect(compare('', '')).toEqual({ rows: [], stats: NO_CHANGES });
  });

  it('pairs a line with a changed word as a changed line and marks only the word', () => {
    expect(summary('Backups run every night.', 'Backups run every hour.')).toEqual([
      [LineChangeKind.Changed, 1, 1, 'Backups run every night.', 'Backups run every hour.'],
    ]);
    expect(changedTexts('Backups run every night.', 'Backups run every hour.')).toEqual([
      { removed: ['night'], added: ['hour'] },
    ]);
  });

  it('shows different lines as removed and added, and similar ones as changed', () => {
    const oldText = 'Notes sync every hour.\nThe old editor stays.';
    const newText = 'Notes sync every day.\nExport works offline now.';

    expect(compare(oldText, newText).rows.map((row) => row.kind)).toEqual([
      LineChangeKind.Changed,
      LineChangeKind.Removed,
      LineChangeKind.Added,
    ]);
  });

  it('pairs a changed line with its old version across a blank line added after it', () => {
    const rows = summary(enLongBefore, enLongAfter).slice(10, 14);

    expect(rows.map(([kind, oldNumber, newNumber]) => [kind, oldNumber, newNumber])).toEqual([
      [LineChangeKind.Unchanged, 11, 11],
      [LineChangeKind.Changed, 12, 12],
      [LineChangeKind.Added, null, 13],
      [LineChangeKind.Unchanged, 13, 14],
    ]);
  });

  it('marks a changed indentation, a tab turned into spaces and spaces at the end on their own', () => {
    const oldText =
      '  every 15 minutes\n\tonly on Wi-Fi\nbackup: daily\nLabels  work in notebooks.';
    const newText =
      '    every 15 minutes\n    only on Wi-Fi\nbackup: daily  \nLabels work in notebooks.';
    const { rows } = compare(oldText, newText);

    expect(changedTexts(oldText, newText)).toEqual([
      { removed: ['  '], added: ['    '] },
      { removed: ['\t'], added: ['    '] },
      { removed: [], added: ['  '] },
      { removed: ['  '], added: [' '] },
    ]);
    expect(rows.map((row) => [signCounts(row.oldLine), signCounts(row.newLine)])).toEqual([
      [
        { spaces: 2, tabs: 0 },
        { spaces: 4, tabs: 0 },
      ],
      [
        { spaces: 0, tabs: 1 },
        { spaces: 4, tabs: 0 },
      ],
      [
        { spaces: 0, tabs: 0 },
        { spaces: 2, tabs: 0 },
      ],
      [
        { spaces: 2, tabs: 0 },
        { spaces: 1, tabs: 0 },
      ],
    ]);
  });

  it('finds no change in whitespace when it is ignored, so a line of spaces equals an empty line', () => {
    const oldText = '  every 15 minutes\nbackup: daily  \nLabels  work\n    \nend';
    const newText = '    every 15 minutes\nbackup: daily\nLabels work\n\nend';

    expect(compare(oldText, newText, IGNORE_WHITESPACE).stats).toEqual(NO_CHANGES);
    expect(compare(oldText, newText).stats).toEqual({
      addedLines: 1,
      removedLines: 1,
      changedLines: 3,
    });
  });

  it('shows a blank line added or removed as unchanged, in its version alone, when blank lines are ignored', () => {
    const oldText = '[sync]\ninterval = 15\n\n\nwifi-only = true\n[backup]';
    const newText = '[sync]\ninterval = 30\n\nwifi-only = true\n \t\n[backup]';

    expect(summary(oldText, newText, IGNORE_BLANK_LINES)).toEqual([
      [LineChangeKind.Unchanged, 1, 1, '[sync]', '[sync]'],
      [LineChangeKind.Changed, 2, 2, 'interval = 15', 'interval = 30'],
      [LineChangeKind.Unchanged, 3, null, NO_TEXT, null],
      [LineChangeKind.Unchanged, 4, 3, NO_TEXT, NO_TEXT],
      [LineChangeKind.Unchanged, 5, 4, 'wifi-only = true', 'wifi-only = true'],
      [LineChangeKind.Unchanged, null, 5, null, ' \t'],
      [LineChangeKind.Unchanged, 6, 6, '[backup]', '[backup]'],
    ]);
    expect(compare(oldText, newText, IGNORE_BLANK_LINES).stats).toEqual({
      addedLines: 0,
      removedLines: 0,
      changedLines: 1,
    });
    expect(compare(oldText, newText).stats).toEqual({
      addedLines: 1,
      removedLines: 1,
      changedLines: 1,
    });
  });

  it('finds no change in a blank line of spaces in place of an empty one when blank lines are ignored', () => {
    const oldText = 'first\n\nlast';
    const newText = 'first\n  \nlast';
    const ignored = compare(oldText, newText, IGNORE_BLANK_LINES);

    expect(ignored.rows.map((row) => row.kind)).toEqual([
      LineChangeKind.Unchanged,
      LineChangeKind.Unchanged,
      LineChangeKind.Unchanged,
    ]);
    expect(ignored.stats).toEqual(NO_CHANGES);
    expect(compare(oldText, newText).stats).toEqual({
      addedLines: 1,
      removedLines: 1,
      changedLines: 0,
    });
  });

  it('marks every space and tab, also outside changes, when the settings ask for it', () => {
    const oldText = 'name:\tSync\nSync every hour';
    const newText = 'name:\tSync\nSync every day';
    const marked = compare(oldText, newText, DEFAULT_DIFF_OPTIONS, true, true).rows;
    const unmarked = compare(oldText, newText, DEFAULT_DIFF_OPTIONS, true).rows;
    const signsOfRow = (row: ViewRow) => [
      signCounts(row.oldLine),
      signCounts(row.newLine),
      signCounts(row.mergedLine),
    ];
    const unmarkedSigns = unmarked.flatMap(signsOfRow);

    expect(marked.map(signsOfRow)).toEqual([
      [
        { spaces: 0, tabs: 1 },
        { spaces: 0, tabs: 1 },
        { spaces: 0, tabs: 0 },
      ],
      [
        { spaces: 2, tabs: 0 },
        { spaces: 2, tabs: 0 },
        { spaces: 2, tabs: 0 },
      ],
    ]);
    expect(unmarkedSigns.every(({ spaces, tabs }) => spaces + tabs === 0)).toBe(true);
    expect(marked.map((row) => [shownText(row.oldLine), shownText(row.newLine)])).toEqual([
      ['name:\tSync', 'name:\tSync'],
      ['Sync every hour', 'Sync every day'],
    ]);
  });

  it('finds no change in letter case when it is ignored', () => {
    const oldText = 'Sync settings for teams';
    const newText = 'sync settings for teams';

    expect(compare(oldText, newText, IGNORE_CASE).stats).toEqual(NO_CHANGES);
    expect(compare(oldText, newText).stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
  });

  it('shows tags and character references in the text as plain characters', () => {
    const oldText = '<script>alert(1)</script>\n<img src=x onerror=alert(1)> &lt;b&gt;';
    const newText = '<script>alert(2)</script>\n<img src=y onerror=alert(1)> &lt;i&gt;';
    const { rows } = compare(oldText, newText, DEFAULT_DIFF_OPTIONS, true);
    const lines = rows.flatMap((row) => [row.oldLine, row.newLine, row.mergedLine]);
    const elements = lines.flatMap((line) =>
      Array.from(parsedLine(line?.html ?? NO_TEXT).querySelectorAll(ANY_ELEMENT_SELECTOR)),
    );

    expect(elements.every((element) => MARKER_ELEMENTS.has(element.localName))).toBe(true);
    expect(rows.map((row) => [shownText(row.oldLine), shownText(row.newLine)])).toEqual([
      ['<script>alert(1)</script>', '<script>alert(2)</script>'],
      ['<img src=x onerror=alert(1)> &lt;b&gt;', '<img src=y onerror=alert(1)> &lt;i&gt;'],
    ]);
  });

  it('marks only the changed words in Chinese text', () => {
    expect(changedTexts('笔记会自动同步到所有设备。', '笔记会自动同步到您的所有设备。')).toEqual([
      { removed: [], added: ['您的'] },
    ]);
  });

  it('gives the merged line of each changed pair when the settings ask for it', () => {
    const oldText = 'Title\nSync runs every hour.';
    const newText = 'Title\nSync runs every day.';
    const [unchangedRow, changedRow] = compare(oldText, newText, DEFAULT_DIFF_OPTIONS, true).rows;
    const mergedLine = changedRow.mergedLine;

    expect(unchangedRow.mergedLine).toBeNull();
    expect(mergedLine?.number).toBe(2);
    expect(markerTexts(mergedLine, REMOVED_SELECTOR)).toEqual(['hour']);
    expect(markerTexts(mergedLine, ADDED_SELECTOR)).toEqual(['day']);
    expect(compare(oldText, newText).rows.every((row) => row.mergedLine === null)).toBe(true);
  });

  it.each(SAMPLES)(
    'counts the changes of the $language $size sample',
    ({ size, before, after }) => {
      expect(compare(before, after).stats).toEqual(SAMPLE_STATS[size]);
    },
  );

  it.each(SAMPLES)(
    'keeps every line of the $language $size sample in its version, in order',
    ({ before, after }) => {
      const { rows } = compare(before, after, DEFAULT_DIFF_OPTIONS, true);
      const oldTexts = rows
        .filter((row) => row.oldLine !== null)
        .map((row) => shownText(row.oldLine));
      const newTexts = rows
        .filter((row) => row.newLine !== null)
        .map((row) => shownText(row.newLine));

      expect(oldTexts).toEqual(linesOf(before));
      expect(newTexts).toEqual(linesOf(after));
    },
  );

  it.each([SHORT, MEDIUM, LONG])('gives the same rows in English and Polish: %s', (size) => {
    const [english, polish] = ['en', 'pl'].map((language) => {
      const sample = SAMPLES.find((each) => each.language === language && each.size === size);
      return compare(sample?.before ?? NO_TEXT, sample?.after ?? NO_TEXT).rows.map(
        (row) => row.kind,
      );
    });

    expect(polish).toEqual(english);
  });

  it('counts fewer changes in the long sample when blank lines are ignored', () => {
    expect(compare(enLongBefore, enLongAfter, IGNORE_BLANK_LINES).stats).toEqual({
      addedLines: 8,
      removedLines: 0,
      changedLines: 22,
    });
  });

  it('counts fewer changes in the long sample when whitespace is ignored', () => {
    expect(compare(enLongBefore, enLongAfter, IGNORE_WHITESPACE).stats).toEqual({
      addedLines: 12,
      removedLines: 1,
      changedLines: 16,
    });
  });
});
