import { BLOCK_TAGS, LINK_TAG } from '../html/html-tags';
import { type TextPiece, mapReaderText } from '../html/reader-text';
import {
  type ChangeDetail,
  ChangeDetailKind,
  type DescribedChanges,
  type Line,
  type MarkedRange,
  type TextRange,
  type WordChanges,
} from '../model';
import {
  type ListItemMarks,
  REMOVED_TEXT_MARKER,
  canHoldMarker,
  drawRemovedListMarker,
  wrapRanges,
} from './mark-changes';

const TEMPLATE_TAG = 'template';
const SPAN_TAG = 'span';
const ID_ATTRIBUTE = 'id';
const ELEMENTS_WITH_ID_SELECTOR = `[${ID_ATTRIBUTE}]`;
const ANY_ELEMENT_SELECTOR = '*';
const ARIA_HIDDEN_ATTRIBUTE = 'aria-hidden';
const TRUE_ATTRIBUTE_VALUE = 'true';
const SPACE = ' ';
const WHITESPACE_CHARACTER = /\s/;

/** The arrow between the old and the new image of a changed image; styles draw it. */
const IMAGE_CHANGE_ARROW_CLASS = 'diffwise-html-diff__image-change-arrow';

/** A changed line pair and its changes, which become one line. */
export interface ChangedPair {
  readonly oldLine: Line;
  readonly newLine: Line;
  /** HTML of the new line with its added text and its described changes marked. */
  readonly markedNewHtml: string;
  readonly wordChanges: WordChanges;
  readonly describedChanges: DescribedChanges;
  readonly itemMarks: ListItemMarks;
}

/** A part of the old line that the merged line shows, and where it goes in the new line's text. */
interface OldPart {
  /** Ranges in the old line's text: the part itself, then the changed images inside it. */
  readonly ranges: readonly MarkedRange[];
  readonly newPosition: number;
  /** True for the old image of a changed image, which an arrow joins with the new one. */
  readonly isChangedImage: boolean;
}

/** A part of the old line and its copy for the merged line. */
interface CopiedPart {
  readonly part: OldPart;
  readonly nodes: Node;
}

/** A place between the nodes of a parent: before `nextNode`, or last when it is `null`. */
interface InsertionPoint {
  readonly parent: Node;
  readonly nextNode: Node | null;
}

/**
 * Merges a changed line pair into one line: the HTML of the new line with its changes marked, and
 * in it the text removed from the old line, in its own formatting, where it stood. A changed image
 * shows as the old and the new image, a changed list marker as the old and the new marker.
 * Returns `null` for a pair that does not merge into valid HTML, which then stays two lines.
 */
export function mergeLines(pair: ChangedPair): string | null {
  const { oldLine, newLine, markedNewHtml, wordChanges, describedChanges, itemMarks } = pair;
  const oldContent = parsedContent(oldLine.html);
  const newContent = parsedContent(markedNewHtml);
  const oldText = mapReaderText(oldContent.childNodes);
  const newText = mapReaderText(newContent.childNodes);

  if (oldText.text !== oldLine.text || newText.text !== newLine.text) {
    return null;
  }

  const copiedParts = copiedOldParts(oldParts(wordChanges, describedChanges), oldText.pieces);

  if (copiedParts === null) {
    return null;
  }

  for (const { part, nodes } of [...copiedParts].sort(fromLastPlace)) {
    const point = insertionPoint(newText.pieces, part.newPosition);

    if (point === null) {
      return null;
    }

    insertNodes(point, withSeparators(nodes, part, pair));
  }

  drawRemovedListMarker(newContent, oldLine.marker, itemMarks);

  return serialized(newContent);
}

function parsedContent(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content;
}

function serialized(content: DocumentFragment): string {
  const template = document.createElement(TEMPLATE_TAG);

  template.content.append(content);

  return template.innerHTML;
}

/**
 * Parts of the old line to show: removed text, and the old image of each changed image that is
 * not a piece of longer removed text. An image replaced by another one is such a changed image.
 */
function oldParts(
  { removed }: WordChanges,
  { oldRanges, newRanges, details }: DescribedChanges,
): OldPart[] {
  const imageRanges = oldRanges.filter((range) => describesImage(range, details));
  const imagesInLongerText = imageRanges.filter((imageRange) =>
    removed.some((range) => isInside(imageRange, range) && !isInside(range, imageRange)),
  );
  const imagesOfTheirOwn = imageRanges.filter((range) => !imagesInLongerText.includes(range));
  const removedText = removed.filter(
    (range) => !imagesOfTheirOwn.some((imageRange) => isInside(range, imageRange)),
  );
  const textParts = removedText.map((range) => ({
    ranges: [range, ...imagesInLongerText.filter((imageRange) => isInside(imageRange, range))],
    newPosition: range.newPosition,
    isChangedImage: false,
  }));
  const imageParts = imagesOfTheirOwn.flatMap((range) => changedImagePart(range, newRanges));

  return [...textParts, ...imageParts];
}

function describesImage({ detailIndices }: MarkedRange, details: readonly ChangeDetail[]): boolean {
  const indices = detailIndices ?? [];
  return indices.some((index) => details[index].kind === ChangeDetailKind.Image);
}

function isInside(inner: TextRange, outer: TextRange): boolean {
  return inner.start >= outer.start && inner.end <= outer.end;
}

/** The old image of a changed image, which goes before the new image with the same details. */
function changedImagePart(imageRange: MarkedRange, newRanges: readonly MarkedRange[]): OldPart[] {
  const newImageRange = newRanges.find((range) => sharesDetails(range, imageRange));

  if (newImageRange === undefined) {
    return [];
  }

  return [{ ranges: [imageRange], newPosition: newImageRange.start, isChangedImage: true }];
}

function sharesDetails(first: MarkedRange, second: MarkedRange): boolean {
  const secondIndices = second.detailIndices ?? [];
  return first.detailIndices?.some((index) => secondIndices.includes(index)) ?? false;
}

/**
 * Copies of the parts, each marked in the old line from the last part back, so marking one keeps
 * the places of the earlier ones valid. Returns `null` when a part has no copy.
 */
function copiedOldParts(
  parts: readonly OldPart[],
  oldPieces: readonly TextPiece[],
): CopiedPart[] | null {
  const copiedParts: CopiedPart[] = [];

  for (const part of [...parts].sort(fromLastOldText)) {
    const nodes = partNodes(part, oldPieces);

    if (nodes === null) {
      return null;
    }

    copiedParts.push({ part, nodes });
  }

  return copiedParts;
}

function fromLastOldText(first: OldPart, second: OldPart): number {
  return second.ranges[0].start - first.ranges[0].start;
}

/**
 * Orders copies from the last place in the new line back, so putting one in keeps earlier places
 * valid. Parts of one place, such as removed text before a changed image, keep their order: each
 * goes right before the text of the place.
 */
function fromLastPlace(first: CopiedPart, second: CopiedPart): number {
  const placeDifference = second.part.newPosition - first.part.newPosition;
  const fromFirstOldText = fromLastOldText(second.part, first.part);
  const samePlace = placeDifference === 0;

  return samePlace ? fromFirstOldText : placeDifference;
}

/**
 * A copy of the part of the old line, marked as removed, inside copies of the inline elements
 * around it, such as bold or a link, without their ids. Returns `null` when the part cannot be
 * marked, or holds a block, which would not fit inside the text of a line.
 */
function partNodes(part: OldPart, oldPieces: readonly TextPiece[]): Node | null {
  const markers = wrapRanges(oldPieces, part.ranges, REMOVED_TEXT_MARKER);
  const firstMarker = markers.at(0);
  const lastMarker = markers.at(-1);

  if (firstMarker === undefined || lastMarker === undefined) {
    return null;
  }

  const markedPart = document.createRange();

  markedPart.setStartBefore(firstMarker);
  markedPart.setEndAfter(lastMarker);

  const copy = markedPart.cloneContents();

  if (holdsBlock(copy)) {
    return null;
  }

  removeIds(copy);

  return insideInlineAncestors(copy, markedPart.commonAncestorContainer);
}

function holdsBlock(content: DocumentFragment): boolean {
  const elements = Array.from(content.querySelectorAll(ANY_ELEMENT_SELECTOR));
  return elements.some((element) => BLOCK_TAGS.has(element.localName));
}

function removeIds(content: DocumentFragment): void {
  for (const element of content.querySelectorAll(ELEMENTS_WITH_ID_SELECTOR)) {
    element.removeAttribute(ID_ATTRIBUTE);
  }
}

/** The content inside copies of the inline elements from `container` up to the nearest block. */
function insideInlineAncestors(content: Node, container: Node): Node {
  let wrapped = content;
  let ancestor: Node | null = container;

  while (isInlineElement(ancestor)) {
    const copy = ancestor.cloneNode(false) as Element;

    copy.removeAttribute(ID_ATTRIBUTE);
    copy.append(wrapped);
    wrapped = copy;
    ancestor = ancestor.parentNode;
  }

  return wrapped;
}

function isInlineElement(node: Node | null): node is Element {
  return node instanceof Element && !BLOCK_TAGS.has(node.localName);
}

/**
 * The place in the content where the text at `position` of the reader text starts. At the start
 * or the end of an inline element the place is outside it, since an old part brings its own
 * formatting. Returns `null` where the HTML cannot hold more nodes, such as inside SVG.
 */
function insertionPoint(pieces: readonly TextPiece[], position: number): InsertionPoint | null {
  const nextPiece = pieces.find((piece) => piece.end > position);
  const lastPiece = pieces.at(-1);

  if (lastPiece === undefined) {
    return null;
  }

  const point =
    nextPiece === undefined ? pointAfter(lastPiece.node) : pointInPiece(nextPiece, position);

  return canHoldNodes(point) ? point : null;
}

/**
 * The place in the piece where the text at `position` starts, or the start of the piece when the
 * position lies before it. An image is whole, so the place is before it.
 */
function pointInPiece({ node, start, nodeOffset }: TextPiece, position: number): InsertionPoint {
  if (node instanceof Element) {
    return pointBefore(node);
  }

  const offsetInPiece = Math.max(position - start, 0);
  const offsetInNode = nodeOffset + offsetInPiece;

  if (offsetInNode === 0) {
    return pointBefore(node);
  }

  if (offsetInNode >= node.data.length) {
    return pointAfter(node);
  }

  return pointBefore(node.splitText(offsetInNode));
}

/** The place before the node, outside the inline elements that the node starts. */
function pointBefore(node: Node): InsertionPoint {
  let nextNode = node;

  while (nextNode.previousSibling === null && isInlineElement(nextNode.parentNode)) {
    nextNode = nextNode.parentNode;
  }

  return { parent: parentOf(nextNode), nextNode };
}

/** The place after the node, outside the inline elements that the node ends. */
function pointAfter(node: Node): InsertionPoint {
  let previousNode = node;

  while (previousNode.nextSibling === null && isInlineElement(previousNode.parentNode)) {
    previousNode = previousNode.parentNode;
  }

  return { parent: parentOf(previousNode), nextNode: previousNode.nextSibling };
}

/** The parent of a node of parsed content, which always has one. */
function parentOf(node: Node): Node {
  return node.parentNode as Node;
}

function canHoldNodes({ parent, nextNode }: InsertionPoint): boolean {
  const nodeOfParent = nextNode ?? parent.lastChild;
  return nodeOfParent !== null && canHoldMarker(nodeOfParent);
}

/**
 * The old part with what separates it from the text around: an arrow after the old image of a
 * changed image, or else a space wherever the old line had one and the new line has none, and
 * between the part and added text that follows it.
 */
function withSeparators(nodes: Node, part: OldPart, pair: ChangedPair): Node[] {
  if (part.isChangedImage) {
    return [nodes, imageChangeArrow()];
  }

  const { start, end } = part.ranges[0];
  const oldText = pair.oldLine.text;
  const newText = pair.newLine.text;
  const position = part.newPosition;
  const startsAddedText = pair.wordChanges.added.some((range) => range.start === position);
  const hadSpaceBefore = isWhitespaceAt(oldText, start - 1);
  const hadSpaceAfter = isWhitespaceAt(oldText, end);
  const textBefore = position > 0 && !isWhitespaceAt(newText, position - 1);
  const textAfter = position < newText.length && !isWhitespaceAt(newText, position);
  const separated: Node[] = [];

  if (hadSpaceBefore && textBefore) {
    separated.push(spaceNode());
  }

  separated.push(nodes);

  if (textAfter && (hadSpaceAfter || startsAddedText)) {
    separated.push(spaceNode());
  }

  return separated;
}

function isWhitespaceAt(text: string, position: number): boolean {
  return WHITESPACE_CHARACTER.test(text.charAt(position));
}

function spaceNode(): Text {
  return document.createTextNode(SPACE);
}

function imageChangeArrow(): HTMLElement {
  const arrow = document.createElement(SPAN_TAG);

  arrow.classList.add(IMAGE_CHANGE_ARROW_CLASS);
  arrow.setAttribute(ARIA_HIDDEN_ATTRIBUTE, TRUE_ATTRIBUTE_VALUE);

  return arrow;
}

/** Puts the nodes at the point. Inside a link, their own links go, since links do not nest. */
function insertNodes({ parent, nextNode }: InsertionPoint, nodes: readonly Node[]): void {
  const isInsideLink = parent instanceof Element && parent.closest(LINK_TAG) !== null;

  for (const node of nodes) {
    const insertedNode = isInsideLink ? withoutLinks(node) : node;

    parent.insertBefore(insertedNode, nextNode);
  }
}

/** The node with each link in it, and the node itself if it is one, replaced by its content. */
function withoutLinks(node: Node): Node {
  const content = document.createDocumentFragment();

  content.append(node);

  for (const link of content.querySelectorAll(LINK_TAG)) {
    link.replaceWith(...link.childNodes);
  }

  return content;
}
