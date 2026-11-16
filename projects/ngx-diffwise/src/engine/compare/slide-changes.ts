import { type Edit, EditKind } from './myers';

/**
 * Changed lines next to each other in one version, `[start, end)` in its positions. A group lies
 * between two unchanged lines, or an end of the version, and is empty where nothing changed.
 */
interface ChangeGroup {
  start: number;
  end: number;
}

/**
 * Moves each group of changed lines over the equal lines around it, which keeps the comparison just
 * as short, so that it meets the changes of the other version where it can. A removed and an added
 * line that an unchanged blank line split apart then become one block, whose similar lines pair up.
 * A group that meets no changes ends as low as it can: an added section keeps the blank lines above
 * it unchanged and takes the blank lines below it. Works like the compaction in Git's diff.
 */
export function slideChanges(
  edits: readonly Edit[],
  oldKeys: readonly string[],
  newKeys: readonly string[],
): Edit[] {
  const oldVersion = new VersionChanges(oldKeys);
  const newVersion = new VersionChanges(newKeys);

  for (const edit of edits) {
    if (edit.kind === EditKind.Delete) {
      oldVersion.markChanged(edit.oldIndex);
    } else if (edit.kind === EditKind.Insert) {
      newVersion.markChanged(edit.newIndex);
    }
  }

  slideGroups(oldVersion, newVersion);
  slideGroups(newVersion, oldVersion);

  return editsOf(oldVersion, newVersion);
}

/**
 * Slides each group of changed lines of a version up and down as far as it can, joining the groups
 * it meets, and then back up to the lowest place where it meets changes of the other version. The
 * group of the other version between the same unchanged lines moves along.
 */
function slideGroups(version: VersionChanges, other: VersionChanges): void {
  const group = version.firstGroup();
  const otherGroup = other.firstGroup();

  do {
    if (!isEmpty(group)) {
      slideGroup(version, group, other, otherGroup);
    }
  } while (version.toNextGroup(group) && other.toNextGroup(otherGroup));
}

function slideGroup(
  version: VersionChanges,
  group: ChangeGroup,
  other: VersionChanges,
  otherGroup: ChangeGroup,
): void {
  let size: number;
  let highestEnd: number;
  let meetsOtherChanges: boolean;

  do {
    size = group.end - group.start;

    while (version.slideUp(group)) {
      other.toPreviousGroup(otherGroup);
    }

    highestEnd = group.end;
    meetsOtherChanges = !isEmpty(otherGroup);

    while (version.slideDown(group)) {
      other.toNextGroup(otherGroup);
      meetsOtherChanges ||= !isEmpty(otherGroup);
    }
  } while (size !== group.end - group.start);

  const couldSlide = group.end !== highestEnd;

  if (couldSlide && meetsOtherChanges) {
    while (isEmpty(otherGroup)) {
      version.slideUp(group);
      other.toPreviousGroup(otherGroup);
    }
  }
}

function isEmpty(group: ChangeGroup): boolean {
  return group.end === group.start;
}

/**
 * The edits of both versions in reading order. Unchanged lines of the versions pair up in order,
 * and before each pair go the removed lines, then the added lines.
 */
function editsOf(oldVersion: VersionChanges, newVersion: VersionChanges): Edit[] {
  const edits: Edit[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldVersion.length || newIndex < newVersion.length) {
    if (oldVersion.isChanged(oldIndex)) {
      edits.push({ kind: EditKind.Delete, oldIndex });
      oldIndex++;
    } else if (newVersion.isChanged(newIndex)) {
      edits.push({ kind: EditKind.Insert, newIndex });
      newIndex++;
    } else {
      edits.push({ kind: EditKind.Equal, oldIndex, newIndex });
      oldIndex++;
      newIndex++;
    }
  }

  return edits;
}

/** The lines of one version, by their keys, and which of them changed. */
class VersionChanges {
  private readonly changed: boolean[];

  constructor(private readonly keys: readonly string[]) {
    this.changed = new Array<boolean>(keys.length).fill(false);
  }

  get length(): number {
    return this.keys.length;
  }

  markChanged(position: number): void {
    this.changed[position] = true;
  }

  /** True for a changed line; false for an unchanged one and past the end of the version. */
  isChanged(position: number): boolean {
    return position < this.length && this.changed[position];
  }

  /** The group that starts the version, empty when its first line is unchanged. */
  firstGroup(): ChangeGroup {
    const group = { start: 0, end: 0 };

    this.extendDown(group);

    return group;
  }

  /** Moves to the group after the unchanged line below; false when the group ends the version. */
  toNextGroup(group: ChangeGroup): boolean {
    if (group.end === this.length) {
      return false;
    }

    group.start = group.end + 1;
    group.end = group.start;
    this.extendDown(group);

    return true;
  }

  /** Moves to the group before the unchanged line above; false when the group starts the version. */
  toPreviousGroup(group: ChangeGroup): boolean {
    if (group.start === 0) {
      return false;
    }

    group.end = group.start - 1;
    group.start = group.end;
    this.extendUp(group);

    return true;
  }

  /**
   * Moves the group one line up when the unchanged line above equals its last line, and joins the
   * group above if they meet. Returns false when the group cannot move.
   */
  slideUp(group: ChangeGroup): boolean {
    const canSlide = group.start > 0 && this.keys[group.start - 1] === this.keys[group.end - 1];

    if (!canSlide) {
      return false;
    }

    group.start--;
    group.end--;
    this.changed[group.start] = true;
    this.changed[group.end] = false;
    this.extendUp(group);

    return true;
  }

  /**
   * Moves the group one line down when the unchanged line below equals its first line, and joins
   * the group below if they meet. Returns false when the group cannot move.
   */
  slideDown(group: ChangeGroup): boolean {
    const canSlide = group.end < this.length && this.keys[group.start] === this.keys[group.end];

    if (!canSlide) {
      return false;
    }

    this.changed[group.start] = false;
    this.changed[group.end] = true;
    group.start++;
    group.end++;
    this.extendDown(group);

    return true;
  }

  private extendUp(group: ChangeGroup): void {
    while (group.start > 0 && this.changed[group.start - 1]) {
      group.start--;
    }
  }

  private extendDown(group: ChangeGroup): void {
    while (group.end < this.length && this.changed[group.end]) {
      group.end++;
    }
  }
}
