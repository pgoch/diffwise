import { LineChangeKind } from '../model';

/** A row of a view of the diff: how its line differs, and the compared row it comes from. */
export interface CollapsibleRow {
  readonly kind: LineChangeKind;
  /** Position of the compared row that the line comes from. */
  readonly sourceRow: number;
}

/** How a view hides the unchanged lines far from changes. */
export interface CollapseSettings {
  /** Unchanged lines that stay shown above and below each changed line. */
  readonly contextLines: number;
  /** Groups of hidden lines that the user has shown, by the compared row of their first line. */
  readonly shownGroups: ReadonlySet<number>;
}

/** Fewest lines a group hides; a bar in place of one line would save no room. */
const MIN_HIDDEN_LINES = 2;

/** Distance of a row from a changed row when the rows have no changes at all. */
const NO_CHANGE_NEARBY = Number.POSITIVE_INFINITY;

/** Unchanged lines that a view hides in place of their rows; a bar stands for them. */
export class HiddenLines {
  /** Position of the compared row of the first line; it names the group in either layout. */
  readonly firstRow: number;

  /** Position of the row of the first line among the rows of the view. */
  readonly position: number;

  /** Number of the hidden lines. */
  readonly count: number;

  constructor(firstRow: number, position: number, count: number) {
    this.firstRow = firstRow;
    this.position = position;
    this.count = count;
  }
}

/**
 * The rows of a view with the unchanged lines far from changes hidden: each group of unchanged
 * lines farther than `contextLines` from every changed line stands as one `HiddenLines`, unless the
 * user has shown it, or it has a single line. Changed, added and removed lines always show.
 *
 * Between a changed line and an unchanged one stand only unchanged lines, and each of them is one
 * row in either layout, so both layouts hide the same lines, and a group has the same name in both.
 */
export function collapseRows<Row extends CollapsibleRow>(
  rows: readonly Row[],
  settings: CollapseSettings,
): (Row | HiddenLines)[] {
  const distances = distancesToChanges(rows);
  const isFar = (position: number) => distances[position] > settings.contextLines;
  const collapsed: (Row | HiddenLines)[] = [];
  let position = 0;

  while (position < rows.length) {
    let end = position + 1;

    if (isFar(position)) {
      while (end < rows.length && isFar(end)) {
        end++;
      }
    }

    const firstRow = rows[position].sourceRow;
    const hides = end - position >= MIN_HIDDEN_LINES && !settings.shownGroups.has(firstRow);

    if (hides) {
      collapsed.push(new HiddenLines(firstRow, position, end - position));
    } else {
      pushRows(collapsed, rows, position, end);
    }

    position = end;
  }

  return collapsed;
}

/** For each row, how many rows away the nearest changed, added or removed row stands. */
function distancesToChanges(rows: readonly CollapsibleRow[]): number[] {
  const distances: number[] = [];
  let lastChange = -NO_CHANGE_NEARBY;

  rows.forEach((row, position) => {
    if (isChange(row)) {
      lastChange = position;
    }

    distances.push(position - lastChange);
  });

  let nextChange = NO_CHANGE_NEARBY;

  for (let position = rows.length - 1; position >= 0; position--) {
    if (isChange(rows[position])) {
      nextChange = position;
    }

    distances[position] = Math.min(distances[position], nextChange - position);
  }

  return distances;
}

/** True when the row is not unchanged. */
function isChange(row: CollapsibleRow): boolean {
  return row.kind !== LineChangeKind.Unchanged;
}

/** Adds the rows from `start` up to `end` one by one, as a long run could not be spread. */
function pushRows<Row>(
  target: (Row | HiddenLines)[],
  rows: readonly Row[],
  start: number,
  end: number,
): void {
  for (let position = start; position < end; position++) {
    target.push(rows[position]);
  }
}
