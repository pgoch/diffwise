import { IMAGE_CHARACTER } from '../html/reader-text';
import {
  DEFAULT_DIFF_OPTIONS,
  type Line,
  type LineChange,
  LineChangeKind,
  LineKind,
} from '../model';
import { pairSimilarLines } from './pair-similar-lines';

const PARAGRAPH_TAG = 'p';
const LARGE_BLOCK_SIZE = 101;
const CHART = 'images/usage-chart.svg';
const DIAGRAM = 'images/sync-diagram.svg';

function paragraph(text: string): Line {
  return {
    kind: LineKind.Paragraph,
    tag: PARAGRAPH_TAG,
    text,
    formats: [],
    images: [],
    html: `<p>${text}</p>`,
  };
}

/** Changes as `[kind, old text, new text]`; a missing side is `null`. */
function summary(changes: LineChange[]) {
  return changes.map((change) => {
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

function pair(removed: string[], added: string[], options = DEFAULT_DIFF_OPTIONS) {
  return summary(pairSimilarLines(removed.map(paragraph), added.map(paragraph), options));
}

/** A paragraph with only an image of the file. */
function imageParagraph(source: string): Line {
  const properties = { source, width: null, height: null, altText: null };

  return {
    kind: LineKind.Paragraph,
    tag: PARAGRAPH_TAG,
    text: IMAGE_CHARACTER,
    formats: [],
    images: [{ position: 0, properties }],
    html: `<p><img src="${source}"></p>`,
  };
}

/** Pairs paragraphs with only images, as `[kind, old file, new file]`. */
function pairImages(removed: string[], added: string[]) {
  const changes = pairSimilarLines(
    removed.map(imageParagraph),
    added.map(imageParagraph),
    DEFAULT_DIFF_OPTIONS,
  );

  return changes.map((change) => {
    switch (change.kind) {
      case LineChangeKind.Removed:
        return [change.kind, sourceOf(change.oldLine), null];
      case LineChangeKind.Added:
        return [change.kind, null, sourceOf(change.newLine)];
      default:
        return [change.kind, sourceOf(change.oldLine), sourceOf(change.newLine)];
    }
  });
}

function sourceOf(line: Line): string | null {
  return line.images[0].properties.source;
}

describe('pairSimilarLines', () => {
  it('pairs a line with one changed word as a changed line (T2)', () => {
    expect(
      pair(['Konto można usunąć w ustawieniach.'], ['Konto można zamknąć w ustawieniach.']),
    ).toEqual([
      [
        LineChangeKind.Changed,
        'Konto można usunąć w ustawieniach.',
        'Konto można zamknąć w ustawieniach.',
      ],
    ]);
  });

  it('keeps lines with less than half of their words in common apart', () => {
    expect(pair(['Okres próbny trwa miesiąc.'], ['Kontakt z pomocą techniczną.'])).toEqual([
      [LineChangeKind.Removed, 'Okres próbny trwa miesiąc.', null],
      [LineChangeKind.Added, null, 'Kontakt z pomocą techniczną.'],
    ]);
  });

  it('pairs the similar line even when a new line comes before it', () => {
    expect(
      pair(
        ['Opłata wynosi 19 zł miesięcznie.'],
        ['Nowy akapit.', 'Opłata wynosi 29 zł miesięcznie.'],
      ),
    ).toEqual([
      [LineChangeKind.Added, null, 'Nowy akapit.'],
      [
        LineChangeKind.Changed,
        'Opłata wynosi 19 zł miesięcznie.',
        'Opłata wynosi 29 zł miesięcznie.',
      ],
    ]);
  });

  it('pairs several lines in their order', () => {
    expect(
      pair(
        ['Pierwszy akapit tekstu.', 'Drugi akapit tekstu.'],
        ['Pierwszy akapit.', 'Drugi akapit.'],
      ),
    ).toEqual([
      [LineChangeKind.Changed, 'Pierwszy akapit tekstu.', 'Pierwszy akapit.'],
      [LineChangeKind.Changed, 'Drugi akapit tekstu.', 'Drugi akapit.'],
    ]);
  });

  it('compares words in the case the options say (T9)', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(pair(['Konto Firmowe Plus'], ['konto firmowe premium'], options)).toEqual([
      [LineChangeKind.Changed, 'Konto Firmowe Plus', 'konto firmowe premium'],
    ]);
    expect(pair(['Konto Firmowe Plus'], ['konto firmowe premium'])).toEqual([
      [LineChangeKind.Removed, 'Konto Firmowe Plus', null],
      [LineChangeKind.Added, null, 'konto firmowe premium'],
    ]);
  });

  it('lists only removed or only added lines when the other side is empty', () => {
    expect(pair(['Usunięty akapit.'], [])).toEqual([
      [LineChangeKind.Removed, 'Usunięty akapit.', null],
    ]);
    expect(pair([], ['Nowy akapit.'])).toEqual([[LineChangeKind.Added, null, 'Nowy akapit.']]);
  });

  it('pairs lines with only an image, also when the file changed', () => {
    expect(pairImages([CHART], [CHART])).toEqual([[LineChangeKind.Changed, CHART, CHART]]);
    expect(pairImages([CHART], [DIAGRAM])).toEqual([[LineChangeKind.Changed, CHART, DIAGRAM]]);
  });

  it('pairs an image with the same file before an image with another file', () => {
    expect(pairImages([CHART], [DIAGRAM, CHART])).toEqual([
      [LineChangeKind.Added, null, DIAGRAM],
      [LineChangeKind.Changed, CHART, CHART],
    ]);
    expect(pairImages([CHART], [CHART, DIAGRAM])).toEqual([
      [LineChangeKind.Changed, CHART, CHART],
      [LineChangeKind.Added, null, DIAGRAM],
    ]);
  });

  it('pairs lines at the same position in very large blocks', () => {
    const removed = Array.from({ length: LARGE_BLOCK_SIZE }, (_, index) => `Akapit ${index} stary`);
    const added = Array.from({ length: LARGE_BLOCK_SIZE }, (_, index) => `Akapit ${index} nowy`);
    const changes = pair(removed, added);

    expect(changes).toHaveLength(LARGE_BLOCK_SIZE);
    expect(changes.every(([kind]) => kind === LineChangeKind.Changed)).toBe(true);
    expect(changes[LARGE_BLOCK_SIZE - 1]).toEqual([
      LineChangeKind.Changed,
      `Akapit ${LARGE_BLOCK_SIZE - 1} stary`,
      `Akapit ${LARGE_BLOCK_SIZE - 1} nowy`,
    ]);
  });
});
