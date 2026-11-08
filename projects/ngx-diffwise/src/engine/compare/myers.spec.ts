import { type Edit, EditKind, myersDiff } from './myers';

const ALPHABET = ['a', 'b', 'c', 'd'];
const SEED = 2026;

/** Many short random cases cover the corners; fewer long ones cover deep splitting. */
const RANDOM_RUNS = [
  { cases: 500, maxLength: 12 },
  { cases: 50, maxLength: 200 },
];

/** Short notation of an edit script: `=a` equal, `-a` deleted, `+a` inserted. */
function notation(oldItems: string[], newItems: string[]): string[] {
  return myersDiff(oldItems, newItems).map((edit) => {
    switch (edit.kind) {
      case EditKind.Equal:
        return `=${oldItems[edit.oldIndex]}`;
      case EditKind.Delete:
        return `-${oldItems[edit.oldIndex]}`;
      case EditKind.Insert:
        return `+${newItems[edit.newIndex]}`;
    }
  });
}

/** Both sequences rebuilt from an edit script, to check that it is complete and in order. */
function rebuild(edits: Edit[], oldItems: string[], newItems: string[]) {
  const oldRebuilt: string[] = [];
  const newRebuilt: string[] = [];

  for (const edit of edits) {
    if (edit.kind !== EditKind.Insert) {
      oldRebuilt.push(oldItems[edit.oldIndex]);
      expect(edit.oldIndex).toBe(oldRebuilt.length - 1);
    }

    if (edit.kind !== EditKind.Delete) {
      newRebuilt.push(newItems[edit.newIndex]);
      expect(edit.newIndex).toBe(newRebuilt.length - 1);
    }

    if (edit.kind === EditKind.Equal) {
      expect(oldItems[edit.oldIndex]).toBe(newItems[edit.newIndex]);
    }
  }

  return { oldRebuilt, newRebuilt };
}

/** Length of the longest common subsequence, by plain dynamic programming. */
function lcsLength(oldItems: string[], newItems: string[]): number {
  const lengths = Array.from({ length: oldItems.length + 1 }, () =>
    new Array<number>(newItems.length + 1).fill(0),
  );

  for (let i = 1; i <= oldItems.length; i++) {
    for (let j = 1; j <= newItems.length; j++) {
      const lengthWithItem = lengths[i - 1][j - 1] + 1;
      const lengthWithoutItem = Math.max(lengths[i - 1][j], lengths[i][j - 1]);

      lengths[i][j] = oldItems[i - 1] === newItems[j - 1] ? lengthWithItem : lengthWithoutItem;
    }
  }

  return lengths[oldItems.length][newItems.length];
}

/** Mulberry32: a small seeded generator, so the random cases are the same on every run. */
function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);

    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

function randomSequence(random: () => number, maxLength: number): string[] {
  const length = Math.floor(random() * (maxLength + 1));
  return Array.from({ length }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]);
}

describe('myersDiff', () => {
  it('keeps identical sequences equal', () => {
    expect(notation(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual(['=a', '=b', '=c']);
  });

  it('handles empty sequences', () => {
    expect(notation([], [])).toEqual([]);
    expect(notation([], ['a', 'b'])).toEqual(['+a', '+b']);
    expect(notation(['a', 'b'], [])).toEqual(['-a', '-b']);
  });

  it('finds a single insertion and deletion in the middle', () => {
    expect(notation(['a', 'c'], ['a', 'b', 'c'])).toEqual(['=a', '+b', '=c']);
    expect(notation(['a', 'b', 'c'], ['a', 'c'])).toEqual(['=a', '-b', '=c']);
  });

  it('deletes before inserting when nothing is in common', () => {
    expect(notation(['a', 'b'], ['c', 'd'])).toEqual(['-a', '-b', '+c', '+d']);
  });

  it('finds the shortest script for the example from the Myers paper', () => {
    const oldItems = [...'abcabba'];
    const newItems = [...'cbabac'];
    const edits = myersDiff(oldItems, newItems);
    const changes = edits.filter((edit) => edit.kind !== EditKind.Equal);

    expect(changes).toHaveLength(5);
    expect(rebuild(edits, oldItems, newItems)).toEqual({
      oldRebuilt: oldItems,
      newRebuilt: newItems,
    });
  });

  it.each(RANDOM_RUNS)(
    'gives a complete and shortest script for $cases random pairs up to $maxLength items',
    ({ cases, maxLength }) => {
      const random = seededRandom(SEED);

      for (let run = 0; run < cases; run++) {
        const oldItems = randomSequence(random, maxLength);
        const newItems = randomSequence(random, maxLength);
        const edits = myersDiff(oldItems, newItems);
        const equalCount = edits.filter((edit) => edit.kind === EditKind.Equal).length;

        expect(rebuild(edits, oldItems, newItems)).toEqual({
          oldRebuilt: oldItems,
          newRebuilt: newItems,
        });
        expect(equalCount).toBe(lcsLength(oldItems, newItems));
      }
    },
  );
});
