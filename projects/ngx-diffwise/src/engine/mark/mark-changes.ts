import { NO_MARKER_TAGS } from '../html/html-tags';
import { type TextPiece, mapReaderText } from '../html/reader-text';
import { CHANGE_DETAILS_ATTRIBUTE, type Line, type MarkedRange } from '../model';

const TEMPLATE_TAG = 'template';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const HIGHLIGHT_CLASS = 'diffwise-html-diff__highlight';
const DETAIL_INDEX_SEPARATOR = ' ';

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

/** Part of a text node, `[start, end)`, counted in the node's text, and the details it shows. */
interface NodeSegment {
  readonly node: Text;
  readonly start: number;
  readonly end: number;
  readonly detailIndices: readonly number[];
}

const NO_DETAILS: readonly number[] = [];

/**
 * Wraps ranges of a line's text in markers inside the formatting, so bold text or a link stays.
 * Returns the HTML unmarked if, parsed again, it reads differently from the line's text.
 */
export function markChanges(
  line: Line,
  ranges: readonly MarkedRange[],
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
  const rangesInReadingOrder = [...ranges].sort((first, second) => first.start - second.start);

  wrapSegments(rangeSegments(markablePieces, rangesInReadingOrder), marker);

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
function rangeSegments(
  pieces: readonly TextPiece[],
  ranges: readonly MarkedRange[],
): NodeSegment[] {
  return ranges.flatMap((range) => segmentsOfRange(pieces, range));
}

function segmentsOfRange(pieces: readonly TextPiece[], range: MarkedRange): NodeSegment[] {
  const segments: NodeSegment[] = [];
  const detailIndices = range.detailIndices ?? NO_DETAILS;

  for (const piece of pieces) {
    const overlapStart = Math.max(piece.start, range.start);
    const overlapEnd = Math.min(piece.end, range.end);

    if (overlapStart < overlapEnd) {
      addSegment(segments, nodeSegment(piece, overlapStart, overlapEnd, detailIndices));
    }
  }

  return segments;
}

/** The part of the piece's text node that shows `[textStart, textEnd)` of the reader text. */
function nodeSegment(
  piece: TextPiece,
  textStart: number,
  textEnd: number,
  detailIndices: readonly number[],
): NodeSegment {
  const nodeShift = piece.nodeOffset - piece.start;

  return {
    node: piece.node,
    start: textStart + nodeShift,
    end: textEnd + nodeShift,
    detailIndices,
  };
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

/**
 * Splits the segment's text out of its node and puts it in a new marker element. The marker of
 * a changed format lists the positions of its change details.
 */
function wrapSegment({ node, start, end, detailIndices }: NodeSegment, marker: ChangeMarker): void {
  const markedText = node.splitText(start);
  const markerElement = document.createElement(marker.tag);

  markedText.splitText(end - start);
  markerElement.classList.add(...marker.classNames);

  if (detailIndices.length > 0) {
    markerElement.setAttribute(
      CHANGE_DETAILS_ATTRIBUTE,
      detailIndices.join(DETAIL_INDEX_SEPARATOR),
    );
  }

  markedText.replaceWith(markerElement);
  markerElement.append(markedText);
}
