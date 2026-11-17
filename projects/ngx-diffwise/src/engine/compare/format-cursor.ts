import { PLAIN_FORMAT } from '../html/text-format';
import type { FormattedRange, TextFormat } from '../model';

/** Finds the format at increasing positions of a line's text. */
export class FormatCursor {
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

  /** True when the current range ends before the position. */
  private currentRangeEndsBefore(position: number): boolean {
    const range = this.formats.at(this.index);
    return range !== undefined && range.end <= position;
  }
}
