import { type Edit, EditKind, myersDiff } from './myers';
import { slideChanges } from './slide-changes';

const BLANK = '';
const ITEMS = [BLANK, 'a', 'b'];
const MAX_LENGTH = 4;

/** Short notation of an edit script: `=a` equal, `-a` deleted, `+a` inserted; a blank line is `_`. */
function notation(edits: readonly Edit[], oldItems: string[], newItems: string[]): string[] {
  const shown = (item: string) => (item.length === 0 ? '_' : item);

  return edits.map((edit) => {
    switch (edit.kind) {
      case EditKind.Equal:
        return `=${shown(oldItems[edit.oldIndex])}`;
      case EditKind.Delete:
        return `-${shown(oldItems[edit.oldIndex])}`;
      case EditKind.Insert:
        return `+${shown(newItems[edit.newIndex])}`;
    }
  });
}

function equal(oldIndex: number, newIndex: number): Edit {
  return { kind: EditKind.Equal, oldIndex, newIndex };
}

function deleted(oldIndex: number): Edit {
  return { kind: EditKind.Delete, oldIndex };
}

function inserted(newIndex: number): Edit {
  return { kind: EditKind.Insert, newIndex };
}

/**
 * What makes an edit script complete: the positions of each sequence it goes through, which must
 * be all of them in order, and whether each equal pair holds equal items.
 */
function scriptShape(edits: readonly Edit[], oldItems: string[], newItems: string[]) {
  const oldPositions = edits.flatMap((edit) =>
    edit.kind === EditKind.Insert ? [] : edit.oldIndex,
  );
  const newPositions = edits.flatMap((edit) =>
    edit.kind === EditKind.Delete ? [] : edit.newIndex,
  );
  const equalPairsMatch = edits.every(
    (edit) => edit.kind !== EditKind.Equal || oldItems[edit.oldIndex] === newItems[edit.newIndex],
  );

  return { oldPositions, newPositions, equalPairsMatch };
}

/** Every sequence of the items up to the length, the empty one first. */
function allSequences(maxLength: number): string[][] {
  const sequences: string[][] = [[]];

  for (const sequence of sequences) {
    if (sequence.length < maxLength) {
      sequences.push(...ITEMS.map((item) => [...sequence, item]));
    }
  }

  return sequences;
}

function equalCount(edits: readonly Edit[]): number {
  return edits.filter((edit) => edit.kind === EditKind.Equal).length;
}

describe('slideChanges', () => {
  it('joins a removed and an added line that an unchanged blank line split apart', () => {
    const oldItems = ['title', BLANK, 'three regions', 'end'];
    const newItems = ['title', BLANK, 'four regions', BLANK, 'end'];
    const edits = [equal(0, 0), inserted(1), inserted(2), equal(1, 3), deleted(2), equal(3, 4)];

    expect(notation(slideChanges(edits, oldItems, newItems), oldItems, newItems)).toEqual([
      '=title',
      '=_',
      '-three regions',
      '+four regions',
      '+_',
      '=end',
    ]);
  });

  it('moves an added section below the blank lines above it', () => {
    const oldItems = ['text', BLANK, BLANK, 'end'];
    const newItems = ['text', BLANK, BLANK, 'section', 'line', BLANK, BLANK, 'end'];
    const edits = [
      equal(0, 0),
      inserted(1),
      inserted(2),
      inserted(3),
      inserted(4),
      equal(1, 5),
      equal(2, 6),
      equal(3, 7),
    ];

    expect(notation(slideChanges(edits, oldItems, newItems), oldItems, newItems)).toEqual([
      '=text',
      '=_',
      '=_',
      '+section',
      '+line',
      '+_',
      '+_',
      '=end',
    ]);
  });

  it('joins the changes that a group meets while it slides', () => {
    const oldItems = ['table', BLANK, BLANK, 'old prices'];
    const newItems = ['table', 'new row', BLANK, 'new prices'];
    const edits = [equal(0, 0), deleted(1), inserted(1), equal(2, 2), deleted(3), inserted(3)];

    expect(notation(slideChanges(edits, oldItems, newItems), oldItems, newItems)).toEqual([
      '=table',
      '+new row',
      '=_',
      '-_',
      '-old prices',
      '+new prices',
    ]);
  });

  it('keeps changes that no equal line around them can take', () => {
    const oldItems = ['a', 'b', 'c'];
    const newItems = ['a', 'x', 'c'];
    const edits = [equal(0, 0), deleted(1), inserted(1), equal(2, 2)];

    expect(slideChanges(edits, oldItems, newItems)).toEqual(edits);
  });

  it('keeps the edits of identical and of empty sequences', () => {
    const items = ['a', BLANK, 'b'];
    const sameItems = [equal(0, 0), equal(1, 1), equal(2, 2)];

    expect(slideChanges(sameItems, items, items)).toEqual(sameItems);
    expect(slideChanges([], [], [])).toEqual([]);
    expect(slideChanges([inserted(0)], [], ['a'])).toEqual([inserted(0)]);
    expect(slideChanges([deleted(0)], ['a'], [])).toEqual([deleted(0)]);
  });

  it('keeps the script complete and as short for every pair of short sequences', () => {
    const sequences = allSequences(MAX_LENGTH);

    for (const oldItems of sequences) {
      for (const newItems of sequences) {
        const edits = myersDiff(oldItems, newItems);
        const slidEdits = slideChanges(edits, oldItems, newItems);

        expect(scriptShape(slidEdits, oldItems, newItems)).toEqual({
          oldPositions: [...oldItems.keys()],
          newPositions: [...newItems.keys()],
          equalPairsMatch: true,
        });
        expect(equalCount(slidEdits)).toBe(equalCount(edits));
      }
    }
  });
});
