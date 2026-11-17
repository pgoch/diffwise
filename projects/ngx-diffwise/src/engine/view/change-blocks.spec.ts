import { diffHtml } from '../diff-html';
import { DEFAULT_DIFF_OPTIONS, LineChangeKind } from '../model';
import { areChangeBlocksEqual, changeBlocks } from './change-blocks';

const ID_PREFIX = 'diff';
const PARAGRAPH_COUNT = 60;

const UNCHANGED = LineChangeKind.Unchanged;
const CHANGED = LineChangeKind.Changed;
const ADDED = LineChangeKind.Added;
const REMOVED = LineChangeKind.Removed;

/** Sixty paragraphs, numbered from 1, with another word in the paragraphs of the given numbers. */
function paragraphs(changedNumbers: readonly number[]): string {
  return Array.from({ length: PARAGRAPH_COUNT }, (_, index) => {
    const number = index + 1;
    const word = changedNumbers.includes(number) ? 'changed' : 'sample';

    return `<p>Paragraph ${number} of the ${word} document.</p>`;
  }).join('');
}

/** Blocks of rows of the given kinds, as `[first row, last row]`. */
function blocksOf(kinds: readonly LineChangeKind[]) {
  return changeBlocks(kinds.map((kind) => ({ kind }))).map(({ firstRow, lastRow }) => [
    firstRow,
    lastRow,
  ]);
}

describe('changeBlocks', () => {
  it('finds three blocks in sixty paragraphs changed in lines 5–6, 30 and 55', () => {
    const settings = {
      options: DEFAULT_DIFF_OPTIONS,
      idPrefix: ID_PREFIX,
      mergesChangedLines: false,
      marksAllWhitespace: false,
    };
    const { rows } = diffHtml(paragraphs([]), paragraphs([5, 6, 30, 55]), settings);

    expect(changeBlocks(rows)).toEqual([
      { firstRow: 4, lastRow: 5 },
      { firstRow: 29, lastRow: 29 },
      { firstRow: 54, lastRow: 54 },
    ]);
  });

  it('joins changed, removed and added lines with no unchanged line between them', () => {
    expect(blocksOf([UNCHANGED, CHANGED, REMOVED, ADDED, UNCHANGED, ADDED])).toEqual([
      [1, 3],
      [5, 5],
    ]);
  });

  it('starts a new block after a single unchanged line', () => {
    expect(blocksOf([REMOVED, UNCHANGED, ADDED])).toEqual([
      [0, 0],
      [2, 2],
    ]);
  });

  it('finds blocks at the start and the end of the document', () => {
    expect(blocksOf([ADDED, ADDED, UNCHANGED, UNCHANGED, CHANGED])).toEqual([
      [0, 1],
      [4, 4],
    ]);
  });

  it('finds no blocks in the same versions, nor in an empty document', () => {
    expect(blocksOf([UNCHANGED, UNCHANGED])).toEqual([]);
    expect(blocksOf([])).toEqual([]);
  });
});

describe('areChangeBlocksEqual', () => {
  it('compares blocks by their rows', () => {
    const blocks = changeBlocks([{ kind: CHANGED }, { kind: UNCHANGED }, { kind: ADDED }]);
    const sameRows = blocks.map((block) => ({ ...block }));
    const longerFirst = [{ firstRow: 0, lastRow: 1 }, blocks[1]];

    expect(areChangeBlocksEqual(blocks, sameRows)).toBe(true);
    expect(areChangeBlocksEqual(blocks, longerFirst)).toBe(false);
    expect(areChangeBlocksEqual(blocks, blocks.slice(1))).toBe(false);
  });
});
