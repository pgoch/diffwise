import { IMAGE_CHARACTER } from '../html/reader-text';
import {
  DEFAULT_DIFF_OPTIONS,
  type Line,
  type LineChange,
  LineChangeKind,
  LineKind,
} from '../model';
import { highestScoringPairs, pairSimilarLines } from './pair-similar-lines';

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
    marker: null,
    checkbox: null,
    table: null,
    cells: [],
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
    marker: null,
    checkbox: null,
    table: null,
    cells: [],
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
  it('pairs a line with one changed word as a changed line', () => {
    expect(
      pair(
        ['You can delete the account in the settings.'],
        ['You can close the account in the settings.'],
      ),
    ).toEqual([
      [
        LineChangeKind.Changed,
        'You can delete the account in the settings.',
        'You can close the account in the settings.',
      ],
    ]);
  });

  it('keeps lines with less than half of their words in common apart', () => {
    expect(pair(['The trial lasts a month.'], ['Contact technical support.'])).toEqual([
      [LineChangeKind.Removed, 'The trial lasts a month.', null],
      [LineChangeKind.Added, null, 'Contact technical support.'],
    ]);
  });

  it('pairs the similar line even when a new line comes before it', () => {
    expect(
      pair(['The fee is 19 USD a month.'], ['New paragraph.', 'The fee is 29 USD a month.']),
    ).toEqual([
      [LineChangeKind.Added, null, 'New paragraph.'],
      [LineChangeKind.Changed, 'The fee is 19 USD a month.', 'The fee is 29 USD a month.'],
    ]);
  });

  it('pairs several lines in their order', () => {
    expect(
      pair(
        ['First paragraph of text.', 'Second paragraph of text.'],
        ['First paragraph.', 'Second paragraph.'],
      ),
    ).toEqual([
      [LineChangeKind.Changed, 'First paragraph of text.', 'First paragraph.'],
      [LineChangeKind.Changed, 'Second paragraph of text.', 'Second paragraph.'],
    ]);
  });

  it('compares words in the case the options say', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(pair(['Business Account Plus'], ['business account premium'], options)).toEqual([
      [LineChangeKind.Changed, 'Business Account Plus', 'business account premium'],
    ]);
    expect(pair(['Business Account Plus'], ['business account premium'])).toEqual([
      [LineChangeKind.Removed, 'Business Account Plus', null],
      [LineChangeKind.Added, null, 'business account premium'],
    ]);
  });

  it('lists only removed or only added lines when the other side is empty', () => {
    expect(pair(['Removed paragraph.'], [])).toEqual([
      [LineChangeKind.Removed, 'Removed paragraph.', null],
    ]);
    expect(pair([], ['New paragraph.'])).toEqual([[LineChangeKind.Added, null, 'New paragraph.']]);
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
    const removed = Array.from(
      { length: LARGE_BLOCK_SIZE },
      (_, index) => `Paragraph ${index} old`,
    );
    const added = Array.from({ length: LARGE_BLOCK_SIZE }, (_, index) => `Paragraph ${index} new`);
    const changes = pair(removed, added);

    expect(changes).toHaveLength(LARGE_BLOCK_SIZE);
    expect(changes.every(([kind]) => kind === LineChangeKind.Changed)).toBe(true);
    expect(changes[LARGE_BLOCK_SIZE - 1]).toEqual([
      LineChangeKind.Changed,
      `Paragraph ${LARGE_BLOCK_SIZE - 1} old`,
      `Paragraph ${LARGE_BLOCK_SIZE - 1} new`,
    ]);
  });
});

describe('highestScoringPairs', () => {
  it('pairs items in the order of both sides with the highest total score', () => {
    const scores = [
      [5, 0, 0],
      [0, 4, 5],
    ];

    expect(highestScoringPairs(scores, 2, 3)).toEqual([
      { oldIndex: 0, newIndex: 0 },
      { oldIndex: 1, newIndex: 2 },
    ]);
  });

  it('keeps the better of two pairs that would cross', () => {
    const scores = [
      [0, 2],
      [3, 0],
    ];

    expect(highestScoringPairs(scores, 2, 2)).toEqual([{ oldIndex: 1, newIndex: 0 }]);
  });

  it('pairs no items whose score is 0', () => {
    expect(highestScoringPairs([[0, 0]], 1, 2)).toEqual([]);
  });
});
