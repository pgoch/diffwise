import { LineChangeKind } from '../model';

/** A row of the comparison, by how its line differs. */
export interface ComparedRowKind {
  readonly kind: LineChangeKind;
}

/**
 * Adjacent changed rows: changed, added and removed lines with no unchanged line between them. The
 * navigation steps from block to block, so a passage rewritten across several lines is one step.
 */
export interface ChangeBlock {
  /** Position of the first compared row of the block. */
  readonly firstRow: number;
  /** Position of the last compared row of the block; the same as `firstRow` for one row. */
  readonly lastRow: number;
}

/**
 * The blocks of adjacent changed rows, in the order of the document. The compared rows stand in the
 * same order in either layout, so both layouts have the same blocks.
 */
export function changeBlocks(rows: readonly ComparedRowKind[]): ChangeBlock[] {
  const blocks: ChangeBlock[] = [];
  let firstRow: number | null = null;

  for (let position = 0; position <= rows.length; position++) {
    const isChanged = position < rows.length && rows[position].kind !== LineChangeKind.Unchanged;

    if (isChanged && firstRow === null) {
      firstRow = position;
    } else if (!isChanged && firstRow !== null) {
      blocks.push({ firstRow, lastRow: position - 1 });
      firstRow = null;
    }
  }

  return blocks;
}

/** True when both lists have the same blocks, so a new comparison keeps the same steps. */
export function areChangeBlocksEqual(
  first: readonly ChangeBlock[],
  second: readonly ChangeBlock[],
): boolean {
  return (
    first.length === second.length
    && first.every(
      (block, position) =>
        block.firstRow === second[position].firstRow && block.lastRow === second[position].lastRow,
    )
  );
}
