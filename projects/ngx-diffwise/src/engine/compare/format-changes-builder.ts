import type { FormatDifference } from './format-comparer';
import type { ChangeDetail, DescribedChanges, Line, MarkedRange, TextRange } from '../model';

const WHITESPACE_ONLY = /^\s*$/;

/** One side of the comparison: its line and the ranges of its changed text. */
export interface ComparedSide {
  readonly line: Line;
  readonly changedText: readonly TextRange[];
}

/** Unchanged characters next to each other whose format changed in the same way. */
interface FormatChangeRun {
  readonly oldStart: number;
  oldEnd: number;
  readonly newStart: number;
  newEnd: number;
  readonly difference: FormatDifference;
}

/** Joins pairs of characters whose format changed in the same way into ranges and details. */
export class FormatChangesBuilder {
  private readonly oldRanges: MarkedRange[] = [];
  private readonly newRanges: MarkedRange[] = [];
  private readonly details: ChangeDetail[] = [];
  private openRun: FormatChangeRun | null = null;

  constructor(
    private readonly oldSide: ComparedSide,
    private readonly newSide: ComparedSide,
  ) {}

  /** Adds a pair of unchanged characters; `difference` is `null` when their format is the same. */
  add(oldPosition: number, newPosition: number, difference: FormatDifference | null): void {
    if (difference === null) {
      this.closeRun();
      return;
    }

    const run = this.openRun;
    const extendsRun = run !== null && this.canExtend(run, oldPosition, newPosition, difference);

    if (extendsRun) {
      run.oldEnd = oldPosition + 1;
      run.newEnd = newPosition + 1;
      return;
    }

    this.closeRun();
    this.openRun = {
      oldStart: oldPosition,
      oldEnd: oldPosition + 1,
      newStart: newPosition,
      newEnd: newPosition + 1,
      difference,
    };
  }

  build(): DescribedChanges {
    this.closeRun();
    return { oldRanges: this.oldRanges, newRanges: this.newRanges, details: this.details };
  }

  /** True when the change is the same as the run's and only unchanged whitespace lies between. */
  private canExtend(
    run: FormatChangeRun,
    oldPosition: number,
    newPosition: number,
    difference: FormatDifference,
  ): boolean {
    return (
      run.difference.key === difference.key
      && isUnchangedWhitespace(this.oldSide, run.oldEnd, oldPosition)
      && isUnchangedWhitespace(this.newSide, run.newEnd, newPosition)
    );
  }

  /** Turns the open run into a range on each side, both pointing to the run's details. */
  private closeRun(): void {
    const run = this.openRun;

    if (run === null) {
      return;
    }

    const firstIndex = this.details.length;
    const detailIndices = run.difference.details.map((_, offset) => firstIndex + offset);

    this.details.push(...run.difference.details);
    this.oldRanges.push({ start: run.oldStart, end: run.oldEnd, detailIndices });
    this.newRanges.push({ start: run.newStart, end: run.newEnd, detailIndices });
    this.openRun = null;
  }
}

/** True when the text from `start` to `end` is whitespace that no change of text touches. */
function isUnchangedWhitespace(
  { line, changedText }: ComparedSide,
  start: number,
  end: number,
): boolean {
  const isWhitespace = WHITESPACE_ONLY.test(line.text.slice(start, end));
  const isChanged = changedText.some((range) => range.start < end && start < range.end);

  return isWhitespace && !isChanged;
}
