import { NO_MARKER_TAGS } from '../html/html-tags';
import { type TextPiece, mapReaderText } from '../html/reader-text';
import type { Line, TextRange } from '../model';

const TEMPLATE_TAG = 'template';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const HIGHLIGHT_CLASS = 'diffwise-html-diff__highlight';

/** The element that wraps changed text, with its classes. */
export interface ChangeMarker {
  readonly tag: string;
  readonly classNames: readonly string[];
}

/** Wraps text removed from the old line. */
export const REMOVED_TEXT_MARKER: ChangeMarker = {
  tag: 'del',
  classNames: [HIGHLIGHT_CLASS, `${HIGHLIGHT_CLASS}--removed`],
};

/** Wraps text added to the new line. */
export const ADDED_TEXT_MARKER: ChangeMarker = {
  tag: 'ins',
  classNames: [HIGHLIGHT_CLASS, `${HIGHLIGHT_CLASS}--added`],
};

/** Part of a text node, `[start, end)`, counted in the node's text. */
interface NodeSegment {
  readonly node: Text;
  readonly start: number;
  readonly end: number;
}

/**
 * Wraps ranges of a line's text in markers inside the formatting, so bold text or a link stays.
 * Returns the HTML unmarked if, parsed again, it reads differently from the line's text.
 */
export function markChanges(
  line: Line,
  ranges: readonly TextRange[],
  marker: ChangeMarker,
): string {
  if (ranges.length === 0) {
    return line.html;
  }

  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = line.html;

  const { text, pieces } = mapReaderText(template.content.childNodes);

  if (text !== line.text) {
    return line.html;
  }

  const markablePieces = pieces.filter((piece) => canHoldMarker(piece.node));

  wrapSegments(rangeSegments(markablePieces, ranges), marker);

  return template.innerHTML;
}

/** False where a marker would break the HTML: in SVG, in MathML and in elements such as `table`. */
function canHoldMarker(node: Text): boolean {
  const parent = node.parentElement;

  if (parent === null) {
    return true;
  }

  return parent.namespaceURI === HTML_NAMESPACE && !NO_MARKER_TAGS.has(parent.localName);
}

/** Parts of text nodes that show the ranges, in reading order: one per node and range. */
function rangeSegments(pieces: readonly TextPiece[], ranges: readonly TextRange[]): NodeSegment[] {
  return ranges.flatMap((range) => segmentsOfRange(pieces, range));
}

function segmentsOfRange(pieces: readonly TextPiece[], range: TextRange): NodeSegment[] {
  const segments: NodeSegment[] = [];

  for (const piece of pieces) {
    const overlapStart = Math.max(piece.start, range.start);
    const overlapEnd = Math.min(piece.end, range.end);

    if (overlapStart < overlapEnd) {
      addSegment(segments, nodeSegment(piece, overlapStart, overlapEnd));
    }
  }

  return segments;
}

/** The part of the piece's text node that shows `[textStart, textEnd)` of the reader text. */
function nodeSegment(piece: TextPiece, textStart: number, textEnd: number): NodeSegment {
  const nodeShift = piece.nodeOffset - piece.start;
  const start = textStart + nodeShift;
  const end = textEnd + nodeShift;

  return { node: piece.node, start, end };
}

/** Adds a segment, or extends the previous one when both lie in the same text node. */
function addSegment(segments: NodeSegment[], segment: NodeSegment): void {
  const previous = segments.at(-1);

  if (previous?.node === segment.node) {
    segments[segments.length - 1] = { ...previous, end: segment.end };
    return;
  }

  segments.push(segment);
}

/** Wraps from the last segment back, so splitting a text node keeps earlier offsets in it valid. */
function wrapSegments(segments: readonly NodeSegment[], marker: ChangeMarker): void {
  for (const segment of [...segments].reverse()) {
    wrapSegment(segment, marker);
  }
}

/** Splits the segment's text out of its node and puts it in a new marker element. */
function wrapSegment({ node, start, end }: NodeSegment, marker: ChangeMarker): void {
  const markedText = node.splitText(start);
  const markerElement = document.createElement(marker.tag);

  markedText.splitText(end - start);
  markerElement.classList.add(...marker.classNames);
  markedText.replaceWith(markerElement);
  markerElement.append(markedText);
}
