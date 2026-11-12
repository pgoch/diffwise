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
import {
  type ChangeDetail,
  ChangeDetailKind,
  CheckboxState,
  DEFAULT_DIFF_OPTIONS,
  type DiffOptions,
  FormattingValue,
  type FormattingValueChange,
  type HtmlDiff,
  type ImageProperties,
  ImageProperty,
  LineChangeKind,
  ListMarkerProperty,
  TextStyle,
  type ViewLine,
  type ViewRow,
} from './model';

const TEMPLATE_TAG = 'template';
const REMOVED_SELECTOR = 'del.diffwise-html-diff__highlight--removed';
const ADDED_SELECTOR = 'ins.diffwise-html-diff__highlight--added';
const MARKER_SELECTOR = `${REMOVED_SELECTOR}, ${ADDED_SELECTOR}`;
const DETAILS_MARKER_SELECTOR = '[data-diffwise-change-details]';
const FRAMED_IMAGE_SELECTOR = '.diffwise-html-diff__highlight--image img';
const REMOVED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--removed';
const ADDED_CLASSES = 'diffwise-html-diff__highlight diffwise-html-diff__highlight--added';
const IMAGE_CLASS = 'diffwise-html-diff__highlight--image';
const SRC_ATTRIBUTE = 'src';
const RTL_PARAGRAPH = '<p dir="rtl">';
const UNSAFE_HTML = /onclick|javascript:|<script/i;
const NO_CHANGES = { addedLines: 0, removedLines: 0, changedLines: 0 };
const ID_PREFIX = 'diff';
const UNKNOWN_SAMPLE = 'No sample has the name ';
const ID_SELECTOR = '[id]';
const FRAGMENT_LINK_SELECTOR = 'a[href^="#"]';
const HREF_ATTRIBUTE = 'href';
const FRAGMENT_START = '#';

const LIST_ITEM_SELECTOR = 'li, dt, dd';
const LIST_MARKER_ATTRIBUTE = 'data-diffwise-list-marker';
const DETAILS_ATTRIBUTE = 'data-diffwise-change-details';
const DRAWN_MARKER_SELECTOR = '.diffwise-html-diff__highlight--list-marker';
const CHECKBOX_MARKER_CLASS = 'diffwise-html-diff__highlight--checkbox';
const COLUMN_SIZERS_SELECTOR = '[data-diffwise-column-sizers]';
const COPIED_ROWS_SELECTOR = `${COLUMN_SIZERS_SELECTOR} > tr`;
const CELL_MARKER_SELECTOR = '.diffwise-html-diff__highlight--cell';
const ROW_CELLS_SELECTOR = '[data-diffwise-table-copy] > * > tr > *';
const IGNORE_FORMATTING: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreFormatting: true };

/** Stands for a framed checkbox among the texts of markers. */
const FRAMED_CHECKBOX = '[checkbox]';

/** Marks the list item that a line belongs to. */
const LINE_ITEM = 'data-diffwise-line-item=""';

/** A nested item keeps copies of the outer list and of its item, without the item's marker. */
const NESTED_ITEM_START = /^<ol><li value="4" data-diffwise-continued-item=""><ul><li value="1"/;

const EN_SHORT = 'en/short';
const EN_MEDIUM = 'en/medium';
const EN_LONG = 'en/long';
const PL_SHORT = 'pl/short';
const PL_MEDIUM = 'pl/medium';
const PL_LONG = 'pl/long';

/** Sample pairs from `test-data/`, as `[name, before, after]`. */
const SAMPLES: [string, string, string][] = [
  [EN_SHORT, enShortBefore, enShortAfter],
  [EN_MEDIUM, enMediumBefore, enMediumAfter],
  [EN_LONG, enLongBefore, enLongAfter],
  [PL_SHORT, plShortBefore, plShortAfter],
  [PL_MEDIUM, plMediumBefore, plMediumAfter],
  [PL_LONG, plLongBefore, plLongAfter],
];

/** Names of the English and the Polish sample of one size, as `[size, English, Polish]`. */
const TRANSLATED_SAMPLES: [string, string, string][] = [
  ['short', EN_SHORT, PL_SHORT],
  ['medium', EN_MEDIUM, PL_MEDIUM],
  ['long', EN_LONG, PL_LONG],
];

/** Diffs of the samples with the default options, by sample name; each is compared on first use. */
const sampleDiffs = new Map<string, HtmlDiff>();

/** Compares two documents; ids of the versions start with `diff-old-` and `diff-new-`. */
function compare(
  oldHtml: string,
  newHtml: string,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
): HtmlDiff {
  return diffHtml(oldHtml, newHtml, { options, idPrefix: ID_PREFIX });
}

/**
 * The diff of a sample with the default options. Tests share it, because comparing a long sample
 * takes most of the time of a test.
 */
function sampleDiff(name: string): HtmlDiff {
  const sharedDiff = sampleDiffs.get(name);

  if (sharedDiff !== undefined) {
    return sharedDiff;
  }

  const [, before, after] = SAMPLES.find(([sampleName]) => sampleName === name) ?? [];

  if (before === undefined || after === undefined) {
    throw new Error(UNKNOWN_SAMPLE + name);
  }

  const diff = compare(before, after);

  sampleDiffs.set(name, diff);

  return diff;
}

/** Expected HTML of an added part. */
function added(html: string): string {
  return `<ins class="${ADDED_CLASSES}">${html}</ins>`;
}

/** Expected details of a formatting change. */
function formattingDetail(
  removedStyles: TextStyle[],
  addedStyles: TextStyle[],
  changedValues: FormattingValueChange[] = [],
) {
  return { kind: ChangeDetailKind.Formatting, removedStyles, addedStyles, changedValues };
}

/** Expected details of a link change. */
function linkDetail(oldLink: string | null, newLink: string | null) {
  return { kind: ChangeDetailKind.Link, oldLink, newLink };
}

/** A row as `[kind, old number, new number]`; a missing line is `null`. */
function rowShape({ kind, oldLine, newLine }: ViewRow) {
  return [kind, oldLine?.number ?? null, newLine?.number ?? null];
}

/** A row as `[kind, old number, new number, removed texts, added texts]`. */
function rowSummary(row: ViewRow) {
  return [
    ...rowShape(row),
    markedTexts(row.oldLine, REMOVED_SELECTOR),
    markedTexts(row.newLine, ADDED_SELECTOR),
  ];
}

/** Texts of the line's markers, in reading order. */
function markedTexts(line: ViewLine | null, selector: string) {
  if (line === null) {
    return [];
  }

  const markers = fragmentOf(line.html).querySelectorAll(selector);

  return Array.from(markers, markerText);
}

/** Text of a marker; a drawn list marker has its text in an attribute, and a checkbox has none. */
function markerText(marker: Element): string | null {
  if (marker.classList.contains(CHECKBOX_MARKER_CLASS)) {
    return FRAMED_CHECKBOX;
  }

  return marker.getAttribute(LIST_MARKER_ATTRIBUTE) ?? marker.textContent;
}

/** A row as `[old number, new number, what changed]`: marker properties, or checkbox states. */
function itemChangeSummary(row: ViewRow) {
  const changes = row.changeDetails.map((detail) => {
    switch (detail.kind) {
      case ChangeDetailKind.ListMarker:
        return detail.changedProperties;
      case ChangeDetailKind.Checkbox:
        return [detail.oldState, detail.newState];
      default:
        return detail.kind;
    }
  });

  return [row.oldLine?.number, row.newLine?.number, changes];
}

function hasListItemDetails(row: ViewRow): boolean {
  return row.changeDetails.some(isListItemDetail);
}

function isListItemDetail({ kind }: ChangeDetail): boolean {
  return kind === ChangeDetailKind.ListMarker || kind === ChangeDetailKind.Checkbox;
}

/** Detail positions of the markers of a line, such as `['0', '1']`. */
function detailPositions(line: ViewLine | null) {
  const markers =
    line === null ? [] : fragmentOf(line.html).querySelectorAll(DETAILS_MARKER_SELECTOR);
  return Array.from(markers, (marker) => marker.getAttribute(DETAILS_ATTRIBUTE));
}

/** A row as `[old number, new number, old texts, new texts, details]` for markers with details. */
function detailSummary(row: ViewRow) {
  return [
    row.oldLine?.number,
    row.newLine?.number,
    markedTexts(row.oldLine, DETAILS_MARKER_SELECTOR),
    markedTexts(row.newLine, DETAILS_MARKER_SELECTOR),
    row.changeDetails,
  ];
}

/** A row as `[old number, new number, kinds of details]`. */
function detailShape(row: ViewRow) {
  return [row.oldLine?.number, row.newLine?.number, row.changeDetails.map(({ kind }) => kind)];
}

/** A row as `[old number, new number, old framed images, new framed images, changed properties]`. */
function imageSummary(row: ViewRow) {
  const changedProperties = row.changeDetails.map((detail) =>
    detail.kind === ChangeDetailKind.Image ? detail.changedProperties : [],
  );

  return [
    row.oldLine?.number,
    row.newLine?.number,
    framedImages(row.oldLine),
    framedImages(row.newLine),
    changedProperties,
  ];
}

/** Files of the line's framed images, in reading order. */
function framedImages(line: ViewLine | null) {
  if (line === null) {
    return [];
  }

  const images = fragmentOf(line.html).querySelectorAll(FRAMED_IMAGE_SELECTOR);

  return Array.from(images, (image) => image.getAttribute(SRC_ATTRIBUTE));
}

/** Expected details of an image change. */
function imageDetail(
  oldImage: ImageProperties,
  newImage: ImageProperties,
  changedProperties: ImageProperty[],
) {
  return { kind: ChangeDetailKind.Image, oldImage, newImage, changedProperties };
}

function hasChangeDetails(row: ViewRow): boolean {
  return row.changeDetails.length > 0;
}

function hasFormattingOrLinkDetails(row: ViewRow): boolean {
  return row.changeDetails.some(isFormattingOrLinkDetail);
}

function isFormattingOrLinkDetail({ kind }: ChangeDetail): boolean {
  return kind === ChangeDetailKind.Formatting || kind === ChangeDetailKind.Link;
}

function hasFramedImages({ oldLine, newLine }: ViewRow): boolean {
  return [oldLine, newLine].some((line) => framedImages(line).length > 0);
}

/** A table row as `[kind, old number, new number, removed texts, added texts, removed cells, added cells]`. */
function tableRowSummary(row: ViewRow) {
  return [...rowSummary(row), markedCells(row.oldLine), markedCells(row.newLine)];
}

/** Texts of the cells of a line that are marked as a whole. */
function markedCells(line: ViewLine | null) {
  const cells = line === null ? [] : fragmentOf(line.html).querySelectorAll(CELL_MARKER_SELECTOR);
  return Array.from(cells, (cell) => readerText([cell]));
}

/** Positions of the cells of a line that are marked as a whole, among all cells of its row. */
function markedCellPositions(line: ViewLine | null) {
  const cells = line === null ? [] : fragmentOf(line.html).querySelectorAll(ROW_CELLS_SELECTOR);
  const positions = Array.from(cells, (cell, position) =>
    cell.matches(CELL_MARKER_SELECTOR) ? position : -1,
  );

  return positions.filter((position) => position >= 0);
}

/** True for a row of lines of the given table. */
function isRowOfTable(row: ViewRow, table: number): boolean {
  return (row.newLine ?? row.oldLine)?.table === table;
}

/** How many lines each table has among the lines of one version, by the position of the table. */
function linesPerTable(lines: readonly (ViewLine | null)[]) {
  const counts = new Map<number, number>();

  for (const table of lines.map((line) => line?.table ?? null)) {
    if (table !== null) {
      counts.set(table, (counts.get(table) ?? 0) + 1);
    }
  }

  return Object.fromEntries(counts);
}

/** How many hidden copies of rows each table line of one version has. */
function copiedRowCounts(lines: readonly (ViewLine | null)[]) {
  const tableLines = lines.filter((line) => line !== null && line.table !== null);
  return tableLines.map((line) => copiedRowsOf(line).length);
}

function copiedRowsOf(line: ViewLine | null): NodeListOf<Element> {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = line?.html ?? '';

  return template.content.querySelectorAll(COPIED_ROWS_SELECTOR);
}

function hasMarkers({ oldLine, newLine }: ViewRow): boolean {
  return [oldLine, newLine].some(lineHasMarkers);
}

/** True for a row of list items that differ. */
function isChangedListItem(row: ViewRow): boolean {
  return row.kind !== LineChangeKind.Unchanged && isListItemLine(row.newLine ?? row.oldLine);
}

function isListItemLine(line: ViewLine | null): boolean {
  return line !== null && fragmentOf(line.html).querySelector(LIST_ITEM_SELECTOR) !== null;
}

/** The row that shows the new line with the number. */
function rowWithNewLine(rows: readonly ViewRow[], number: number): ViewRow {
  const row = rows.find(({ newLine }) => newLine?.number === number);

  if (row === undefined) {
    throw new Error(`No row with new line ${number}`);
  }

  return row;
}

function lineHasMarkers(line: ViewLine | null): boolean {
  return line !== null && fragmentOf(line.html).querySelector(MARKER_SELECTOR) !== null;
}

/** Content of line HTML without the hidden copies of table rows, which only set column widths. */
function fragmentOf(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  for (const columnSizers of template.content.querySelectorAll(COLUMN_SIZERS_SELECTOR)) {
    columnSizers.remove();
  }

  return template.content;
}

function textOf(line: ViewLine): string {
  return readerText(fragmentOf(line.html).childNodes);
}

function lineTexts(html: string): string[] {
  return splitLines(parseHtml(html), ID_PREFIX).map((line) => line.text);
}

/** Numbers 1 to `count`. */
function numbersUpTo(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

/** Ids in the lines of one version. */
function idsIn(lines: readonly (ViewLine | null)[]) {
  return Array.from(elementsIn(lines, ID_SELECTOR), (element) => element.id);
}

/** Ids that links such as `#note-1` in the lines of one version point to. */
function linkTargetsIn(lines: readonly (ViewLine | null)[]) {
  const links = elementsIn(lines, FRAGMENT_LINK_SELECTOR);
  return Array.from(links, (link) =>
    link.getAttribute(HREF_ATTRIBUTE)?.slice(FRAGMENT_START.length),
  );
}

function elementsIn(lines: readonly (ViewLine | null)[], selector: string): NodeListOf<Element> {
  const html = lines.map((line) => line?.html).join();
  return fragmentOf(html).querySelectorAll(selector);
}

describe('diffHtml', () => {
  it('shows the changes of the short sample', () => {
    const diff = compare(enShortBefore, enShortAfter);

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
    const changedRow = compare(enShortBefore, enShortAfter).rows[1];
    const dayAndDate = `<strong>${added('Sunday')}, ${added('15')} March</strong>`;
    const time = `22:00 to 23:${added('30')}`;

    expect(changedRow.newLine?.html).toBe(
      `<p>Notebook Online will be unavailable on ${dayAndDate} from ${time} CET.</p>`,
    );
  });

  it('shows the changes of the medium sample', () => {
    const diff = compare(enMediumBefore, enMediumAfter);

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
      [LineChangeKind.Unchanged, 8, 10, [], []],
      [LineChangeKind.Removed, 9, null, [], []],
      [LineChangeKind.Unchanged, 10, 11, [], []],
      [LineChangeKind.Added, null, 12, [], []],
      [LineChangeKind.Unchanged, 11, 13, [], []],
      [
        LineChangeKind.Changed,
        12,
        14,
        ['Pinned notes always stay at the top of the list in every notebook.'],
        [],
      ],
      [LineChangeKind.Unchanged, 13, 15, [], []],
      [LineChangeKind.Unchanged, 14, 16, [], []],
      [LineChangeKind.Unchanged, 15, 17, [], []],
      [LineChangeKind.Unchanged, 16, 18, [], []],
      [LineChangeKind.Unchanged, 17, 19, [], []],
      [LineChangeKind.Added, null, 20, [], []],
      [LineChangeKind.Changed, 18, 21, ['4.', 'five'], ['5.', 'ten']],
      [LineChangeKind.Changed, 19, 22, ['month'], ['week']],
      [LineChangeKind.Unchanged, 20, 23, [], []],
      [LineChangeKind.Unchanged, 21, 24, [], []],
      [LineChangeKind.Unchanged, 22, 25, [], []],
      [LineChangeKind.Removed, 23, null, [], []],
      [LineChangeKind.Removed, 24, null, [], []],
      [LineChangeKind.Unchanged, 25, 26, [], []],
      [LineChangeKind.Unchanged, 26, 27, [], []],
      [LineChangeKind.Added, null, 28, [], []],
      [LineChangeKind.Added, null, 29, [], []],
      [LineChangeKind.Changed, 27, 30, ['help center'], ['help center']],
    ]);
    expect(diff.stats).toEqual({ addedLines: 6, removedLines: 3, changedLines: 8 });
  });

  it('shows the list changes of the long sample item by item, with their markers', () => {
    const changedItems = sampleDiff(EN_LONG).rows.filter(isChangedListItem).map(rowSummary);

    expect(changedItems).toEqual([
      [LineChangeKind.Added, null, 11, [], []],
      [LineChangeKind.Changed, 11, 12, ['5.'], ['6.']],
      [LineChangeKind.Changed, 31, 33, ['24'], ['48']],
      [LineChangeKind.Added, null, 34, [], []],
      [LineChangeKind.Changed, 32, 35, ['3.'], ['4.']],
      [LineChangeKind.Changed, 33, 36, ['macOS'], [', macOS', 'Linux']],
      [LineChangeKind.Changed, 35, 38, ['4.'], ['5.']],
      [LineChangeKind.Changed, 37, 40, ['5.'], ['6.']],
      [LineChangeKind.Changed, 38, 41, ['6.'], ['7.']],
      [LineChangeKind.Changed, 41, 44, ['•'], ['1.']],
      [LineChangeKind.Changed, 42, 45, ['•'], ['2.']],
      [LineChangeKind.Changed, 43, 46, ['•'], ['3.']],
      [LineChangeKind.Changed, 44, 47, ['•'], ['4.']],
      [LineChangeKind.Changed, 47, 50, [FRAMED_CHECKBOX], [FRAMED_CHECKBOX]],
      [LineChangeKind.Changed, 54, 57, ['and invite others'], []],
      [LineChangeKind.Added, null, 58, [], []],
      [LineChangeKind.Changed, 75, 78, [], ['and files']],
      [LineChangeKind.Changed, 90, 93, [], ['or newer']],
    ]);
  });

  it('keeps the numbers and the nesting of list items in their lines', () => {
    const { rows } = sampleDiff(EN_LONG);
    const addedContentsItem = rows.find((row) => row.newLine?.number === 11);
    const changedNestedItem = rows.find((row) => row.newLine?.number === 36);

    expect(addedContentsItem?.newLine?.html).toBe(
      `<ol><li value="5" ${LINE_ITEM}><a href="#diff-new-shortcuts">Keyboard shortcuts</a></li></ol>`,
    );
    expect(changedNestedItem?.newLine?.html).toMatch(NESTED_ITEM_START);
  });

  it('describes the changes of list markers and checkboxes in the long sample', () => {
    const itemChanges = sampleDiff(EN_LONG).rows.filter(hasListItemDetails).map(itemChangeSummary);
    const toNumbers = [[ListMarkerProperty.ListType]];

    expect(itemChanges).toEqual([
      [41, 44, toNumbers],
      [42, 45, toNumbers],
      [43, 46, toNumbers],
      [44, 47, toNumbers],
      [47, 50, [[CheckboxState.Unchecked, CheckboxState.Checked]]],
    ]);
  });

  it('marks numbers shifted by an added item like numbers from another start, with no details', () => {
    const { rows } = sampleDiff(EN_LONG);
    const shiftedItem = rowWithNewLine(rows, 35);
    const itemOfNewStart = rowWithNewLine(rows, 40);

    expect([shiftedItem, itemOfNewStart].map(rowSummary)).toEqual([
      [LineChangeKind.Changed, 32, 35, ['3.'], ['4.']],
      [LineChangeKind.Changed, 37, 40, ['5.'], ['6.']],
    ]);
    expect([shiftedItem, itemOfNewStart].map(detailShape)).toEqual([
      [32, 35, []],
      [37, 40, []],
    ]);
    expect(detailPositions(shiftedItem.newLine)).toEqual([]);
    expect(detailPositions(itemOfNewStart.newLine)).toEqual([]);
  });

  it('marks another number and changed text of one item, with no details', () => {
    const oldHtml = '<ol start="5"><li>Import notes</li></ol>';
    const newHtml = '<ol start="6"><li>Import files</li></ol>';
    const [row] = compare(oldHtml, newHtml).rows;

    expect(rowSummary(row)).toEqual([
      LineChangeKind.Changed,
      1,
      1,
      ['5.', 'notes'],
      ['6.', 'files'],
    ]);
    expect(detailShape(row)).toEqual([1, 1, []]);
  });

  it('puts the details of a list item before those of formatting, with markers pointing to them', () => {
    const oldHtml = '<ul><li><i>Important:</i> make backups.</li></ul>';
    const newHtml = '<ol><li><b>Important:</b> make backups.</li></ol>';
    const [row] = compare(oldHtml, newHtml).rows;

    expect(detailShape(row)).toEqual([
      1,
      1,
      [ChangeDetailKind.ListMarker, ChangeDetailKind.Formatting],
    ]);
    expect(detailPositions(row.oldLine)).toEqual(['0', '1']);
    expect(detailPositions(row.newLine)).toEqual(['0', '1']);
  });

  it('describes a list marker of a style it does not draw only by its details', () => {
    const oldHtml = '<ol><li>Notes</li></ol>';
    const newHtml = '<ol style="list-style-type: armenian"><li>Notes</li></ol>';
    const [row] = compare(oldHtml, newHtml).rows;

    expect(itemChangeSummary(row)).toEqual([1, 1, [[ListMarkerProperty.Style]]]);
    expect(fragmentOf(row.newLine?.html ?? '').querySelector(DRAWN_MARKER_SELECTOR)).toBeNull();
  });

  it('keeps only numbers and checkboxes of list items with ignoreFormatting', () => {
    const { rows } = compare(enLongBefore, enLongAfter, IGNORE_FORMATTING);
    const itemChanges = rows.filter(hasListItemDetails).map(itemChangeSummary);
    const changedItems = rows.filter(isChangedListItem).map(rowShape);

    expect(itemChanges).toEqual([[47, 50, [[CheckboxState.Unchecked, CheckboxState.Checked]]]]);
    expect(changedItems).toContainEqual([LineChangeKind.Changed, 32, 35]);
    expect(changedItems).toContainEqual([LineChangeKind.Changed, 37, 40]);
    expect(changedItems).not.toContainEqual([LineChangeKind.Changed, 41, 44]);
  });

  it.each(TRANSLATED_SAMPLES)(
    'shows the same rows for the English and Polish %s samples',
    (_, englishName, polishName) => {
      expect(sampleDiff(polishName).rows.map(rowShape)).toEqual(
        sampleDiff(englishName).rows.map(rowShape),
      );
    },
  );

  it.each(SAMPLES)('numbers the lines of each version of %s from 1', (name, before, after) => {
    const { rows } = sampleDiff(name);
    const oldNumbers = rows.map((row) => row.oldLine?.number).filter(Number.isInteger);
    const newNumbers = rows.map((row) => row.newLine?.number).filter(Number.isInteger);

    expect(oldNumbers).toEqual(numbersUpTo(lineTexts(before).length));
    expect(newNumbers).toEqual(numbersUpTo(lineTexts(after).length));
  });

  it.each(SAMPLES)('keeps the text of every line of %s', (name, before, after) => {
    const oldTexts = lineTexts(before);
    const newTexts = lineTexts(after);

    for (const { oldLine, newLine } of sampleDiff(name).rows) {
      if (oldLine) {
        expect(textOf(oldLine)).toBe(oldTexts[oldLine.number - 1]);
      }

      if (newLine) {
        expect(textOf(newLine)).toBe(newTexts[newLine.number - 1]);
      }
    }
  });

  it.each(SAMPLES)('marks words only in changed rows of %s', (name) => {
    const markedKinds = new Set(
      sampleDiff(name)
        .rows.filter(hasMarkers)
        .map((row) => row.kind),
    );

    expect([...markedKinds]).toEqual([LineChangeKind.Changed]);
  });

  it('numbers removed and added lines only on their own side', () => {
    const oldHtml = '<p>Zasady ogólne.</p><p>Okres próbny.</p><p>Kontakt.</p>';
    const newHtml = '<p>Zasady ogólne.</p><p>Kontakt.</p><p>Płatności.</p>';

    expect(compare(oldHtml, newHtml).rows.map(rowShape)).toEqual([
      [LineChangeKind.Unchanged, 1, 1],
      [LineChangeKind.Removed, 2, null],
      [LineChangeKind.Unchanged, 3, 2],
      [LineChangeKind.Added, null, 3],
    ]);
  });

  it('applies the options to lines and words', () => {
    const oldHtml = '<p>Konto Firmowe</p>';
    const newHtml = '<p>Konto firmowe</p>';
    const ignoreCase = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(compare(oldHtml, newHtml).rows.map(rowSummary)).toEqual([
      [LineChangeKind.Changed, 1, 1, ['Firmowe'], ['firmowe']],
    ]);
    expect(compare(oldHtml, newHtml, ignoreCase).rows.map(rowSummary)).toEqual([
      [LineChangeKind.Unchanged, 1, 1, [], []],
    ]);
  });

  it('marks an added emoji whole and only the changed word in Chinese', () => {
    expect(
      compare('<p>Zażółć gęślą jaźń 🙂</p>', '<p>Zażółć gęślą jaźń 🙂🎉</p>').rows.map(rowSummary),
    ).toEqual([[LineChangeKind.Changed, 1, 1, [], ['🎉']]]);
    expect(
      compare('<p>我们的服务全天开放。</p>', '<p>我们的服务每天开放。</p>').rows.map(rowSummary),
    ).toEqual([[LineChangeKind.Changed, 1, 1, ['全天'], ['每天']]]);
  });

  it('marks the changed words of right-to-left text and keeps its direction', () => {
    const { rows } = compare(
      '<p dir="rtl">الخدمة متاحة طوال اليوم.</p>',
      '<p dir="rtl">الخدمة متاحة كل يوم.</p>',
    );

    expect(rows.map(rowSummary)).toEqual([
      [LineChangeKind.Changed, 1, 1, ['طوال اليوم'], ['كل يوم']],
    ]);
    expect(rows[0].newLine?.html).toContain(RTL_PARAGRAPH);
  });

  it('shows no scripts, event handlers or javascript: links', () => {
    const unsafeLink = '<a href="javascript:alert(1)">';
    const script = '<script>alert(1)</script>';
    const oldHtml = `<p onclick="alert(1)">Regulamin ${unsafeLink}Kliknij</a></p>${script}`;
    const newHtml = `<p onclick="alert(1)">Regulamin ${unsafeLink}Kliknij tutaj</a></p>${script}`;
    const { rows } = compare(oldHtml, newHtml);
    const shownHtml = rows.flatMap(({ oldLine, newLine }) => [oldLine?.html, newLine?.html]).join();

    expect(rows.map(rowSummary)).toEqual([[LineChangeKind.Changed, 1, 1, [], ['tutaj']]]);
    expect(shownHtml).not.toMatch(UNSAFE_HTML);
  });

  it('gives no rows for two empty documents', () => {
    expect(compare('', '')).toEqual({ rows: [], stats: NO_CHANGES });
  });

  it('gives the ids of each version a prefix of their own', () => {
    const html = '<p>Zobacz przypis<a href="#note">1</a>.</p><p id="note">Treść przypisu.</p>';
    const { rows } = compare(html, html);

    expect(rows.map(({ oldLine, newLine }) => [oldLine?.html, newLine?.html])).toEqual([
      [
        '<p>Zobacz przypis<a href="#diff-old-note">1</a>.</p>',
        '<p>Zobacz przypis<a href="#diff-new-note">1</a>.</p>',
      ],
      ['<p id="diff-old-note">Treść przypisu.</p>', '<p id="diff-new-note">Treść przypisu.</p>'],
    ]);
  });

  it.each(SAMPLES)('keeps ids of %s unique and links within their version', (name) => {
    const { rows } = sampleDiff(name);
    const oldLines = rows.map((row) => row.oldLine);
    const newLines = rows.map((row) => row.newLine);
    const ids = [...idsIn(oldLines), ...idsIn(newLines)];

    expect(new Set(ids).size).toBe(ids.length);
    expect(idsIn(oldLines)).toEqual(expect.arrayContaining(linkTargetsIn(oldLines)));
    expect(idsIn(newLines)).toEqual(expect.arrayContaining(linkTargetsIn(newLines)));
  });

  it('marks a change of formatting on both sides and describes it', () => {
    const { rows, stats } = compare(
      '<p><i>Ważne:</i> chroń hasło.</p>',
      '<p><b>Ważne:</b> chroń hasło.</p>',
    );
    const detailsAttribute = 'data-diffwise-change-details="0"';
    const removedMarker = `<del class="${REMOVED_CLASSES}" ${detailsAttribute}>Ważne:</del>`;
    const addedMarker = `<ins class="${ADDED_CLASSES}" ${detailsAttribute}>Ważne:</ins>`;

    expect(rows).toEqual([
      {
        kind: LineChangeKind.Changed,
        oldLine: { number: 1, html: `<p><i>${removedMarker}</i> chroń hasło.</p>`, table: null },
        newLine: { number: 1, html: `<p><b>${addedMarker}</b> chroń hasło.</p>`, table: null },
        changeDetails: [formattingDetail([TextStyle.Italic], [TextStyle.Bold])],
      },
    ]);
    expect(stats).toEqual({ ...NO_CHANGES, changedLines: 1 });
  });

  it('describes the changes of formatting and links in the long sample', () => {
    const textColor = {
      name: FormattingValue.TextColor,
      oldValue: 'rgb(192, 57, 43)',
      newValue: 'rgb(30, 125, 79)',
    };
    const headingLevel = { name: FormattingValue.HeadingLevel, oldValue: '3', newValue: '2' };
    const sharingGuide = linkDetail(
      'https://example.com/help/sharing-2025',
      'https://example.com/help/sharing',
    );
    const publicLinksHelp = linkDetail(null, 'https://example.com/help/public-links');
    const addedBold = formattingDetail([], [TextStyle.Bold]);
    const sharedTexts = ['anyone with the link', 'note settings'];

    expect(sampleDiff(EN_LONG).rows.filter(hasFormattingOrLinkDetails).map(detailSummary)).toEqual([
      [55, 59, ['the sharing guide'], ['the sharing guide'], [sharingGuide]],
      [56, 60, sharedTexts, sharedTexts, [addedBold, publicLinksHelp]],
      [
        62,
        66,
        ['Important:'],
        ['Important:'],
        [formattingDetail([TextStyle.Italic], [TextStyle.Bold])],
      ],
      [64, 68, ['color'], ['color'], [formattingDetail([], [], [textColor])]],
      [
        68,
        72,
        ['Keyboard shortcuts'],
        ['Keyboard shortcuts'],
        [formattingDetail([], [], [headingLevel])],
      ],
    ]);
  });

  it('describes the same changes in the Polish long sample', () => {
    const englishShapes = sampleDiff(EN_LONG).rows.filter(hasChangeDetails);
    const polishShapes = sampleDiff(PL_LONG).rows.filter(hasChangeDetails);

    expect(polishShapes.map(detailShape)).toEqual(englishShapes.map(detailShape));
  });

  it('shows no changes of footnote links between identical documents', () => {
    const html = '<p>Zobacz przypis<a href="#note">1</a>.</p><p id="note">Treść przypisu.</p>';

    expect(compare(html, html).rows.map(rowShape)).toEqual([
      [LineChangeKind.Unchanged, 1, 1],
      [LineChangeKind.Unchanged, 2, 2],
    ]);
  });

  it('frames a replaced image on both sides and describes it', () => {
    const oldImage = { source: 'images/logo-2025.svg', width: null, height: null, altText: 'Logo' };
    const newImage = { ...oldImage, source: 'images/logo-2026.svg' };
    const oldImageHtml = '<img src="images/logo-2025.svg" alt="Logo">';
    const newImageHtml = '<img src="images/logo-2026.svg" alt="Logo">';
    const detailsAttribute = 'data-diffwise-change-details="0"';
    const removedMarker = `<del class="${REMOVED_CLASSES} ${IMAGE_CLASS}" ${detailsAttribute}>`;
    const addedMarker = `<ins class="${ADDED_CLASSES} ${IMAGE_CLASS}" ${detailsAttribute}>`;

    expect(compare(`<p>${oldImageHtml} Notatnik</p>`, `<p>${newImageHtml} Notatnik</p>`)).toEqual({
      rows: [
        {
          kind: LineChangeKind.Changed,
          oldLine: {
            number: 1,
            html: `<p>${removedMarker}${oldImageHtml}</del> Notatnik</p>`,
            table: null,
          },
          newLine: {
            number: 1,
            html: `<p>${addedMarker}${newImageHtml}</ins> Notatnik</p>`,
            table: null,
          },
          changeDetails: [imageDetail(oldImage, newImage, [ImageProperty.Source])],
        },
      ],
      stats: { ...NO_CHANGES, changedLines: 1 },
    });
  });

  it('frames the changed images of the long sample and describes them', () => {
    const logo2025 = 'images/logo-2025.svg';
    const logo2026 = 'images/logo-2026.svg';
    const screenshot = 'images/editor-screenshot.svg';
    const chart = 'images/usage-chart.svg';

    expect(sampleDiff(EN_LONG).rows.filter(hasFramedImages).map(imageSummary)).toEqual([
      [3, 3, [logo2025], [logo2026], [[ImageProperty.Source]]],
      [50, 53, ['images/icon-share.svg'], [], []],
      [57, 61, [screenshot], [screenshot], [[ImageProperty.Width, ImageProperty.Height]]],
      [84, 88, [chart], [chart], [[ImageProperty.AltText]]],
      [88, 91, [logo2025], [logo2026], [[ImageProperty.Source]]],
    ]);
  });

  it('shows the changes of the long sample tables row by row, with the cells of added rows marked', () => {
    const { rows } = sampleDiff(EN_LONG);
    const changedRows = rows.filter((row) => row.kind !== LineChangeKind.Unchanged);
    const pricesAndShortcuts = changedRows.filter(
      (row) => isRowOfTable(row, 0) || isRowOfTable(row, 2),
    );
    const teamCells = ['Team', '8', '500 GB', 'Unlimited'];
    const savedCopyCells = ['Save a copy', 'Ctrl + Shift + S', '⌘ + Shift + S'];

    expect(pricesAndShortcuts.map(tableRowSummary)).toEqual([
      [LineChangeKind.Changed, 17, 19, ['4'], ['5'], [], []],
      [LineChangeKind.Changed, 18, 20, ['100'], ['200'], [], []],
      [LineChangeKind.Added, null, 21, [], [], [], teamCells],
      [LineChangeKind.Changed, 19, 22, ['1'], ['2'], [], []],
      [LineChangeKind.Changed, 20, 23, ['50'], ['40'], [], []],
      [LineChangeKind.Changed, 71, 75, ['F', 'F'], ['K', 'K'], [], []],
      [LineChangeKind.Removed, 72, null, [], [], savedCopyCells, []],
    ]);
  });

  it('marks the cells of the column added to the long sample whole, in the same column of each row', () => {
    const { rows } = sampleDiff(EN_LONG);
    const familyColumnRows = rows.filter((row) => isRowOfTable(row, 1));
    const familyColumn = 3;

    expect(familyColumnRows.map(tableRowSummary)).toEqual([
      [LineChangeKind.Changed, 23, 25, [], [], [], ['Family']],
      [LineChangeKind.Changed, 24, 26, [], [], [], ['✓']],
      [LineChangeKind.Changed, 25, 27, [], [], [], ['1 year']],
      [LineChangeKind.Changed, 26, 28, [], [], [], ['Unlimited']],
      [LineChangeKind.Changed, 27, 29, [], [], [], ['–']],
    ]);
    expect(familyColumnRows.map((row) => markedCellPositions(row.newLine))).toEqual(
      Array.from(familyColumnRows, () => [familyColumn]),
    );
  });

  it('marks a new column and a new row at once', () => {
    const oldHtml =
      '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Free</td><td>0</td></tr></table>';
    const newHtml = `
      <table>
        <tr><th>Plan</th><th>Price</th><th>Users</th></tr>
        <tr><td>Free</td><td>0</td><td>1</td></tr>
        <tr><td>Team</td><td>8</td><td>20</td></tr>
      </table>`;

    expect(compare(oldHtml, newHtml).rows.map(tableRowSummary)).toEqual([
      [LineChangeKind.Changed, 1, 1, [], [], [], ['Users']],
      [LineChangeKind.Changed, 2, 2, [], [], [], ['1']],
      [LineChangeKind.Added, null, 3, [], [], [], ['Team', '8', '20']],
    ]);
  });

  it('describes changes of formatting, links and images inside the cells of a row', () => {
    const oldHtml = `
      <table><tr>
        <td><b>Personal</b></td>
        <td><a href="https://example.com/plans-2025">plans</a></td>
        <td><img src="images/logo-2025.svg" alt=""></td>
      </tr></table>`;
    const newHtml = `
      <table><tr>
        <td><i>Personal</i></td>
        <td><a href="https://example.com/plans">plans</a></td>
        <td><img src="images/logo-2026.svg" alt=""></td>
      </tr></table>`;
    const [row] = compare(oldHtml, newHtml).rows;

    expect(detailShape(row)).toEqual([
      1,
      1,
      [ChangeDetailKind.Formatting, ChangeDetailKind.Link, ChangeDetailKind.Image],
    ]);
    expect(detailPositions(row.newLine)).toEqual(['0', '1', '2']);
  });

  it('marks every cell of an added or a removed row, and the whole text of an added caption', () => {
    const oldHtml =
      '<table><tr><td>Free</td><td>0</td></tr><tr><td>Personal</td><td>4</td></tr></table>';
    const newHtml =
      '<table><caption>Plans</caption><tr><td>Free</td><td>0</td></tr><tr><td>Team</td><td>8</td></tr></table>';

    expect(compare(oldHtml, newHtml).rows.map(tableRowSummary)).toEqual([
      [LineChangeKind.Added, null, 1, [], ['Plans'], [], []],
      [LineChangeKind.Unchanged, 1, 2, [], [], [], []],
      [LineChangeKind.Removed, 2, null, [], [], ['Personal', '4'], []],
      [LineChangeKind.Added, null, 3, [], [], [], ['Team', '8']],
    ]);
  });

  it('gives each table line the position of its table and copies of the rows of that table', () => {
    const { rows } = sampleDiff(EN_LONG);
    const oldLines = rows.map((row) => row.oldLine);
    const newLines = rows.map((row) => row.newLine);

    expect(linesPerTable(oldLines)).toEqual({ 0: 7, 1: 5, 2: 4 });
    expect(linesPerTable(newLines)).toEqual({ 0: 8, 1: 5, 2: 3 });
    expect(new Set(copiedRowCounts(oldLines))).toEqual(new Set([6, 5, 4]));
    expect(new Set(copiedRowCounts(newLines))).toEqual(new Set([7, 5, 3]));
  });

  it('gives an image with another link and size one marker with both details', () => {
    const oldImage = { source: 'images/logo.svg', width: '32px', height: null, altText: null };
    const newImage = { ...oldImage, width: '48px' };
    const detailsAttribute = 'data-diffwise-change-details="0 1"';
    const addedMarker = `<ins class="${ADDED_CLASSES} ${IMAGE_CLASS}" ${detailsAttribute}>`;
    const [row] = compare(
      '<p><a href="/stara"><img src="images/logo.svg" width="32"></a> Notatnik</p>',
      '<p><a href="/nowa"><img src="images/logo.svg" width="48"></a> Notatnik</p>',
    ).rows;

    expect(row.newLine?.html).toBe(
      `<p><a href="/nowa">${addedMarker}<img src="images/logo.svg" width="48"></ins></a> Notatnik</p>`,
    );
    expect(row.changeDetails).toEqual([
      linkDetail('/stara', '/nowa'),
      imageDetail(oldImage, newImage, [ImageProperty.Width]),
    ]);
  });

  it('shows a line with only an image added or removed as a whole line', () => {
    const textHtml = '<p>Notatki synchronizują się w tle.</p>';
    const imageHtml = '<p><img src="images/sync-diagram.svg" alt="Synchronizacja"></p>';

    expect(compare(textHtml, textHtml + imageHtml).rows.map(rowSummary)).toEqual([
      [LineChangeKind.Unchanged, 1, 1, [], []],
      [LineChangeKind.Added, null, 2, [], []],
    ]);
    expect(compare(textHtml + imageHtml, textHtml).rows.map(rowSummary)).toEqual([
      [LineChangeKind.Unchanged, 1, 1, [], []],
      [LineChangeKind.Removed, 2, null, [], []],
    ]);
  });

  it('shows changes of formatting and links as unchanged when the options ignore them', () => {
    const oldHtml = '<h3>Regulamin</h3><p>Zobacz <b>regulamin</b>.</p>';
    const newHtml = '<h2>Regulamin</h2><p>Zobacz <a href="/regulamin">regulamin</a>.</p>';
    const ignoring = { ...DEFAULT_DIFF_OPTIONS, ignoreFormatting: true, ignoreLinkChanges: true };

    expect(compare(oldHtml, newHtml, ignoring).rows.map(rowShape)).toEqual([
      [LineChangeKind.Unchanged, 1, 1],
      [LineChangeKind.Unchanged, 2, 2],
    ]);
  });
});
