import { PLAIN_FORMAT } from '../html/text-format';
import {
  type ChangeDetail,
  ChangeDetailKind,
  type DiffOptions,
  type FormattedRange,
  type FormattingChangeDetail,
  FormattingValue,
  type FormattingValueChange,
  type Line,
  type MarkedRange,
  type TextFormat,
  type TextRange,
  type WordChanges,
} from '../model';
import { type Token, TokenKind, splitWords } from './split-words';

const WHITESPACE_ONLY = /^\s*$/;
const FORMATTING_VALUES = Object.values(FormattingValue);

/** Formatting and link changes of a changed line pair. */
export interface FormatChanges {
  /** Ranges in the old line's text, with the positions of their details. */
  readonly oldRanges: readonly MarkedRange[];
  /** Ranges in the new line's text, with the positions of their details. */
  readonly newRanges: readonly MarkedRange[];
  readonly details: readonly ChangeDetail[];
}

/** One side of the comparison: its line and the ranges of its changed text. */
interface ComparedSide {
  readonly line: Line;
  readonly changedText: readonly TextRange[];
}

/** What changed in a format, and a key that is equal for equal changes. */
interface FormatDifference {
  readonly details: readonly ChangeDetail[];
  readonly key: string;
}

/** Unchanged characters next to each other whose format changed in the same way. */
interface FormatChangeRun {
  readonly oldStart: number;
  oldEnd: number;
  readonly newStart: number;
  newEnd: number;
  readonly difference: FormatDifference;
}

const NO_FORMAT_CHANGES: FormatChanges = { oldRanges: [], newRanges: [], details: [] };

/**
 * Compares the formats of unchanged words in a changed line pair. Characters next to each other
 * whose format changed in the same way become one range on each side, with the change details.
 */
export function diffFormats(
  oldLine: Line,
  newLine: Line,
  wordChanges: WordChanges,
  options: DiffOptions,
): FormatChanges {
  if (options.ignoreFormatting && options.ignoreLinkChanges) {
    return NO_FORMAT_CHANGES;
  }

  const oldSide = { line: oldLine, changedText: wordChanges.removed };
  const newSide = { line: newLine, changedText: wordChanges.added };
  const oldFormats = new FormatCursor(oldLine.formats);
  const newFormats = new FormatCursor(newLine.formats);
  const comparer = new FormatComparer(options);
  const builder = new FormatChangesBuilder(oldSide, newSide);

  for (const [oldPosition, newPosition] of unchangedCharacterPairs(oldSide, newSide)) {
    const oldFormat = oldFormats.formatAt(oldPosition);
    const newFormat = newFormats.formatAt(newPosition);

    builder.add(oldPosition, newPosition, comparer.difference(oldFormat, newFormat));
  }

  return builder.build();
}

/** Positions of unchanged characters other than whitespace, paired in reading order. */
function* unchangedCharacterPairs(
  oldSide: ComparedSide,
  newSide: ComparedSide,
): Generator<[number, number]> {
  const oldTokens = unchangedTokens(oldSide);
  const newTokens = unchangedTokens(newSide);
  const tokenCount = Math.min(oldTokens.length, newTokens.length);

  for (let index = 0; index < tokenCount; index++) {
    const oldToken = oldTokens[index];
    const newToken = newTokens[index];
    const length = Math.min(oldToken.text.length, newToken.text.length);

    for (let offset = 0; offset < length; offset++) {
      yield [oldToken.start + offset, newToken.start + offset];
    }
  }
}

/** Words and symbols outside the changed text; both sides have the same ones, in the same order. */
function unchangedTokens({ line, changedText }: ComparedSide): Token[] {
  return splitWords(line.text).filter(
    (token) => token.kind !== TokenKind.Whitespace && !overlapsAny(token, changedText),
  );
}

function overlapsAny(token: Token, ranges: readonly TextRange[]): boolean {
  const tokenEnd = token.start + token.text.length;
  return ranges.some((range) => range.start < tokenEnd && token.start < range.end);
}

/** Finds the format at increasing positions of a line's text. */
class FormatCursor {
  private index = 0;

  constructor(private readonly formats: readonly FormattedRange[]) {}

  /** Format of the character at the position; plain where no piece of text holds it. */
  formatAt(position: number): TextFormat {
    while (this.currentRangeEndsBefore(position)) {
      this.index++;
    }

    const range = this.formats.at(this.index);
    const holdsPosition = range !== undefined && range.start <= position;

    return holdsPosition ? range.format : PLAIN_FORMAT;
  }

  private currentRangeEndsBefore(position: number): boolean {
    const range = this.formats.at(this.index);
    return range !== undefined && range.end <= position;
  }
}

/** Finds what changed between formats; remembers every pair of formats it compared. */
class FormatComparer {
  private readonly differences = new Map<TextFormat, Map<TextFormat, FormatDifference | null>>();

  constructor(private readonly options: DiffOptions) {}

  /** What changed between two formats; `null` when nothing that counts did. */
  difference(oldFormat: TextFormat, newFormat: TextFormat): FormatDifference | null {
    const knownDifferences = this.differencesFrom(oldFormat);
    let difference = knownDifferences.get(newFormat);

    if (difference === undefined) {
      difference = formatDifference(oldFormat, newFormat, this.options);
      knownDifferences.set(newFormat, difference);
    }

    return difference;
  }

  /** Differences found so far between the old format and new formats. */
  private differencesFrom(oldFormat: TextFormat): Map<TextFormat, FormatDifference | null> {
    let differences = this.differences.get(oldFormat);

    if (differences === undefined) {
      differences = new Map();
      this.differences.set(oldFormat, differences);
    }

    return differences;
  }
}

/** What changed between two formats; `null` when nothing that counts did. */
function formatDifference(
  oldFormat: TextFormat,
  newFormat: TextFormat,
  options: DiffOptions,
): FormatDifference | null {
  const details = changeDetails(oldFormat, newFormat, options);

  if (details.length === 0) {
    return null;
  }

  return { details, key: JSON.stringify(details) };
}

/** Details of a formatting change, a link change, or both, as far as the options count them. */
function changeDetails(
  oldFormat: TextFormat,
  newFormat: TextFormat,
  options: DiffOptions,
): ChangeDetail[] {
  const details: ChangeDetail[] = [];
  const formattingDetail = options.ignoreFormatting ? null : formattingChange(oldFormat, newFormat);
  const linkChanged = !options.ignoreLinkChanges && oldFormat.link !== newFormat.link;

  if (formattingDetail !== null) {
    details.push(formattingDetail);
  }

  if (linkChanged) {
    details.push({ kind: ChangeDetailKind.Link, oldLink: oldFormat.link, newLink: newFormat.link });
  }

  return details;
}

/** The change between the formatting of two formats; `null` when it is the same. */
function formattingChange(
  oldFormat: TextFormat,
  newFormat: TextFormat,
): FormattingChangeDetail | null {
  const removedStyles = oldFormat.styles.filter((style) => !newFormat.styles.includes(style));
  const addedStyles = newFormat.styles.filter((style) => !oldFormat.styles.includes(style));
  const changedValues = changedValuesBetween(oldFormat, newFormat);
  const formattingIsSame =
    removedStyles.length === 0 && addedStyles.length === 0 && changedValues.length === 0;

  if (formattingIsSame) {
    return null;
  }

  return { kind: ChangeDetailKind.Formatting, removedStyles, addedStyles, changedValues };
}

/** Values that differ between two formats, in the order of `FormattingValue`. */
function changedValuesBetween(
  oldFormat: TextFormat,
  newFormat: TextFormat,
): FormattingValueChange[] {
  const changedNames = FORMATTING_VALUES.filter(
    (name) => oldFormat.values[name] !== newFormat.values[name],
  );

  return changedNames.map((name) => ({
    name,
    oldValue: oldFormat.values[name],
    newValue: newFormat.values[name],
  }));
}

/** Joins pairs of characters whose format changed in the same way into ranges and details. */
class FormatChangesBuilder {
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

  build(): FormatChanges {
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
