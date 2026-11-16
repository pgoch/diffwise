import { unchangedTokens } from './diff-words';
import { type ComparedSide, FormatChangesBuilder } from './format-changes-builder';
import { FormatComparer } from './format-comparer';
import { FormatCursor } from './format-cursor';
import type { ChangedText, DescribedChanges, DiffOptions, Line } from '../model';

const NO_FORMAT_CHANGES: DescribedChanges = { oldRanges: [], newRanges: [], details: [] };

/**
 * Compares the formats of unchanged words in a changed line pair. Characters next to each other
 * whose format changed in the same way become one range on each side, with the change details.
 */
export function diffFormats(
  oldLine: Line,
  newLine: Line,
  wordChanges: ChangedText,
  options: DiffOptions,
): DescribedChanges {
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
  const oldTokens = unchangedTokens(oldSide.line.text, oldSide.changedText);
  const newTokens = unchangedTokens(newSide.line.text, newSide.changedText);
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
