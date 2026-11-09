import { NO_MARKER_TAGS, PICTURE_TAG } from '../html/html-tags';
import { type TextPiece, mapReaderText } from '../html/reader-text';
import { CHANGE_DETAILS_ATTRIBUTE, type Line, type MarkedRange } from '../model';

const TEMPLATE_TAG = 'template';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const HIGHLIGHT_CLASS = 'diffwise-html-diff__highlight';
const DETAIL_INDEX_SEPARATOR = ' ';

/** Added to the classes of a marker around an image, which frames the image. */
const IMAGE_HIGHLIGHT_CLASS = `${HIGHLIGHT_CLASS}--image`;

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

/** Part of a text node, `[start, end)` counted in the node's text, or an image. */
interface NodeSegment {
  readonly node: Text | Element;
  readonly start: number;
  readonly end: number;
  /** Positions of the change details the segment's marker shows. */
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

  const markablePieces = pieces.filter((piece) => canHoldMarker(markedNodeOf(piece.node)));
  const rangesInReadingOrder = [...ranges].sort((first, second) => first.start - second.start);

  wrapSegments(rangeSegments(markablePieces, rangesInReadingOrder), marker);

  return template.innerHTML;
}

/** The node a marker goes around: a text node, or an image with its picture, if it has one. */
function markedNodeOf(node: Text | Element): Text | Element {
  const parent = node.parentElement;
  const isImageOfPicture = node instanceof Element && parent?.localName === PICTURE_TAG;

  return isImageOfPicture ? parent : node;
}

/** False where a marker would break the HTML: in SVG, in MathML and in elements such as `table`. */
function canHoldMarker(node: Node): boolean {
  const parent = node.parentElement;

  if (parent === null) {
    return true;
  }

  return parent.namespaceURI === HTML_NAMESPACE && !NO_MARKER_TAGS.has(parent.localName);
}

/**
 * Parts of text nodes and images that show the ranges, in reading order: one per node and range.
 * An image that several ranges cover, such as changed text and a changed image, gets one part.
 */
function rangeSegments(
  pieces: readonly TextPiece[],
  ranges: readonly MarkedRange[],
): NodeSegment[] {
  const segments = ranges.flatMap((range) => segmentsOfRange(pieces, range));
  return withEachImageOnce(segments);
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

/** The part of the piece's node that shows `[textStart, textEnd)` of the reader text. */
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

/** Keeps the first segment of each image, with the change details of all its segments. */
function withEachImageOnce(segments: readonly NodeSegment[]): NodeSegment[] {
  const keptSegments: NodeSegment[] = [];
  const imagePositions = new Map<Node, number>();

  for (const segment of segments) {
    const position = imagePositions.get(segment.node);

    if (position !== undefined) {
      keptSegments[position] = withDetailsOfBoth(keptSegments[position], segment);
      continue;
    }

    if (segment.node instanceof Element) {
      imagePositions.set(segment.node, keptSegments.length);
    }

    keptSegments.push(segment);
  }

  return keptSegments;
}

/** The first segment with the change details of both, in ascending order. */
function withDetailsOfBoth(first: NodeSegment, second: NodeSegment): NodeSegment {
  const detailIndices = [...first.detailIndices, ...second.detailIndices];
  return { ...first, detailIndices: detailIndices.sort((one, other) => one - other) };
}

/** Wraps from the last segment back, so splitting a text node keeps earlier offsets in it valid. */
function wrapSegments(segments: readonly NodeSegment[], marker: ChangeMarker): void {
  for (const segment of [...segments].reverse()) {
    wrapSegment(segment, marker);
  }
}

/** Puts the segment in a new marker element; the marker of an image frames it. */
function wrapSegment({ node, start, end, detailIndices }: NodeSegment, marker: ChangeMarker): void {
  if (node instanceof Text) {
    wrapNode(textPart(node, start, end), markerElement(marker, detailIndices));
    return;
  }

  wrapNode(markedNodeOf(node), markerElement(imageMarkerOf(marker), detailIndices));
}

/** Splits `[start, end)` of the text node out into a text node of its own. */
function textPart(node: Text, start: number, end: number): Text {
  const part = node.splitText(start);

  part.splitText(end - start);

  return part;
}

/** The marker of an image: the same element, with the class that frames the image. */
function imageMarkerOf({ tag, classNames }: ChangeMarker): ChangeMarker {
  return { tag, classNames: [...classNames, IMAGE_HIGHLIGHT_CLASS] };
}

/** A new marker element. The marker of a described change lists the positions of its details. */
function markerElement(
  { tag, classNames }: ChangeMarker,
  detailIndices: readonly number[],
): HTMLElement {
  const element = document.createElement(tag);

  element.classList.add(...classNames);

  if (detailIndices.length > 0) {
    element.setAttribute(CHANGE_DETAILS_ATTRIBUTE, detailIndices.join(DETAIL_INDEX_SEPARATOR));
  }

  return element;
}

/** Puts the marker in the node's place and the node inside it. */
function wrapNode(node: ChildNode, marker: HTMLElement): void {
  node.replaceWith(marker);
  marker.append(node);
}
