import { imageWordKey } from './comparison-image';
import { comparisonText } from './comparison-text';
import type {
  DiffOptions,
  LineContent,
  LineImage,
  RemovedRange,
  TextRange,
  WordChanges,
} from '../model';
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
  /**
   * For each old token, and for the end of the old tokens, the number of new tokens up to the last
   * equal token before it. Text removed there stood after these new tokens.
   */
  readonly newTokensBefore: readonly number[];
}

/** Changed text of one side, and the token whose place the text takes among the equal tokens. */
interface PlacedRange extends TextRange {
  readonly placeToken: number;
}

/** Text removed from and added to a changed line, compared word by word; an image is a word. */
export function diffWords(
  oldLine: LineContent,
  newLine: LineContent,
  options: DiffOptions,
): WordChanges {
  const oldSide = comparedText(oldLine, options);
  const newSide = comparedText(newLine, options);
  const runsBuilder = new ChangedRunsBuilder();

  for (const edit of myersDiff(oldSide.keys, newSide.keys)) {
    runsBuilder.add(edit);
  }

  const { removedRuns, addedRuns, newTokensBefore } = runsBuilder.build();
  const removedRanges = changedRanges(removedRuns, oldSide);
  const addedRanges = changedRanges(addedRuns, newSide);
  const removed = removedRanges.map((range) => removedRange(range, newTokensBefore, newSide));
  const added = addedRanges.map(textRange);

  return { removed, added };
}

/** The removed text with the place in the new text where it stood: before the next new token. */
function removedRange(
  { start, end, placeToken }: PlacedRange,
  newTokensBefore: readonly number[],
  newSide: ComparedText,
): RemovedRange {
  const nextNewToken = newSide.tokens.at(newTokensBefore[placeToken]);
  return { start, end, newPosition: nextNewToken?.start ?? newSide.text.length };
}

/** A copy of the range with its start and end alone. */
function textRange({ start, end }: TextRange): TextRange {
  return { start, end };
}

/**
 * Words, symbols and images that unchanged text keeps on both sides, in the same order: tokens
 * outside the changed text, apart from whitespace.
 */
export function unchangedTokens(text: string, changedText: readonly TextRange[]): Token[] {
  return splitWords(text).filter(
    (token) => token.kind !== TokenKind.Whitespace && !overlapsAny(token, changedText),
  );
}

/** True when the token overlaps one of the ranges. */
function overlapsAny(token: Token, ranges: readonly TextRange[]): boolean {
  const tokenEnd = token.start + token.text.length;
  return ranges.some((range) => range.start < tokenEnd && token.start < range.end);
}

/** The text of a line as tokens, with the keys that the comparison compares. */
function comparedText({ text, images }: LineContent, options: DiffOptions): ComparedText {
  const tokens = comparedTokens(text, options);
  const imagesByPosition = new Map(images.map((image) => [image.position, image]));
  const keys = tokens.map((token) => tokenKey(token, imagesByPosition, options));

  return { text, tokens, keys };
}

/** Key of a token: the key of the image in its place, or its text in the compared form. */
function tokenKey(
  token: Token,
  imagesByPosition: ReadonlyMap<number, LineImage>,
  options: DiffOptions,
): string {
  const image = imagesByPosition.get(token.start);
  return image === undefined ? comparisonText(token.text, options) : imageWordKey(image);
}

/** Tokens that take part in the comparison; whitespace drops out when it is ignored. */
function comparedTokens(text: string, options: DiffOptions): Token[] {
  const tokens = splitWords(text);
  return options.ignoreWhitespace ? withoutWhitespace(tokens) : tokens;
}

/** The tokens without whitespace. */
function withoutWhitespace(tokens: readonly Token[]): Token[] {
  return tokens.filter((token) => token.kind !== TokenKind.Whitespace);
}

/** Groups an edit script into blocks of changes between equal tokens: one run per changed side. */
class ChangedRunsBuilder {
  private readonly removedRuns: ChangedRun[] = [];
  private readonly addedRuns: ChangedRun[] = [];
  private readonly newTokensBefore: number[] = [];
  private newTokensUpToLastEqual = 0;
  private removedStart = 0;
  private removedEnd = 0;
  private addedStart = 0;
  private addedEnd = 0;

  /** Adds the next edit of the comparison of tokens. */
  add(edit: Edit): void {
    switch (edit.kind) {
      case EditKind.Delete:
        this.newTokensBefore.push(this.newTokensUpToLastEqual);
        this.removedEnd = edit.oldIndex + 1;
        break;
      case EditKind.Insert:
        this.addedEnd = edit.newIndex + 1;
        break;
      case EditKind.Equal:
        this.newTokensBefore.push(this.newTokensUpToLastEqual);
        this.newTokensUpToLastEqual = edit.newIndex + 1;
        this.closeBlock();
        this.startBlock(edit.oldIndex + 1, edit.newIndex + 1);
        break;
    }
  }

  /** The removed and added runs of tokens, and the new tokens before each removed run. */
  build(): ChangedRuns {
    this.closeBlock();

    return {
      removedRuns: this.removedRuns,
      addedRuns: this.addedRuns,
      newTokensBefore: [...this.newTokensBefore, this.newTokensUpToLastEqual],
    };
  }

  /** Starts a block of changes at the positions of both versions. */
  private startBlock(oldPosition: number, newPosition: number): void {
    this.removedStart = oldPosition;
    this.removedEnd = oldPosition;
    this.addedStart = newPosition;
    this.addedEnd = newPosition;
  }

  /** Ends the open block of changes and keeps its removed and added runs. */
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
function changedRanges(runs: readonly ChangedRun[], side: ComparedText): PlacedRange[] {
  const ranges: PlacedRange[] = [];
  let previousEnd = 0;

  for (const [index, run] of runs.entries()) {
    const nextStart = runs.at(index + 1)?.start ?? side.tokens.length;
    const placedRun = run.canSlide ? bestPlace(run, side, previousEnd, nextStart) : run;
    const placeToken = placeTokenOf(placedRun, run);

    addRange(ranges, { ...textRangeOf(placedRun, side), placeToken }, side.text);
    previousEnd = placedRun.end;
  }

  return ranges.map((range) => withoutEdgeWhitespace(range, side.text));
}

/**
 * The token whose place among the equal tokens a placed run takes: its first token, or the token
 * after it when the run slid forward, over tokens that now stand before it.
 */
function placeTokenOf(placedRun: TokenRun, run: TokenRun): number {
  const slidForward = placedRun.start > run.start;
  return slidForward ? placedRun.end : placedRun.start;
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
  return { start: run.start + offset, end: run.end + offset };
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

/** True when the position stands at an end of the text or next to whitespace. */
function touchesWhitespace(text: string, position: number): boolean {
  const atEndOfText = position === 0 || position === text.length;
  const whitespaceBefore = WHITESPACE_CHARACTER.test(text.charAt(position - 1));
  const whitespaceAfter = WHITESPACE_CHARACTER.test(text.charAt(position));

  return atEndOfText || whitespaceBefore || whitespaceAfter;
}

/** The range of text that a run of tokens covers. */
function textRangeOf(run: TokenRun, side: ComparedText): TextRange {
  const firstToken = side.tokens[run.start];
  const lastToken = side.tokens[run.end - 1];

  return { start: firstToken.start, end: lastToken.start + lastToken.text.length };
}

/** Adds a range, joined with the previous one if only whitespace lies between. */
function addRange(ranges: PlacedRange[], range: PlacedRange, text: string): void {
  const previous = ranges.at(-1);

  if (previous && onlyWhitespaceBetween(text, previous.end, range.start)) {
    ranges[ranges.length - 1] = { ...previous, end: range.end };
    return;
  }

  ranges.push(range);
}

/** True when only whitespace stands between the two positions. */
function onlyWhitespaceBetween(text: string, start: number, end: number): boolean {
  return WHITESPACE_ONLY.test(text.slice(start, end));
}

/**
 * Drops whitespace at the edges of a range, so a marker hugs its words. Whitespace at the start or
 * the end of the text stays, such as an indentation or spaces at the end of a line, since it
 * separates no words; so does a range of whitespace only, such as changed indentation.
 */
function withoutEdgeWhitespace(range: PlacedRange, text: string): PlacedRange {
  const rangeText = text.slice(range.start, range.end);
  const words = rangeText.trim();

  if (words.length === 0) {
    return range;
  }

  const leadingWhitespace = rangeText.length - rangeText.trimStart().length;
  const trailingWhitespace = rangeText.length - rangeText.trimEnd().length;
  const startsText = range.start === 0;
  const endsText = range.end === text.length;
  const start = startsText ? range.start : range.start + leadingWhitespace;
  const end = endsText ? range.end : range.end - trailingWhitespace;

  return { ...range, start, end };
}
