import { type FormattedRange, type Line, type LineImage, LineKind, type TableCell } from '../model';
import { type TextHtml, textHtml } from './text-line-html';

/** Ends a line: `\r\n` as in Windows files, `\n` as in Linux and macOS files, or a lone `\r`. */
const LINE_END = /\r\n|\r|\n/;

const NO_FORMATS: readonly FormattedRange[] = [];
const NO_IMAGES: readonly LineImage[] = [];
const NO_CELLS: readonly TableCell[] = [];

/**
 * Splits plain text into lines. `\n`, `\r\n` and `\r` end a line alike, and a line end at the end
 * of the text only ends the last line, so text with it and without it has the same lines. Empty
 * text has no lines. The HTML of each line comes from `lineHtml`.
 */
export function textLines(text: string, lineHtml: TextHtml = textHtml): Line[] {
  const lineTexts = text.split(LINE_END);

  if (lineTexts.at(-1)?.length === 0) {
    lineTexts.pop();
  }

  return lineTexts.map((lineText) => textLine(lineText, lineHtml));
}

/** A line of plain text: its text only, without formatting, images, a list marker or cells. */
function textLine(text: string, lineHtml: TextHtml): Line {
  return {
    kind: LineKind.Paragraph,
    tag: null,
    text,
    formats: NO_FORMATS,
    images: NO_IMAGES,
    html: lineHtml(text),
    marker: null,
    checkbox: null,
    table: null,
    cells: NO_CELLS,
  };
}
