import { comparisonText } from './comparison-text';
import type { DiffOptions, TextRange, WordChanges } from '../model';
import { type Edit, EditKind, myersDiff } from './myers';
import { type Token, TokenKind, splitWords } from './split-words';

const WHITESPACE_ONLY = /^\s*$/;
const WHITESPACE_CHARACTER = /\s/;

/** One side of the comparison: its text, the tokens compared and their compared texts. */
interface ComparedText {
  readonly text: string;
  readonly tokens: readonly Token[];
  readonly keys: readonly string[];
}

/** Tokens next to each other, `[start, end)` in token positions of one side. */
interface TokenRun {
  readonly start: number;
  readonly end: number;
}

/** Changed tokens next to each other. */
interface ChangedRun extends TokenRun {
  /** True when the other side has no change here, so the run may slide over equal tokens. */
  readonly canSlide: boolean;
}

/** Changed runs of both sides, in reading order. */
interface ChangedRuns {
  readonly removedRuns: readonly ChangedRun[];
  readonly addedRuns: readonly ChangedRun[];
}

/** Text removed from and added to a changed line, compared word by word. */
export function diffWords(oldText: string, newText: string, options: DiffOptions): WordChanges {
  const oldSide = comparedText(oldText, options);
  const newSide = comparedText(newText, options);
  const runsBuilder = new ChangedRunsBuilder();

  for (const edit of myersDiff(oldSide.keys, newSide.keys)) {
    runsBuilder.add(edit);
  }

  const { removedRuns, addedRuns } = runsBuilder.build();
  const removed = changedRanges(removedRuns, oldSide);
  const added = changedRanges(addedRuns, newSide);

  return { removed, added };
}

function comparedText(text: string, options: DiffOptions): ComparedText {
  const tokens = comparedTokens(text, options);
  const keys = tokens.map((token) => comparisonText(token.text, options));

  return { text, tokens, keys };
}

/** Tokens that take part in the comparison; whitespace drops out when it is ignored. */
function comparedTokens(text: string, options: DiffOptions): Token[] {
  const tokens = splitWords(text);
  return options.ignoreWhitespace ? withoutWhitespace(tokens) : tokens;
}

function withoutWhitespace(tokens: readonly Token[]): Token[] {
  return tokens.filter((token) => token.kind !== TokenKind.Whitespace);
}

/** Groups an edit script into blocks of changes between equal tokens: one run per changed side. */
class ChangedRunsBuilder {
  private readonly removedRuns: ChangedRun[] = [];
  private readonly addedRuns: ChangedRun[] = [];
  private removedStart = 0;
  private removedEnd = 0;
  private addedStart = 0;
  private addedEnd = 0;

  add(edit: Edit): void {
    switch (edit.kind) {
      case EditKind.Delete:
        this.removedEnd = edit.oldIndex + 1;
        break;
      case EditKind.Insert:
        this.addedEnd = edit.newIndex + 1;
        break;
      case EditKind.Equal:
        this.closeBlock();
        this.startBlock(edit.oldIndex + 1, edit.newIndex + 1);
        break;
    }
  }

  build(): ChangedRuns {
    this.closeBlock();
    return { removedRuns: this.removedRuns, addedRuns: this.addedRuns };
  }

  private startBlock(oldPosition: number, newPosition: number): void {
    this.removedStart = oldPosition;
    this.removedEnd = oldPosition;
    this.addedStart = newPosition;
    this.addedEnd = newPosition;
  }

  private closeBlock(): void {
    const removesTokens = this.removedEnd > this.removedStart;
    const addsTokens = this.addedEnd > this.addedStart;
    const canSlide = !removesTokens || !addsTokens;

    if (removesTokens) {
      this.removedRuns.push({ start: this.removedStart, end: this.removedEnd, canSlide });
    }

    if (addsTokens) {
      this.addedRuns.push({ start: this.addedStart, end: this.addedEnd, canSlide });
    }
  }
}

/** Ranges of changed text on one side: runs at their best places, joined across whitespace. */
function changedRanges(runs: readonly ChangedRun[], side: ComparedText): TextRange[] {
  const ranges: TextRange[] = [];
  let previousEnd = 0;

  for (const [index, run] of runs.entries()) {
    const nextStart = runs.at(index + 1)?.start ?? side.tokens.length;
    const placedRun = run.canSlide ? bestPlace(run, side, previousEnd, nextStart) : run;

    addRange(ranges, textRangeOf(placedRun, side), side.text);
    previousEnd = placedRun.end;
  }

  return ranges.map((range) => withoutEdgeWhitespace(range, side.text));
}

/**
 * Slides a run over equal tokens to where its edges touch whitespace, so a removed `. Next one`
 * before a final `.` becomes ` Next one.`. Stays in place when no other place is better.
 */
function bestPlace(run: TokenRun, side: ComparedText, lowest: number, highest: number): TokenRun {
  let bestRun = run;
  let bestScore = edgeScore(run, side);

  for (const place of slidePlaces(run, side.keys, lowest, highest)) {
    const score = edgeScore(place, side);

    if (score > bestScore) {
      bestRun = place;
      bestScore = score;
    }
  }

  return bestRun;
}

/** Places the run can slide to over equal tokens; the text it covers stays the same. */
function slidePlaces(
  run: TokenRun,
  keys: readonly string[],
  lowest: number,
  highest: number,
): TokenRun[] {
  const places: TokenRun[] = [];
  let leftPlace = run;
  let rightPlace = run;

  while (canSlideLeft(leftPlace, keys, lowest)) {
    leftPlace = shiftedRun(leftPlace, -1);
    places.push(leftPlace);
  }

  while (canSlideRight(rightPlace, keys, highest)) {
    rightPlace = shiftedRun(rightPlace, 1);
    places.push(rightPlace);
  }

  return places;
}

/** The run moved by `offset` tokens: left when negative, right when positive. */
function shiftedRun(run: TokenRun, offset: number): TokenRun {
  const start = run.start + offset;
  const end = run.end + offset;

  return { start, end };
}

/** True when the token before the run equals the run's last token. */
function canSlideLeft(run: TokenRun, keys: readonly string[], lowest: number): boolean {
  return run.start > lowest && keys[run.start - 1] === keys[run.end - 1];
}

/** True when the token after the run equals the run's first token. */
function canSlideRight(run: TokenRun, keys: readonly string[], highest: number): boolean {
  return run.end < highest && keys[run.end] === keys[run.start];
}

/** How many of the run's two edges touch whitespace or an end of the text. */
function edgeScore(run: TokenRun, side: ComparedText): number {
  const { start, end } = textRangeOf(run, side);
  return [start, end].filter((edge) => touchesWhitespace(side.text, edge)).length;
}

function touchesWhitespace(text: string, position: number): boolean {
  const atEndOfText = position === 0 || position === text.length;
  const whitespaceBefore = WHITESPACE_CHARACTER.test(text.charAt(position - 1));
  const whitespaceAfter = WHITESPACE_CHARACTER.test(text.charAt(position));

  return atEndOfText || whitespaceBefore || whitespaceAfter;
}

function textRangeOf(run: TokenRun, side: ComparedText): TextRange {
  const lastToken = side.tokens[run.end - 1];
  const start = side.tokens[run.start].start;
  const end = lastToken.start + lastToken.text.length;

  return { start, end };
}

/** Adds a range, joined with the previous one if only whitespace lies between. */
function addRange(ranges: TextRange[], range: TextRange, text: string): void {
  const previous = ranges.at(-1);

  if (previous && onlyWhitespaceBetween(text, previous.end, range.start)) {
    ranges[ranges.length - 1] = { start: previous.start, end: range.end };
    return;
  }

  ranges.push(range);
}

function onlyWhitespaceBetween(text: string, start: number, end: number): boolean {
  return WHITESPACE_ONLY.test(text.slice(start, end));
}

/**
 * Drops whitespace at the edges of a range, so a marker hugs its words. A range of whitespace
 * only, such as changed indentation, stays.
 */
function withoutEdgeWhitespace(range: TextRange, text: string): TextRange {
  const rangeText = text.slice(range.start, range.end);
  const words = rangeText.trim();

  if (words.length === 0) {
    return range;
  }

  const start = range.start + rangeText.length - rangeText.trimStart().length;
  const end = start + words.length;

  return { start, end };
}
