import deLongAfter from '../../../../test-data/de/long/after.html?raw';
import deLongBefore from '../../../../test-data/de/long/before.html?raw';
import deMediumAfter from '../../../../test-data/de/medium/after.html?raw';
import deMediumBefore from '../../../../test-data/de/medium/before.html?raw';
import deShortAfter from '../../../../test-data/de/short/after.html?raw';
import deShortBefore from '../../../../test-data/de/short/before.html?raw';
import enLongAfter from '../../../../test-data/en/long/after.html?raw';
import enLongBefore from '../../../../test-data/en/long/before.html?raw';
import enMediumAfter from '../../../../test-data/en/medium/after.html?raw';
import enMediumBefore from '../../../../test-data/en/medium/before.html?raw';
import enShortAfter from '../../../../test-data/en/short/after.html?raw';
import enShortBefore from '../../../../test-data/en/short/before.html?raw';
import esLongAfter from '../../../../test-data/es/long/after.html?raw';
import esLongBefore from '../../../../test-data/es/long/before.html?raw';
import esMediumAfter from '../../../../test-data/es/medium/after.html?raw';
import esMediumBefore from '../../../../test-data/es/medium/before.html?raw';
import esShortAfter from '../../../../test-data/es/short/after.html?raw';
import esShortBefore from '../../../../test-data/es/short/before.html?raw';
import frLongAfter from '../../../../test-data/fr/long/after.html?raw';
import frLongBefore from '../../../../test-data/fr/long/before.html?raw';
import frMediumAfter from '../../../../test-data/fr/medium/after.html?raw';
import frMediumBefore from '../../../../test-data/fr/medium/before.html?raw';
import frShortAfter from '../../../../test-data/fr/short/after.html?raw';
import frShortBefore from '../../../../test-data/fr/short/before.html?raw';
import hiLongAfter from '../../../../test-data/hi/long/after.html?raw';
import hiLongBefore from '../../../../test-data/hi/long/before.html?raw';
import hiMediumAfter from '../../../../test-data/hi/medium/after.html?raw';
import hiMediumBefore from '../../../../test-data/hi/medium/before.html?raw';
import hiShortAfter from '../../../../test-data/hi/short/after.html?raw';
import hiShortBefore from '../../../../test-data/hi/short/before.html?raw';
import itLongAfter from '../../../../test-data/it/long/after.html?raw';
import itLongBefore from '../../../../test-data/it/long/before.html?raw';
import itMediumAfter from '../../../../test-data/it/medium/after.html?raw';
import itMediumBefore from '../../../../test-data/it/medium/before.html?raw';
import itShortAfter from '../../../../test-data/it/short/after.html?raw';
import itShortBefore from '../../../../test-data/it/short/before.html?raw';
import jaLongAfter from '../../../../test-data/ja/long/after.html?raw';
import jaLongBefore from '../../../../test-data/ja/long/before.html?raw';
import jaMediumAfter from '../../../../test-data/ja/medium/after.html?raw';
import jaMediumBefore from '../../../../test-data/ja/medium/before.html?raw';
import jaShortAfter from '../../../../test-data/ja/short/after.html?raw';
import jaShortBefore from '../../../../test-data/ja/short/before.html?raw';
import koLongAfter from '../../../../test-data/ko/long/after.html?raw';
import koLongBefore from '../../../../test-data/ko/long/before.html?raw';
import koMediumAfter from '../../../../test-data/ko/medium/after.html?raw';
import koMediumBefore from '../../../../test-data/ko/medium/before.html?raw';
import koShortAfter from '../../../../test-data/ko/short/after.html?raw';
import koShortBefore from '../../../../test-data/ko/short/before.html?raw';
import plLongAfter from '../../../../test-data/pl/long/after.html?raw';
import plLongBefore from '../../../../test-data/pl/long/before.html?raw';
import plMediumAfter from '../../../../test-data/pl/medium/after.html?raw';
import plMediumBefore from '../../../../test-data/pl/medium/before.html?raw';
import plShortAfter from '../../../../test-data/pl/short/after.html?raw';
import plShortBefore from '../../../../test-data/pl/short/before.html?raw';
import ptLongAfter from '../../../../test-data/pt/long/after.html?raw';
import ptLongBefore from '../../../../test-data/pt/long/before.html?raw';
import ptMediumAfter from '../../../../test-data/pt/medium/after.html?raw';
import ptMediumBefore from '../../../../test-data/pt/medium/before.html?raw';
import ptShortAfter from '../../../../test-data/pt/short/after.html?raw';
import ptShortBefore from '../../../../test-data/pt/short/before.html?raw';
import ruLongAfter from '../../../../test-data/ru/long/after.html?raw';
import ruLongBefore from '../../../../test-data/ru/long/before.html?raw';
import ruMediumAfter from '../../../../test-data/ru/medium/after.html?raw';
import ruMediumBefore from '../../../../test-data/ru/medium/before.html?raw';
import ruShortAfter from '../../../../test-data/ru/short/after.html?raw';
import ruShortBefore from '../../../../test-data/ru/short/before.html?raw';
import zhLongAfter from '../../../../test-data/zh/long/after.html?raw';
import zhLongBefore from '../../../../test-data/zh/long/before.html?raw';
import zhMediumAfter from '../../../../test-data/zh/medium/after.html?raw';
import zhMediumBefore from '../../../../test-data/zh/medium/before.html?raw';
import zhShortAfter from '../../../../test-data/zh/short/after.html?raw';
import zhShortBefore from '../../../../test-data/zh/short/before.html?raw';
import { diffHtml } from './diff-html';
import { parseHtml } from './html/parse-html';
import { readerText } from './html/reader-text';
import { sanitizeHtmlPieces } from './html/sanitize-html';
import { splitLines } from './html/split-lines';
import {
  type Comparison,
  DEFAULT_DIFF_OPTIONS,
  LineChangeKind,
  type ViewLine,
  type ViewRow,
} from './model';

const ID_PREFIX = 'diff';
const TEMPLATE_TAG = 'template';
const COLUMN_SIZERS_SELECTOR = '[data-diffwise-column-sizers]';
const REMOVED_SELECTOR = 'del.diffwise-diff__highlight--removed';
const ADDED_SELECTOR = 'ins.diffwise-diff__highlight--added';
const MARKER_SELECTOR = `${REMOVED_SELECTOR}, ${ADDED_SELECTOR}`;
const ENGLISH = 'en';
const CHINESE = 'zh';
const JAPANESE = 'ja';

/** The line of the medium sample that names the ways to organize notes. */
const INTRODUCTION_LINE = 2;

/** A mark that belongs to the letter before it, such as a vowel sign of Hindi. */
const COMBINING_MARK_START = /^\p{M}/u;

/** The earlier and the later version of a sample. */
interface Sample {
  readonly before: string;
  readonly after: string;
}

/** Sizes of the samples, each a folder in the folder of its language. */
const SampleSize = {
  Short: 'short',
  Medium: 'medium',
  Long: 'long',
} as const;

type SampleSize = (typeof SampleSize)[keyof typeof SampleSize];

/** The samples of one language, by size. */
type LanguageSamples = Readonly<Record<SampleSize, Sample>>;

const SIZES = Object.values(SampleSize);

const ENGLISH_SAMPLES: LanguageSamples = {
  short: { before: enShortBefore, after: enShortAfter },
  medium: { before: enMediumBefore, after: enMediumAfter },
  long: { before: enLongBefore, after: enLongAfter },
};

/** Translations of the English samples, by their folder in `test-data/`. */
const TRANSLATED_SAMPLES: Readonly<Record<string, LanguageSamples>> = {
  pl: {
    short: { before: plShortBefore, after: plShortAfter },
    medium: { before: plMediumBefore, after: plMediumAfter },
    long: { before: plLongBefore, after: plLongAfter },
  },
  zh: {
    short: { before: zhShortBefore, after: zhShortAfter },
    medium: { before: zhMediumBefore, after: zhMediumAfter },
    long: { before: zhLongBefore, after: zhLongAfter },
  },
  es: {
    short: { before: esShortBefore, after: esShortAfter },
    medium: { before: esMediumBefore, after: esMediumAfter },
    long: { before: esLongBefore, after: esLongAfter },
  },
  hi: {
    short: { before: hiShortBefore, after: hiShortAfter },
    medium: { before: hiMediumBefore, after: hiMediumAfter },
    long: { before: hiLongBefore, after: hiLongAfter },
  },
  fr: {
    short: { before: frShortBefore, after: frShortAfter },
    medium: { before: frMediumBefore, after: frMediumAfter },
    long: { before: frLongBefore, after: frLongAfter },
  },
  ru: {
    short: { before: ruShortBefore, after: ruShortAfter },
    medium: { before: ruMediumBefore, after: ruMediumAfter },
    long: { before: ruLongBefore, after: ruLongAfter },
  },
  pt: {
    short: { before: ptShortBefore, after: ptShortAfter },
    medium: { before: ptMediumBefore, after: ptMediumAfter },
    long: { before: ptLongBefore, after: ptLongAfter },
  },
  it: {
    short: { before: itShortBefore, after: itShortAfter },
    medium: { before: itMediumBefore, after: itMediumAfter },
    long: { before: itLongBefore, after: itLongAfter },
  },
  ja: {
    short: { before: jaShortBefore, after: jaShortAfter },
    medium: { before: jaMediumBefore, after: jaMediumAfter },
    long: { before: jaLongBefore, after: jaLongAfter },
  },
  de: {
    short: { before: deShortBefore, after: deShortAfter },
    medium: { before: deMediumBefore, after: deMediumAfter },
    long: { before: deLongBefore, after: deLongAfter },
  },
  ko: {
    short: { before: koShortBefore, after: koShortAfter },
    medium: { before: koMediumBefore, after: koMediumAfter },
    long: { before: koLongBefore, after: koLongAfter },
  },
};

const LANGUAGES = Object.keys(TRANSLATED_SAMPLES);

/** Each translated sample as `[language, size]`. */
const LANGUAGE_SIZES = LANGUAGES.flatMap((language) =>
  SIZES.map((size): [string, SampleSize] => [language, size]),
);

/** Each sample, the English ones too, as `[language, size]`. */
const ALL_LANGUAGE_SIZES = [ENGLISH, ...LANGUAGES].flatMap((language) =>
  SIZES.map((size): [string, SampleSize] => [language, size]),
);

/** Diffs of the samples by language and size; each sample is compared on first use. */
const sampleDiffs = new Map<string, Comparison>();

/**
 * The diff of a sample with the default options. Tests share it, because comparing a long sample
 * takes most of the time of a test.
 */
function sampleDiff(language: string, size: SampleSize): Comparison {
  const key = `${language}/${size}`;
  const sharedDiff = sampleDiffs.get(key);

  if (sharedDiff !== undefined) {
    return sharedDiff;
  }

  const { before, after } = sampleOf(language, size);
  const settings = {
    options: DEFAULT_DIFF_OPTIONS,
    idPrefix: ID_PREFIX,
    mergesChangedLines: false,
    marksAllWhitespace: false,
  };
  const diff = diffHtml(before, after, settings);

  sampleDiffs.set(key, diff);

  return diff;
}

function sampleOf(language: string, size: SampleSize): Sample {
  return (TRANSLATED_SAMPLES[language] ?? ENGLISH_SAMPLES)[size];
}

/** A row as `[kind, old number, new number]`; a missing line is `null`. */
function rowShape({ kind, oldLine, newLine }: ViewRow) {
  return [kind, oldLine?.number ?? null, newLine?.number ?? null];
}

/** True for an unchanged row whose two lines are not lines of a table. */
function isUnchangedOutsideTables({ kind, oldLine, newLine }: ViewRow): boolean {
  return kind === LineChangeKind.Unchanged && oldLine?.table === null && newLine?.table === null;
}

/** A row as `[old number, new number, kinds of details]`. */
function detailShape(row: ViewRow) {
  return [row.oldLine?.number, row.newLine?.number, row.changeDetails.map(({ kind }) => kind)];
}

/** A row as `[kind, old number, new number, removed texts, added texts]`. */
function rowSummary(row: ViewRow) {
  return [
    ...rowShape(row),
    markersOf(row.oldLine, REMOVED_SELECTOR).map(textOfMarker),
    markersOf(row.newLine, ADDED_SELECTOR).map(textOfMarker),
  ];
}

/** The row that shows the new line with the number. */
function rowWithNewLine(rows: readonly ViewRow[], number: number): ViewRow {
  const row = rows.find(({ newLine }) => newLine?.number === number);

  if (row === undefined) {
    throw new Error(`No row with new line ${number}`);
  }

  return row;
}

function markersOf(line: ViewLine | null, selector: string): Element[] {
  return line === null ? [] : Array.from(fragmentOf(line.html).querySelectorAll(selector));
}

function textOfMarker(marker: Element): string | null {
  return marker.textContent;
}

function hasChangeDetails(row: ViewRow): boolean {
  return row.changeDetails.length > 0;
}

function hasMarkers({ oldLine, newLine }: ViewRow): boolean {
  return [oldLine, newLine].some((line) => markersOf(line, MARKER_SELECTOR).length > 0);
}

/** True when a marker or the text after it starts with a mark of the letter before it. */
function splitsLetter(marker: Element): boolean {
  const textAfter = marker.nextSibling?.textContent ?? '';
  return (
    COMBINING_MARK_START.test(marker.textContent ?? '') || COMBINING_MARK_START.test(textAfter)
  );
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

describe('diffHtml with the samples in every language', () => {
  it.each(LANGUAGE_SIZES)(
    'shows the rows and counts of the English sample in %s %s',
    (language, size) => {
      const { rows, stats } = sampleDiff(language, size);
      const english = sampleDiff(ENGLISH, size);

      expect(rows.map(rowShape)).toEqual(english.rows.map(rowShape));
      expect(stats).toEqual(english.stats);
    },
  );

  it.each(LANGUAGES)('describes the changes of the English long sample in %s', (language) => {
    const rowsWithDetails = sampleDiff(language, SampleSize.Long).rows.filter(hasChangeDetails);
    const englishRows = sampleDiff(ENGLISH, SampleSize.Long).rows.filter(hasChangeDetails);

    expect(rowsWithDetails.map(detailShape)).toEqual(englishRows.map(detailShape));
  });

  it.each(LANGUAGE_SIZES)('keeps the text of every line of %s %s', (language, size) => {
    const { before, after } = sampleOf(language, size);
    const oldTexts = lineTexts(before);
    const newTexts = lineTexts(after);

    for (const { oldLine, newLine } of sampleDiff(language, size).rows) {
      if (oldLine) {
        expect(textOf(oldLine)).toBe(oldTexts[oldLine.number - 1]);
      }

      if (newLine) {
        expect(textOf(newLine)).toBe(newTexts[newLine.number - 1]);
      }
    }
  });

  it.each(LANGUAGE_SIZES)('marks words only in changed rows of %s %s', (language, size) => {
    const markedKinds = new Set(
      sampleDiff(language, size)
        .rows.filter(hasMarkers)
        .map((row) => row.kind),
    );

    expect([...markedKinds]).toEqual([LineChangeKind.Changed]);
  });

  it.each(ALL_LANGUAGE_SIZES)(
    'needs no second cleaning of the unchanged lines outside tables of %s %s',
    (language, size) => {
      const unchangedHtml = sampleDiff(language, size)
        .rows.filter(isUnchangedOutsideTables)
        .flatMap(({ oldLine, newLine }) => [oldLine?.html, newLine?.html])
        .filter((html) => html !== undefined);

      expect(unchangedHtml.length).toBeGreaterThan(0);
      expect(sanitizeHtmlPieces(unchangedHtml)).toEqual(unchangedHtml);
    },
  );

  it.each(LANGUAGE_SIZES)('never splits a letter from its marks in %s %s', (language, size) => {
    const markers = sampleDiff(language, size).rows.flatMap(({ oldLine, newLine }) => [
      ...markersOf(oldLine, MARKER_SELECTOR),
      ...markersOf(newLine, MARKER_SELECTOR),
    ]);

    expect(markers.filter(splitsLetter).map(textOfMarker)).toEqual([]);
  });

  it('marks the changed words of a Chinese sentence, not the whole sentence', () => {
    const { rows } = sampleDiff(CHINESE, SampleSize.Medium);

    expect(rowSummary(rowWithNewLine(rows, INTRODUCTION_LINE))).toEqual([
      LineChangeKind.Changed,
      INTRODUCTION_LINE,
      INTRODUCTION_LINE,
      ['三'],
      ['四', '、笔记本组'],
    ]);
  });

  it('marks the changed words of a Japanese sentence, not the whole sentence', () => {
    const { rows } = sampleDiff(JAPANESE, SampleSize.Medium);

    expect(rowSummary(rowWithNewLine(rows, INTRODUCTION_LINE))).toEqual([
      LineChangeKind.Changed,
      INTRODUCTION_LINE,
      INTRODUCTION_LINE,
      ['三つ'],
      ['四つ', '、スタック'],
    ]);
  });
});
