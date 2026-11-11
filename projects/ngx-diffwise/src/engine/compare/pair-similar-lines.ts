import { imageWordKey } from './comparison-image';
import { comparisonText } from './comparison-text';
import { IMAGE_CHARACTER } from '../html/reader-text';
import { type DiffOptions, type Line, type LineChange, LineChangeKind } from '../model';
import { TokenKind, splitWords } from './split-words';

/** Lines sharing at least this part of their words are one changed line, not removed and added. */
const MIN_SIMILARITY = 0.5;

/** A word every image has, besides the key of its file; no text word contains the character. */
const ANY_IMAGE_WORD = IMAGE_CHARACTER;

/** In bigger blocks, each line is compared only with the line at the same position. */
const MAX_COMPARED_COMBINATIONS = 10_000;

/** How often each word occurs in a line, for a quick similarity check. */
interface WordCounts {
  readonly counts: ReadonlyMap<string, number>;
  readonly total: number;
}

/** Positions of an old and a new item that make a pair, such as two lines or two table columns. */
export interface ItemPair {
  readonly oldIndex: number;
  readonly newIndex: number;
}

/**
 * Turns a block of removed and added lines into changes, pairing similar lines as changed.
 * Pairs keep the order of both sides; the pairing with the highest total similarity wins.
 */
export function pairSimilarLines(
  removed: readonly Line[],
  added: readonly Line[],
  options: DiffOptions,
): LineChange[] {
  const removedWords = removed.map((line) => countWords(line, options));
  const addedWords = added.map((line) => countWords(line, options));
  const blockIsLarge = removed.length * added.length > MAX_COMPARED_COMBINATIONS;
  const pairs = blockIsLarge
    ? pairByPosition(removedWords, addedWords)
    : pairBySimilarity(removedWords, addedWords);

  return toChanges(removed, added, pairs);
}

/**
 * Pairs of old and new items that keep the order of both sides and have the highest total score,
 * found like a longest common subsequence. Only items whose score is above 0 make a pair.
 */
export function highestScoringPairs(
  scores: readonly (readonly number[])[],
  oldCount: number,
  newCount: number,
): ItemPair[] {
  const best = bestTotals(scores, oldCount, newCount);
  return collectPairs(scores, best, oldCount, newCount);
}

/** Order-keeping pairs of removed and added lines with the highest total similarity. */
function pairBySimilarity(
  removedWords: readonly WordCounts[],
  addedWords: readonly WordCounts[],
): ItemPair[] {
  const scores = removedWords.map((removedLine) =>
    addedWords.map((addedLine) => pairScore(removedLine, addedLine)),
  );

  return highestScoringPairs(scores, removedWords.length, addedWords.length);
}

/**
 * `best[i][j]`: the highest total score of pairs among the first `i` old items and the first `j`
 * new items.
 */
function bestTotals(
  scores: readonly (readonly number[])[],
  oldCount: number,
  newCount: number,
): number[][] {
  const best = Array.from({ length: oldCount + 1 }, () => new Array<number>(newCount + 1).fill(0));

  for (let i = 1; i <= oldCount; i++) {
    for (let j = 1; j <= newCount; j++) {
      const score = scores[i - 1][j - 1];
      const totalIfPaired = best[i - 1][j - 1] + score;
      const pairingTotal = score > 0 ? totalIfPaired : 0;

      best[i][j] = Math.max(best[i - 1][j], best[i][j - 1], pairingTotal);
    }
  }

  return best;
}

/** Walks the table of best totals back from the end and collects the pairs that made them. */
function collectPairs(
  scores: readonly (readonly number[])[],
  best: number[][],
  oldCount: number,
  newCount: number,
): ItemPair[] {
  const pairs: ItemPair[] = [];
  let i = oldCount;
  let j = newCount;

  while (i > 0 && j > 0) {
    const score = scores[i - 1][j - 1];
    const pairedHere = score > 0 && best[i][j] === best[i - 1][j - 1] + score;
    const oldItemUnpaired = best[i][j] === best[i - 1][j];

    if (pairedHere) {
      pairs.push({ oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (oldItemUnpaired) {
      i--;
    } else {
      j--;
    }
  }

  return pairs.reverse();
}

/** Pairs each removed line only with the added line at the same position, if they are similar. */
function pairByPosition(
  removedWords: readonly WordCounts[],
  addedWords: readonly WordCounts[],
): ItemPair[] {
  const pairs: ItemPair[] = [];
  const count = Math.min(removedWords.length, addedWords.length);

  for (let index = 0; index < count; index++) {
    if (pairScore(removedWords[index], addedWords[index]) > 0) {
      pairs.push({ oldIndex: index, newIndex: index });
    }
  }

  return pairs;
}

/** Lists the block in order: before each pair, the unpaired removed lines, then the unpaired added. */
function toChanges(
  removed: readonly Line[],
  added: readonly Line[],
  pairs: readonly ItemPair[],
): LineChange[] {
  const changes: LineChange[] = [];
  let nextRemoved = 0;
  let nextAdded = 0;

  const addUnpaired = (removedEnd: number, addedEnd: number): void => {
    while (nextRemoved < removedEnd) {
      changes.push({ kind: LineChangeKind.Removed, oldLine: removed[nextRemoved] });
      nextRemoved++;
    }

    while (nextAdded < addedEnd) {
      changes.push({ kind: LineChangeKind.Added, newLine: added[nextAdded] });
      nextAdded++;
    }
  };

  for (const pair of pairs) {
    addUnpaired(pair.oldIndex, pair.newIndex);
    changes.push({
      kind: LineChangeKind.Changed,
      oldLine: removed[pair.oldIndex],
      newLine: added[pair.newIndex],
    });
    nextRemoved++;
    nextAdded++;
  }

  addUnpaired(removed.length, added.length);

  return changes;
}

/** Similarity of two lines when it is high enough to pair them, otherwise 0. */
function pairScore(first: WordCounts, second: WordCounts): number {
  const score = similarity(first, second);
  return score >= MIN_SIMILARITY ? score : 0;
}

/** Part of the words two lines have in common, from 0 (none) to 1 (all), in any order. */
function similarity(first: WordCounts, second: WordCounts): number {
  const total = first.total + second.total;

  if (total === 0) {
    return 0;
  }

  let common = 0;

  for (const [word, count] of first.counts) {
    common += Math.min(count, second.counts.get(word) ?? 0);
  }

  return (2 * common) / total;
}

/**
 * Counts the words of a line. An image counts as two words: one that all images share and the key
 * of its file, so a line whose image was replaced stays half similar.
 */
function countWords(line: Line, options: DiffOptions): WordCounts {
  const textWords = splitWords(line.text)
    .filter((token) => token.kind === TokenKind.Word)
    .map((token) => comparisonText(token.text, options));
  const imageWords = line.images.flatMap((image) => [ANY_IMAGE_WORD, imageWordKey(image)]);
  const words = [...textWords, ...imageWords];
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return { counts, total: words.length };
}
