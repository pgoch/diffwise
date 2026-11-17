import { LIST_ITEM_TAG, NO_MARKER_TAGS, PICTURE_TAG, TABLE_ROW_TAG } from '../html/html-tags';
import { startCheckbox } from '../html/list-items';
import { type TextPiece, mapReaderText } from '../html/reader-text';
import {
  CHANGE_DETAILS_ATTRIBUTE,
  CONTINUED_CELL_ATTRIBUTE,
  CONTINUED_ITEM_ATTRIBUTE,
  CheckboxState,
  DETAIL_INDEX_SEPARATOR,
  LINE_ITEM_ATTRIBUTE,
  LIST_MARKER_ATTRIBUTE,
  type Line,
  LineKind,
  type ListMarker,
  type MarkedRange,
  TABLE_COPY_ATTRIBUTE,
} from '../model';
import { listMarkerText } from './list-marker-text';

const TEMPLATE_TAG = 'template';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const HIGHLIGHT_CLASS = 'diffwise-diff__highlight';
const LINE_ITEM_SELECTOR = `[${LINE_ITEM_ATTRIBUTE}]`;

/** Cells of the row in a table line: children of the row, in the copies of its table and group. */
const ROW_CELLS_SELECTOR = `[${TABLE_COPY_ATTRIBUTE}] > * > ${TABLE_ROW_TAG} > *`;

/** Cells of the row in a table line without the places of cells from rows above. */
const OWN_ROW_CELLS_SELECTOR = `${ROW_CELLS_SELECTOR}:not([${CONTINUED_CELL_ATTRIBUTE}])`;

/** Added to the classes of a whole table cell marked as added or removed. */
const CELL_HIGHLIGHT_CLASS = `${HIGHLIGHT_CLASS}--cell`;

/** Added to the classes of a marker around an image, which frames the image. */
const IMAGE_HIGHLIGHT_CLASS = `${HIGHLIGHT_CLASS}--image`;

/** Added to the classes of a list marker that Diffwise draws in place of the browser's. */
const LIST_MARKER_HIGHLIGHT_CLASS = `${HIGHLIGHT_CLASS}--list-marker`;

/** Added to the classes of a marker around a checkbox, which frames the checkbox. */
const CHECKBOX_HIGHLIGHT_CLASS = `${HIGHLIGHT_CLASS}--checkbox`;
const CHECKBOX_FRAME_SELECTOR = `.${CHECKBOX_HIGHLIGHT_CLASS}`;
const ID_ATTRIBUTE = 'id';
const CHECKED_ATTRIBUTE = 'checked';

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

/**
 * Changes of the list item a line starts, outside its text. Both versions show them, so they are
 * marked without change details.
 */
export interface ListItemMarks {
  /** True when the marker differs, by its look or only by its number; Diffwise then draws it. */
  readonly listMarkerChanged: boolean;
  /** True when the checkbox was checked or cleared. */
  readonly checkboxChanged: boolean;
}

const NO_DETAILS: readonly number[] = [];

/** Marks of a line whose list item, if any, is the same in both versions. */
export const NO_LIST_ITEM_MARKS: ListItemMarks = {
  listMarkerChanged: false,
  checkboxChanged: false,
};

/**
 * Wraps ranges of a line's text in markers inside the formatting, so bold text or a link stays, and
 * marks a changed list marker and checkbox. Returns the HTML unmarked if, parsed again, it reads
 * differently from the line's text.
 */
export function markChanges(
  line: Line,
  ranges: readonly MarkedRange[],
  marker: ChangeMarker,
  itemMarks: ListItemMarks = NO_LIST_ITEM_MARKS,
): string {
  const marksItem = itemMarks.listMarkerChanged || itemMarks.checkboxChanged;

  if (ranges.length === 0 && !marksItem) {
    return line.html;
  }

  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = line.html;

  const { text, pieces } = mapReaderText(template.content.childNodes);

  if (text !== line.text) {
    return line.html;
  }

  wrapRanges(pieces, ranges, marker);
  markListItem(template.content, line.marker, itemMarks, marker);

  return template.innerHTML;
}

/**
 * Wraps ranges of the reader text in markers, where the HTML can hold one, and returns the markers
 * in reading order: one for each text node and image that shows a range.
 */
export function wrapRanges(
  pieces: readonly TextPiece[],
  ranges: readonly MarkedRange[],
  marker: ChangeMarker,
): HTMLElement[] {
  const markablePieces = pieces.filter((piece) => canHoldMarker(markedNodeOf(piece.node)));
  const rangesInReadingOrder = [...ranges].sort((first, second) => first.start - second.start);

  return wrapSegments(rangeSegments(markablePieces, rangesInReadingOrder), marker);
}

/**
 * Draws the old marker of a changed list item next to the new one, which the content already
 * shows drawn, for a line that shows both versions. The old marker stands inside the new one, so
 * it keeps a place before it whatever the width of either.
 */
export function drawRemovedListMarker(
  content: DocumentFragment,
  oldMarker: ListMarker | null,
  { listMarkerChanged }: ListItemMarks,
): void {
  const newMarker = startedItemIn(content)?.firstElementChild ?? null;
  const showsNewMarker = newMarker?.hasAttribute(LIST_MARKER_ATTRIBUTE) ?? false;
  const drawsOldMarker =
    newMarker !== null && showsNewMarker && oldMarker !== null && listMarkerChanged;

  if (!drawsOldMarker) {
    return;
  }

  drawListMarker(newMarker, oldMarker, REMOVED_TEXT_MARKER);
}

/**
 * Draws the old state of a checked or cleared checkbox before the new checkbox, which the content
 * already shows framed, for a line that shows both versions. The old checkbox is a copy of the new
 * one in the old state, without the `id`, which stays unique.
 */
export function drawRemovedCheckbox(
  content: DocumentFragment,
  oldState: CheckboxState | null,
  { checkboxChanged }: ListItemMarks,
): void {
  const newFrame = startedItemIn(content)?.querySelector(CHECKBOX_FRAME_SELECTOR) ?? null;
  const newCheckbox = newFrame?.firstElementChild ?? null;
  const drawsOldCheckbox =
    newFrame !== null && newCheckbox !== null && oldState !== null && checkboxChanged;

  if (!drawsOldCheckbox) {
    return;
  }

  const oldCheckbox = newCheckbox.cloneNode(false) as Element;
  const oldFrame = markerElement(
    markerWithClass(REMOVED_TEXT_MARKER, CHECKBOX_HIGHLIGHT_CLASS),
    NO_DETAILS,
  );

  oldCheckbox.removeAttribute(ID_ATTRIBUTE);
  oldCheckbox.toggleAttribute(CHECKED_ATTRIBUTE, oldState === CheckboxState.Checked);
  oldFrame.append(oldCheckbox);
  newFrame.before(oldFrame);
}

/**
 * Marks a whole added or removed table line: the whole text of a caption, or each cell of a row.
 * A cell takes the classes of the marker itself, since no marker element can wrap a cell.
 */
export function markWholeTableLine(line: Line, marker: ChangeMarker): string {
  if (line.kind === LineKind.TableCaption) {
    return markChanges(line, [{ start: 0, end: line.text.length }], marker);
  }

  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = line.html;

  for (const cell of template.content.querySelectorAll(ROW_CELLS_SELECTOR)) {
    markWholeCell(cell, marker);
  }

  return template.innerHTML;
}

/**
 * Marks whole cells of the row in a table line's HTML, such as the cells of an added column. The
 * positions count the row's own cells, without the places of cells from rows above.
 */
export function markWholeCells(
  html: string,
  positions: readonly number[],
  marker: ChangeMarker,
): string {
  if (positions.length === 0) {
    return html;
  }

  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  const cells = template.content.querySelectorAll(OWN_ROW_CELLS_SELECTOR);

  for (const position of positions) {
    markWholeCell(cells[position], marker);
  }

  return template.innerHTML;
}

/** Gives a cell the classes of the marker, since no marker element can wrap a cell. */
export function markWholeCell(cell: Element | undefined, marker: ChangeMarker): void {
  cell?.classList.add(...marker.classNames, CELL_HIGHLIGHT_CLASS);
}

/**
 * Frames a changed checkbox, and draws a changed list marker in place of the browser's, which takes
 * no background. The drawn marker holds its text in an attribute, so the line's text stays.
 */
function markListItem(
  content: DocumentFragment,
  listMarker: ListMarker | null,
  { listMarkerChanged, checkboxChanged }: ListItemMarks,
  marker: ChangeMarker,
): void {
  const item = startedItemIn(content);

  if (item === null) {
    return;
  }

  if (checkboxChanged) {
    frameCheckbox(item, marker);
  }

  if (listMarker !== null && listMarkerChanged) {
    drawListMarker(item, listMarker, marker);
  }
}

/** Wraps the checkbox the item starts with in a marker that frames it. */
function frameCheckbox(item: Element, marker: ChangeMarker): void {
  const checkbox = startCheckbox(item);
  const checkboxMarker = markerWithClass(marker, CHECKBOX_HIGHLIGHT_CLASS);

  if (checkbox !== null) {
    wrapNode(checkbox, markerElement(checkboxMarker, NO_DETAILS));
  }
}

/** Puts a drawn marker first in the element; a style Diffwise does not draw keeps the browser's. */
function drawListMarker(item: Element, listMarker: ListMarker, marker: ChangeMarker): void {
  const text = listMarkerText(listMarker);

  if (text === null) {
    return;
  }

  const drawnMarker = markerElement(
    markerWithClass(marker, LIST_MARKER_HIGHLIGHT_CLASS),
    NO_DETAILS,
  );

  drawnMarker.setAttribute(LIST_MARKER_ATTRIBUTE, text);
  item.prepend(drawnMarker);
}

/**
 * The `li` whose marker the line shows: the one around the line's innermost item, unless it is a
 * copy in a later line of the item.
 */
function startedItemIn(content: DocumentFragment): Element | null {
  const item = content.querySelector(LINE_ITEM_SELECTOR)?.closest(LIST_ITEM_TAG) ?? null;
  const startsItem = item !== null && !item.hasAttribute(CONTINUED_ITEM_ATTRIBUTE);

  return startsItem ? item : null;
}

/** The node a marker goes around: a text node, or an image with its picture, if it has one. */
function markedNodeOf(node: Text | Element): Text | Element {
  const parent = node.parentElement;
  const isImageOfPicture = node instanceof Element && parent?.localName === PICTURE_TAG;

  return isImageOfPicture ? parent : node;
}

/** False where a marker would break the HTML: in SVG, in MathML and in elements such as `table`. */
export function canHoldMarker(node: Node): boolean {
  return canHoldMarkerIn(node.parentElement);
}

/** False for a parent where a marker would break the HTML; `null` stands for the top level. */
export function canHoldMarkerIn(parent: Element | null): boolean {
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

/** Parts of the text nodes that a marked range covers. */
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

  detailIndices.sort((one, other) => one - other);

  return { ...first, detailIndices };
}

/**
 * Wraps from the last segment back, so splitting a text node keeps earlier offsets in it valid.
 * Returns the markers in reading order.
 */
function wrapSegments(segments: readonly NodeSegment[], marker: ChangeMarker): HTMLElement[] {
  const markersFromLast = [...segments].reverse().map((segment) => wrapSegment(segment, marker));
  return markersFromLast.reverse();
}

/** Puts the segment in a new marker element, which it returns; the marker of an image frames it. */
function wrapSegment(
  { node, start, end, detailIndices }: NodeSegment,
  marker: ChangeMarker,
): HTMLElement {
  if (node instanceof Text) {
    return wrapNode(textPart(node, start, end), markerElement(marker, detailIndices));
  }

  const imageMarker = markerWithClass(marker, IMAGE_HIGHLIGHT_CLASS);

  return wrapNode(markedNodeOf(node), markerElement(imageMarker, detailIndices));
}

/** Splits `[start, end)` of the text node out into a text node of its own. */
function textPart(node: Text, start: number, end: number): Text {
  const part = node.splitText(start);

  part.splitText(end - start);

  return part;
}

/** The same marker with one more class, such as the one that frames an image. */
function markerWithClass({ tag, classNames }: ChangeMarker, className: string): ChangeMarker {
  return { tag, classNames: [...classNames, className] };
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

/** Puts the marker in the node's place and the node inside it; returns the marker. */
function wrapNode(node: ChildNode, marker: HTMLElement): HTMLElement {
  node.replaceWith(marker);
  marker.append(node);

  return marker;
}
