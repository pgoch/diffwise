import { comparisonText } from './comparison-text';
import { type DiffOptions, type Line, type LineChange, LineChangeKind } from '../model';
import { TokenKind, splitWords } from './split-words';

/** Lines sharing at least this part of their words are one changed line, not removed and added. */
const MIN_SIMILARITY = 0.5;

/** In bigger blocks, each line is compared only with the line at the same position. */
const MAX_COMPARED_COMBINATIONS = 10_000;

/** How often each word occurs in a line, for a quick similarity check. */
interface WordCounts {
  readonly counts: ReadonlyMap<string, number>;
  readonly total: number;
}

/** A removed and an added line, by position in the block, shown as one changed line. */
interface LinePair {
  readonly removedIndex: number;
  readonly addedIndex: number;
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

/** Order-keeping pairs with the highest total similarity, found like a longest common subsequence. */
function pairBySimilarity(
  removedWords: readonly WordCounts[],
  addedWords: readonly WordCounts[],
): LinePair[] {
  const scores = removedWords.map((removedLine) =>
    addedWords.map((addedLine) => pairScore(removedLine, addedLine)),
  );
  const best = bestTotals(scores, removedWords.length, addedWords.length);

  return collectPairs(scores, best, removedWords.length, addedWords.length);
}

/**
 * `best[i][j]`: the highest total score of pairs among the first `i` removed lines and the first
 * `j` added lines.
 */
function bestTotals(scores: number[][], removedCount: number, addedCount: number): number[][] {
  const best = Array.from({ length: removedCount + 1 }, () =>
    new Array<number>(addedCount + 1).fill(0),
  );

  for (let i = 1; i <= removedCount; i++) {
    for (let j = 1; j <= addedCount; j++) {
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
  scores: number[][],
  best: number[][],
  removedCount: number,
  addedCount: number,
): LinePair[] {
  const pairs: LinePair[] = [];
  let i = removedCount;
  let j = addedCount;

  while (i > 0 && j > 0) {
    const score = scores[i - 1][j - 1];
    const pairedHere = score > 0 && best[i][j] === best[i - 1][j - 1] + score;
    const removedLineUnpaired = best[i][j] === best[i - 1][j];

    if (pairedHere) {
      i--;
      j--;
      pairs.push({ removedIndex: i, addedIndex: j });
    } else if (removedLineUnpaired) {
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
): LinePair[] {
  const pairs: LinePair[] = [];
  const count = Math.min(removedWords.length, addedWords.length);

  for (let index = 0; index < count; index++) {
    if (pairScore(removedWords[index], addedWords[index]) > 0) {
      pairs.push({ removedIndex: index, addedIndex: index });
    }
  }

  return pairs;
}

/** Lists the block in order: before each pair, the unpaired removed lines, then the unpaired added. */
function toChanges(
  removed: readonly Line[],
  added: readonly Line[],
  pairs: readonly LinePair[],
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
    addUnpaired(pair.removedIndex, pair.addedIndex);
    changes.push({
      kind: LineChangeKind.Changed,
      oldLine: removed[pair.removedIndex],
      newLine: added[pair.addedIndex],
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

function countWords(line: Line, options: DiffOptions): WordCounts {
  const counts = new Map<string, number>();
  let total = 0;

  for (const token of splitWords(line.text)) {
    if (token.kind === TokenKind.Word) {
      const word = comparisonText(token.text, options);

      counts.set(word, (counts.get(word) ?? 0) + 1);
      total++;
    }
  }

  return { counts, total };
}
