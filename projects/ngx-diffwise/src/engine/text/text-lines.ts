import { type FormattedRange, type Line, type LineImage, LineKind, type TableCell } from '../model';
import { textHtml } from './text-line-html';

/** Ends a line: `\r\n` as in Windows files, `\n` as in Linux and macOS files, or a lone `\r`. */
const LINE_END = /\r\n|\r|\n/;

const NO_FORMATS: readonly FormattedRange[] = [];
const NO_IMAGES: readonly LineImage[] = [];
const NO_CELLS: readonly TableCell[] = [];

/**
 * Splits plain text into lines. `\n`, `\r\n` and `\r` end a line alike, and a line end at the end
 * of the text only ends the last line, so text with it and without it has the same lines. Empty
 * text has no lines.
 */
export function textLines(text: string): Line[] {
  const lineTexts = text.split(LINE_END);

  if (lineTexts.at(-1)?.length === 0) {
    lineTexts.pop();
  }

  return lineTexts.map(textLine);
}

/** A line of plain text: its text only, without formatting, images, a list marker or cells. */
function textLine(text: string): Line {
  return {
    kind: LineKind.Paragraph,
    tag: null,
    text,
    formats: NO_FORMATS,
    images: NO_IMAGES,
    html: textHtml(text),
    marker: null,
    checkbox: null,
    table: null,
    cells: NO_CELLS,
  };
}
