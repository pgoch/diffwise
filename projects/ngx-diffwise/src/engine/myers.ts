/** Steps of an edit script that turns the old sequence into the new one. */
export const EditKind = {
  /** The item is in both sequences. */
  Equal: 'equal',
  /** The item is only in the old sequence. */
  Delete: 'delete',
  /** The item is only in the new sequence. */
  Insert: 'insert',
} as const;

export type EditKind = (typeof EditKind)[keyof typeof EditKind];

/** One step of an edit script, with the positions of its item. */
export type Edit =
  | { readonly kind: typeof EditKind.Equal; readonly oldIndex: number; readonly newIndex: number }
  | { readonly kind: typeof EditKind.Delete; readonly oldIndex: number }
  | { readonly kind: typeof EditKind.Insert; readonly newIndex: number };

/** Items still to compare: `[oldStart, oldEnd)` of the old ones and `[newStart, newEnd)` of the new. */
interface Box {
  readonly oldStart: number;
  readonly oldEnd: number;
  readonly newStart: number;
  readonly newEnd: number;
}

/** Point of the edit graph inside a box: `x` old items and `y` new items lie before it. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** Sizes of the edit graph of a box. */
interface GraphSize {
  readonly oldLength: number;
  readonly newLength: number;
}

const NOT_REACHED = -1;

/**
 * Shortest edit script that turns `oldItems` into `newItems`, comparing items with `===`.
 * Uses the linear-space Myers algorithm, as Git does (Myers 1986, section 4b).
 */
export function myersDiff<T>(oldItems: readonly T[], newItems: readonly T[]): Edit[] {
  const edits: Edit[] = [];
  const box = { oldStart: 0, oldEnd: oldItems.length, newStart: 0, newEnd: newItems.length };

  diffBox(oldItems, newItems, box, edits);

  return edits;
}

/** Adds the edits of a box: equal items at both ends directly, the rest split in halves. */
function diffBox<T>(oldItems: readonly T[], newItems: readonly T[], box: Box, edits: Edit[]): void {
  const prefixLength = commonPrefixLength(oldItems, newItems, box);
  const suffixLength = commonSuffixLength(oldItems, newItems, box, prefixLength);
  const middle: Box = {
    oldStart: box.oldStart + prefixLength,
    oldEnd: box.oldEnd - suffixLength,
    newStart: box.newStart + prefixLength,
    newEnd: box.newEnd - suffixLength,
  };

  addEquals(box.oldStart, box.newStart, prefixLength, edits);
  diffMiddle(oldItems, newItems, middle, edits);
  addEquals(middle.oldEnd, middle.newEnd, suffixLength, edits);
}

/** Adds the edits of a box whose first items differ and whose last items differ. */
function diffMiddle<T>(
  oldItems: readonly T[],
  newItems: readonly T[],
  box: Box,
  edits: Edit[],
): void {
  const split = findSplitPoint(oldItems, newItems, box);

  if (split === null) {
    addDeletes(box.oldStart, box.oldEnd, edits);
    addInserts(box.newStart, box.newEnd, edits);
    return;
  }

  const oldSplit = box.oldStart + split.x;
  const newSplit = box.newStart + split.y;

  diffBox(oldItems, newItems, { ...box, oldEnd: oldSplit, newEnd: newSplit }, edits);
  diffBox(oldItems, newItems, { ...box, oldStart: oldSplit, newStart: newSplit }, edits);
}

/**
 * Searches the shortest edit path from both ends until the searches meet, as diff-match-patch does.
 * Returns the meeting point, or `null` when the box has no equal items at all.
 */
function findSplitPoint<T>(oldItems: readonly T[], newItems: readonly T[], box: Box): Point | null {
  const size = { oldLength: box.oldEnd - box.oldStart, newLength: box.newEnd - box.newStart };
  const delta = size.oldLength - size.newLength;
  const deltaIsOdd = delta % 2 !== 0;
  const maxEdits = Math.ceil((size.oldLength + size.newLength) / 2);
  const forward = new SearchFront(
    maxEdits,
    size,
    (x, y) => oldItems[box.oldStart + x] === newItems[box.newStart + y],
  );
  const backward = new SearchFront(
    maxEdits,
    size,
    (x, y) => oldItems[box.oldEnd - 1 - x] === newItems[box.newEnd - 1 - y],
  );

  for (let editCount = 0; editCount < maxEdits; editCount++) {
    for (const diagonal of forward.diagonals(editCount)) {
      const forwardX = forward.extend(diagonal, editCount);

      if (deltaIsOdd && meet(forwardX, backward.furthestX(delta - diagonal), size)) {
        return { x: forwardX, y: forwardX - diagonal };
      }
    }

    for (const diagonal of backward.diagonals(editCount)) {
      const backwardX = backward.extend(diagonal, editCount);
      const forwardX = forward.furthestX(delta - diagonal);

      if (!deltaIsOdd && meet(forwardX, backwardX, size)) {
        return { x: forwardX, y: forwardX - (delta - diagonal) };
      }
    }
  }

  return null;
}

/** True when the forward and backward paths on one diagonal together cover all old items. */
function meet(forwardX: number, backwardX: number, size: GraphSize): boolean {
  return (
    forwardX !== NOT_REACHED && backwardX !== NOT_REACHED && forwardX + backwardX >= size.oldLength
  );
}

/** One direction of the search: the furthest x on each diagonal (k = x - y). */
class SearchFront {
  private readonly furthest: Int32Array;
  private readonly offset: number;
  private lowCut = 0;
  private highCut = 0;

  constructor(
    maxEdits: number,
    private readonly size: GraphSize,
    private readonly matches: (x: number, y: number) => boolean,
  ) {
    this.offset = maxEdits + 1;
    this.furthest = new Int32Array(2 * this.offset + 1).fill(NOT_REACHED);
    this.furthest[this.offset + 1] = 0;
  }

  /** Diagonals to extend after `editCount` edits; paths that left the graph are cut off. */
  *diagonals(editCount: number): Generator<number> {
    for (
      let diagonal = -editCount + this.lowCut;
      diagonal <= editCount - this.highCut;
      diagonal += 2
    ) {
      yield diagonal;
    }
  }

  /** Furthest x on a diagonal, or `NOT_REACHED`. */
  furthestX(diagonal: number): number {
    return this.furthest[this.offset + diagonal] ?? NOT_REACHED;
  }

  /** Takes one more edit onto `diagonal`, then moves over equal items; `NOT_REACHED` outside the graph. */
  extend(diagonal: number, editCount: number): number {
    const fromAbove =
      diagonal === -editCount ||
      (diagonal !== editCount && this.furthestX(diagonal - 1) < this.furthestX(diagonal + 1));
    let x = fromAbove ? this.furthestX(diagonal + 1) : this.furthestX(diagonal - 1) + 1;
    let y = x - diagonal;

    while (x < this.size.oldLength && y < this.size.newLength && this.matches(x, y)) {
      x++;
      y++;
    }

    this.furthest[this.offset + diagonal] = x;

    if (x > this.size.oldLength) {
      this.highCut += 2;
      return NOT_REACHED;
    }

    if (y > this.size.newLength) {
      this.lowCut += 2;
      return NOT_REACHED;
    }

    return x;
  }
}

function commonPrefixLength<T>(oldItems: readonly T[], newItems: readonly T[], box: Box): number {
  let length = 0;

  while (
    box.oldStart + length < box.oldEnd &&
    box.newStart + length < box.newEnd &&
    oldItems[box.oldStart + length] === newItems[box.newStart + length]
  ) {
    length++;
  }

  return length;
}

/** Length of the common end that does not overlap the first `prefixLength` items. */
function commonSuffixLength<T>(
  oldItems: readonly T[],
  newItems: readonly T[],
  box: Box,
  prefixLength: number,
): number {
  let length = 0;

  while (
    box.oldEnd - length > box.oldStart + prefixLength &&
    box.newEnd - length > box.newStart + prefixLength &&
    oldItems[box.oldEnd - length - 1] === newItems[box.newEnd - length - 1]
  ) {
    length++;
  }

  return length;
}

function addEquals(oldStart: number, newStart: number, count: number, edits: Edit[]): void {
  for (let offset = 0; offset < count; offset++) {
    edits.push({ kind: EditKind.Equal, oldIndex: oldStart + offset, newIndex: newStart + offset });
  }
}

function addDeletes(oldStart: number, oldEnd: number, edits: Edit[]): void {
  for (let oldIndex = oldStart; oldIndex < oldEnd; oldIndex++) {
    edits.push({ kind: EditKind.Delete, oldIndex });
  }
}

function addInserts(newStart: number, newEnd: number, edits: Edit[]): void {
  for (let newIndex = newStart; newIndex < newEnd; newIndex++) {
    edits.push({ kind: EditKind.Insert, newIndex });
  }
}
