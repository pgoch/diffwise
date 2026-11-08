import enLongAfter from '../../../../test-data/en/long/after.html?raw';
import enLongBefore from '../../../../test-data/en/long/before.html?raw';
import enMediumAfter from '../../../../test-data/en/medium/after.html?raw';
import enMediumBefore from '../../../../test-data/en/medium/before.html?raw';
import enShortAfter from '../../../../test-data/en/short/after.html?raw';
import enShortBefore from '../../../../test-data/en/short/before.html?raw';
import plLongAfter from '../../../../test-data/pl/long/after.html?raw';
import plLongBefore from '../../../../test-data/pl/long/before.html?raw';
import plMediumAfter from '../../../../test-data/pl/medium/after.html?raw';
import plMediumBefore from '../../../../test-data/pl/medium/before.html?raw';
import plShortAfter from '../../../../test-data/pl/short/after.html?raw';
import plShortBefore from '../../../../test-data/pl/short/before.html?raw';
import { diffHtml } from './diff-html';
import { parseHtml } from './html/parse-html';
import { readerText } from './html/reader-text';
import { splitLines } from './html/split-lines';
import { DEFAULT_DIFF_OPTIONS, LineChangeKind, type ViewLine, type ViewRow } from './model';

const TEMPLATE_TAG = 'template';
const REMOVED_SELECTOR = 'del.diffwise-html-diff__highlight--removed';
const ADDED_SELECTOR = 'ins.diffwise-html-diff__highlight--added';
const MARKER_SELECTOR = `${REMOVED_SELECTOR}, ${ADDED_SELECTOR}`;
const ADDED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--added';
const RTL_PARAGRAPH = '<p dir="rtl">';
const UNSAFE_HTML = /onclick|javascript:|<script/i;
const NO_CHANGES = { addedLines: 0, removedLines: 0, changedLines: 0 };

/** Sample pairs from `test-data/`, as `[name, before, after]`. */
const SAMPLES: [string, string, string][] = [
  ['en/short', enShortBefore, enShortAfter],
  ['en/medium', enMediumBefore, enMediumAfter],
  ['en/long', enLongBefore, enLongAfter],
  ['pl/short', plShortBefore, plShortAfter],
  ['pl/medium', plMediumBefore, plMediumAfter],
  ['pl/long', plLongBefore, plLongAfter],
];

/** English and Polish pairs of one size, as `[size, English pair, Polish pair]`. */
const TRANSLATED_SAMPLES: [string, [string, string], [string, string]][] = [
  ['short', [enShortBefore, enShortAfter], [plShortBefore, plShortAfter]],
  ['medium', [enMediumBefore, enMediumAfter], [plMediumBefore, plMediumAfter]],
  ['long', [enLongBefore, enLongAfter], [plLongBefore, plLongAfter]],
];

/** Expected HTML of an added part. */
function added(html: string): string {
  return `<ins class="${ADDED_CLASSES}">${html}</ins>`;
}

/** A row as `[kind, old number, new number]`; a missing line is `null`. */
function rowShape({ kind, oldLine, newLine }: ViewRow) {
  const oldNumber = oldLine?.number ?? null;
  const newNumber = newLine?.number ?? null;

  return [kind, oldNumber, newNumber];
}

/** A row as `[kind, old number, new number, removed texts, added texts]`. */
function rowSummary(row: ViewRow) {
  const removedTexts = markedTexts(row.oldLine, REMOVED_SELECTOR);
  const addedTexts = markedTexts(row.newLine, ADDED_SELECTOR);

  return [...rowShape(row), removedTexts, addedTexts];
}

/** Texts of the line's markers, in reading order. */
function markedTexts(line: ViewLine | null, selector: string) {
  if (line === null) {
    return [];
  }

  const markers = fragmentOf(line.html).querySelectorAll(selector);

  return Array.from(markers, (marker) => marker.textContent);
}

function hasMarkers({ oldLine, newLine }: ViewRow): boolean {
  return [oldLine, newLine].some(lineHasMarkers);
}

function lineHasMarkers(line: ViewLine | null): boolean {
  return line !== null && fragmentOf(line.html).querySelector(MARKER_SELECTOR) !== null;
}

function fragmentOf(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content;
}

function textOf(line: ViewLine): string {
  return readerText(fragmentOf(line.html).childNodes);
}

function lineTexts(html: string): string[] {
  return splitLines(parseHtml(html)).map((line) => line.text);
}

/** Numbers 1 to `count`. */
function numbersUpTo(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

describe('diffHtml', () => {
  it('shows the changes of the short sample', () => {
    const diff = diffHtml(enShortBefore, enShortAfter);

    expect(diff.rows.map(rowSummary)).toEqual([
      [LineChangeKind.Unchanged, 1, 1, [], []],
      [LineChangeKind.Changed, 2, 2, ['Saturday', '14', '00'], ['Sunday', '15', '30']],
      [LineChangeKind.Changed, 3, 3, [], [', and you can keep editing them offline']],
      [LineChangeKind.Added, null, 4, [], []],
      [LineChangeKind.Unchanged, 4, 5, [], []],
    ]);
    expect(diff.stats).toEqual({ addedLines: 1, removedLines: 0, changedLines: 2 });
  });

  it('marks changed words inside the formatting of the short sample', () => {
    const changedRow = diffHtml(enShortBefore, enShortAfter).rows[1];
    const dayAndDate = `<strong>${added('Sunday')}, ${added('15')} March</strong>`;
    const time = `22:00 to 23:${added('30')}`;

    expect(changedRow.newLine?.html).toBe(
      `<p>Notebook Online will be unavailable on ${dayAndDate} from ${time} CET.</p>`,
    );
  });

  it('shows the changes of the medium sample', () => {
    const diff = diffHtml(enMediumBefore, enMediumAfter);

    expect(diff.rows.map(rowSummary)).toEqual([
      [LineChangeKind.Unchanged, 1, 1, [], []],
      [LineChangeKind.Changed, 2, 2, ['three'], ['four', 'stacks,']],
      [LineChangeKind.Unchanged, 3, 3, [], []],
      [LineChangeKind.Changed, 4, 4, ['Travel'], ['Recipes']],
      [LineChangeKind.Changed, 5, 5, ['in', 'You can change the name later.'], ['at the top of']],
      [LineChangeKind.Added, null, 6, [], []],
      [LineChangeKind.Added, null, 7, [], []],
      [LineChangeKind.Unchanged, 6, 8, [], []],
      [LineChangeKind.Changed, 7, 9, ['20'], ['50']],
      [
        LineChangeKind.Changed,
        8,
        10,
        ['Avoid tags that repeat a notebook name.'],
        ['Name all tags in one language.'],
      ],
      [LineChangeKind.Unchanged, 9, 11, [], []],
      [
        LineChangeKind.Changed,
        10,
        12,
        ['Pinned notes always stay at the top of the list in every notebook.'],
        [],
      ],
      [LineChangeKind.Unchanged, 11, 13, [], []],
      [LineChangeKind.Unchanged, 12, 14, [], []],
      [LineChangeKind.Changed, 13, 15, ['five'], ['Delete notes you no longer need.', 'ten']],
      [LineChangeKind.Changed, 14, 16, ['month'], ['week']],
      [LineChangeKind.Unchanged, 15, 17, [], []],
      [LineChangeKind.Unchanged, 16, 18, [], []],
      [LineChangeKind.Unchanged, 17, 19, [], []],
      [LineChangeKind.Added, null, 20, [], []],
      [LineChangeKind.Added, null, 21, [], []],
      [LineChangeKind.Unchanged, 18, 22, [], []],
      [LineChangeKind.Unchanged, 19, 23, [], []],
      [LineChangeKind.Removed, 20, null, [], []],
      [LineChangeKind.Removed, 21, null, [], []],
      [LineChangeKind.Unchanged, 22, 24, [], []],
    ]);
    expect(diff.stats).toEqual({ addedLines: 4, removedLines: 2, changedLines: 8 });
  });

  it.each(TRANSLATED_SAMPLES)(
    'shows the same rows for the English and Polish %s samples',
    (_, [enBefore, enAfter], [plBefore, plAfter]) => {
      expect(diffHtml(plBefore, plAfter).rows.map(rowShape)).toEqual(
        diffHtml(enBefore, enAfter).rows.map(rowShape),
      );
    },
  );

  it.each(SAMPLES)('numbers the lines of each version of %s from 1', (_, before, after) => {
    const { rows } = diffHtml(before, after);
    const oldNumbers = rows.map((row) => row.oldLine?.number).filter(Number.isInteger);
    const newNumbers = rows.map((row) => row.newLine?.number).filter(Number.isInteger);

    expect(oldNumbers).toEqual(numbersUpTo(lineTexts(before).length));
    expect(newNumbers).toEqual(numbersUpTo(lineTexts(after).length));
  });

  it.each(SAMPLES)('keeps the text of every line of %s', (_, before, after) => {
    const oldTexts = lineTexts(before);
    const newTexts = lineTexts(after);

    for (const { oldLine, newLine } of diffHtml(before, after).rows) {
      if (oldLine) {
        expect(textOf(oldLine)).toBe(oldTexts[oldLine.number - 1]);
      }

      if (newLine) {
        expect(textOf(newLine)).toBe(newTexts[newLine.number - 1]);
      }
    }
  });

  it.each(SAMPLES)('marks words only in changed rows of %s', (_, before, after) => {
    const markedKinds = new Set(
      diffHtml(before, after)
        .rows.filter(hasMarkers)
        .map((row) => row.kind),
    );

    expect([...markedKinds]).toEqual([LineChangeKind.Changed]);
  });

  it('numbers removed and added lines only on their own side (T4, T5)', () => {
    const oldHtml = '<p>Zasady ogólne.</p><p>Okres próbny.</p><p>Kontakt.</p>';
    const newHtml = '<p>Zasady ogólne.</p><p>Kontakt.</p><p>Płatności.</p>';

    expect(diffHtml(oldHtml, newHtml).rows.map(rowShape)).toEqual([
      [LineChangeKind.Unchanged, 1, 1],
      [LineChangeKind.Removed, 2, null],
      [LineChangeKind.Unchanged, 3, 2],
      [LineChangeKind.Added, null, 3],
    ]);
  });

  it('applies the options to lines and words (T9)', () => {
    const oldHtml = '<p>Konto Firmowe</p>';
    const newHtml = '<p>Konto firmowe</p>';
    const ignoreCase = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(diffHtml(oldHtml, newHtml).rows.map(rowSummary)).toEqual([
      [LineChangeKind.Changed, 1, 1, ['Firmowe'], ['firmowe']],
    ]);
    expect(diffHtml(oldHtml, newHtml, ignoreCase).rows.map(rowSummary)).toEqual([
      [LineChangeKind.Unchanged, 1, 1, [], []],
    ]);
  });

  it('marks an added emoji whole and only the changed word in Chinese (T13, T14)', () => {
    expect(
      diffHtml('<p>Zażółć gęślą jaźń 🙂</p>', '<p>Zażółć gęślą jaźń 🙂🎉</p>').rows.map(rowSummary),
    ).toEqual([[LineChangeKind.Changed, 1, 1, [], ['🎉']]]);
    expect(
      diffHtml('<p>我们的服务全天开放。</p>', '<p>我们的服务每天开放。</p>').rows.map(rowSummary),
    ).toEqual([[LineChangeKind.Changed, 1, 1, ['全天'], ['每天']]]);
  });

  it('marks the changed words of right-to-left text and keeps its direction (T15)', () => {
    const { rows } = diffHtml(
      '<p dir="rtl">الخدمة متاحة طوال اليوم.</p>',
      '<p dir="rtl">الخدمة متاحة كل يوم.</p>',
    );

    expect(rows.map(rowSummary)).toEqual([
      [LineChangeKind.Changed, 1, 1, ['طوال اليوم'], ['كل يوم']],
    ]);
    expect(rows[0].newLine?.html).toContain(RTL_PARAGRAPH);
  });

  it('shows no scripts, event handlers or javascript: links (T35, T36)', () => {
    const unsafeLink = '<a href="javascript:alert(1)">';
    const script = '<script>alert(1)</script>';
    const oldHtml = `<p onclick="alert(1)">Regulamin ${unsafeLink}Kliknij</a></p>${script}`;
    const newHtml = `<p onclick="alert(1)">Regulamin ${unsafeLink}Kliknij tutaj</a></p>${script}`;
    const { rows } = diffHtml(oldHtml, newHtml);
    const shownHtml = rows.flatMap(({ oldLine, newLine }) => [oldLine?.html, newLine?.html]).join();

    expect(rows.map(rowSummary)).toEqual([[LineChangeKind.Changed, 1, 1, [], ['tutaj']]]);
    expect(shownHtml).not.toMatch(UNSAFE_HTML);
  });

  it('gives no rows for two empty documents', () => {
    expect(diffHtml('', '')).toEqual({ rows: [], stats: NO_CHANGES });
  });
});
