import { BLOCK_TAGS, LINK_TAG } from '../html/html-tags';
import { type TextPiece, mapReaderText } from '../html/reader-text';
import {
  type ChangeDetail,
  ChangeDetailKind,
  type DescribedChanges,
  HIDDEN_SPACE_ATTRIBUTE,
  type Line,
  type MarkedRange,
  REPLACED_TEXT_ATTRIBUTE,
  type RemovedRange,
  type TextRange,
  type WordChanges,
} from '../model';
import {
  type ListItemMarks,
  REMOVED_TEXT_MARKER,
  canHoldMarker,
  canHoldMarkerIn,
  drawRemovedCheckbox,
  drawRemovedListMarker,
  wrapRanges,
} from './mark-changes';

const TEMPLATE_TAG = 'template';
const SPAN_TAG = 'span';

const CLASS_SELECTOR_START = '.';
const ID_ATTRIBUTE = 'id';
const ELEMENTS_WITH_ID_SELECTOR = `[${ID_ATTRIBUTE}]`;
const ANY_ELEMENT_SELECTOR = '*';
const ARIA_HIDDEN_ATTRIBUTE = 'aria-hidden';
const TRUE_ATTRIBUTE_VALUE = 'true';
const SPACE = ' ';
const WHITESPACE_CHARACTER = /\s/;

/** Finds the markers of removed text. */
const REMOVED_MARKER_SELECTOR = [REMOVED_TEXT_MARKER.tag, ...REMOVED_TEXT_MARKER.classNames].join(
  CLASS_SELECTOR_START,
);

/** The arrow between the old and the new image of a changed image; styles draw it. */
const IMAGE_CHANGE_ARROW_CLASS = 'diffwise-diff__image-change-arrow';

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

/** The lines of a changed pair and their text changes, compared word by word. */
export type WordChangedPair = Pick<ChangedPair, 'oldLine' | 'newLine' | 'wordChanges'>;

/** What goes around text removed from the old line, where a merged line shows it. */
interface RemovedTextSeparators {
  /** True when a space goes before the removed text. */
  readonly spaceBefore: boolean;
  /**
   * True when added text that replaces the removed text follows it: styles leave a gap between
   * the two, and a hidden space separates them for screen readers and copied text.
   */
  readonly isReplaced: boolean;
  /** True when a space goes after the removed text. */
  readonly spaceAfter: boolean;
}

/** A part of the old line that the merged line shows, and where it goes in the new line's text. */
export interface OldPart {
  /** Ranges in the old line's text: the part itself, then the changed images inside it. */
  readonly ranges: readonly MarkedRange[];
  readonly newPosition: number;
  /** True for the old image of a changed image, which an arrow joins with the new one. */
  readonly isChangedImage: boolean;
}

/** A part of the old line and its copy for the merged line. */
export interface CopiedPart {
  readonly part: OldPart;
  readonly nodes: DocumentFragment;
}

/** A place between the nodes of a parent: before `nextNode`, or last when it is `null`. */
interface InsertionPoint {
  readonly parent: Node;
  readonly nextNode: Node | null;
}

/**
 * Merges a changed line pair into one line: the HTML of the new line with its changes marked, and
 * in it the text removed from the old line, in its own formatting, where it stood. A changed image
 * shows as the old and the new image, a changed list marker as the old and the new marker, and a
 * checked or cleared checkbox as the old and the new checkbox. Returns `null` for a pair that does
 * not merge into valid HTML, which then stays two lines.
 */
export function mergeLines(pair: ChangedPair): string | null {
  const { oldLine, newLine, markedNewHtml, itemMarks } = pair;
  const oldContent = parsedContent(oldLine.html);
  const newContent = parsedContent(markedNewHtml);
  const oldText = mapReaderText(oldContent.childNodes);
  const newText = mapReaderText(newContent.childNodes);

  if (oldText.text !== oldLine.text || newText.text !== newLine.text) {
    return null;
  }

  const copiedParts = copyOldParts(pair, oldText.pieces);

  if (copiedParts === null) {
    return null;
  }

  for (const copiedPart of inInsertionOrder(copiedParts)) {
    const point = insertionPoint(newText.pieces, copiedPart.part.newPosition, newContent);

    if (point === null) {
      return null;
    }

    insertCopiedPart(point, copiedPart, pair);
  }

  drawRemovedListMarker(newContent, oldLine.marker, itemMarks);
  drawRemovedCheckbox(newContent, oldLine.checkbox, itemMarks);

  return serialized(newContent);
}

/**
 * Copies of the parts of the old line that a merged line shows, from the old line's content and
 * its pieces of text; `null` when a part has no copy. Marking them changes the content.
 */
export function copyOldParts(
  { wordChanges, describedChanges }: ChangedPair,
  oldPieces: readonly TextPiece[],
): CopiedPart[] | null {
  return copiedOldParts(oldParts(wordChanges, describedChanges), oldPieces);
}

/** The copies in the order to put them in, so each keeps the places of the ones after it valid. */
export function inInsertionOrder(copiedParts: readonly CopiedPart[]): CopiedPart[] {
  return [...copiedParts].sort(fromLastPlace);
}

/**
 * Puts the copy of an old part at the point, with what separates it from the text around. The
 * text around is the new line's text within `bounds`, such as the part of a cell; by default all.
 */
export function insertCopiedPart(
  point: InsertionPoint,
  { part, nodes }: CopiedPart,
  pair: ChangedPair,
  bounds: TextRange = { start: 0, end: pair.newLine.text.length },
): void {
  insertNodes(point, withSeparators(nodes, part, pair, bounds));
}

/** The HTML of a line as nodes that can be changed. */
export function parsedContent(html: string): DocumentFragment {
  const template = document.createElement(TEMPLATE_TAG);

  template.innerHTML = html;

  return template.content;
}

/** The HTML of the nodes of a line. */
export function serialized(content: DocumentFragment): string {
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

/** True when one of the details of the range is a change of an image. */
function describesImage({ detailIndices }: MarkedRange, details: readonly ChangeDetail[]): boolean {
  const indices = detailIndices ?? [];
  return indices.some((index) => details[index].kind === ChangeDetailKind.Image);
}

/** True when the inner range lies within the outer one. */
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

/** True when the two ranges point to a detail in common. */
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

/** Orders removed parts from the one that stands last in the old text. */
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
function partNodes(part: OldPart, oldPieces: readonly TextPiece[]): DocumentFragment | null {
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

  const copyInFormatting = document.createDocumentFragment();

  copyInFormatting.append(insideInlineAncestors(copy, markedPart.commonAncestorContainer));

  return copyInFormatting;
}

/** True when the content holds an element that makes a block. */
function holdsBlock(content: DocumentFragment): boolean {
  const elements = Array.from(content.querySelectorAll(ANY_ELEMENT_SELECTOR));
  return elements.some((element) => BLOCK_TAGS.has(element.localName));
}

/** Removes the ids of all elements of the content. */
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

/** True when the node is an element that stays in the line of text. */
function isInlineElement(node: Node | null): node is Element {
  return node instanceof Element && !BLOCK_TAGS.has(node.localName);
}

/**
 * The place in the content where the text at `position` of its reader text starts; the pieces
 * are those of the content. At the start or the end of an inline element the place is outside it,
 * since an old part brings its own formatting. Content without text takes the part at its end.
 * Returns `null` where the HTML cannot hold more nodes, such as inside SVG.
 */
export function insertionPoint(
  pieces: readonly TextPiece[],
  position: number,
  content: Node,
): InsertionPoint | null {
  const nextPiece = pieces.find((piece) => piece.end > position);
  const lastPiece = pieces.at(-1);

  if (lastPiece === undefined) {
    const endOfContent = { parent: content, nextNode: null };
    return canHoldNodes(endOfContent) ? endOfContent : null;
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

/** True when the nodes of removed text can stand at the insertion point. */
function canHoldNodes({ parent, nextNode }: InsertionPoint): boolean {
  const nodeOfParent = nextNode ?? parent.lastChild;

  if (nodeOfParent === null) {
    const parentElement = parent instanceof Element ? parent : null;

    return canHoldMarkerIn(parentElement);
  }

  return canHoldMarker(nodeOfParent);
}

/**
 * The old part with what separates it from the text around: an arrow after the old image of a
 * changed image, or else a space wherever the old line had one and the new line has none. Before
 * added text that replaces it, the part is marked for a gap, and a hidden space follows it.
 */
function withSeparators(
  nodes: DocumentFragment,
  part: OldPart,
  pair: ChangedPair,
  bounds: TextRange,
): Node[] {
  if (part.isChangedImage) {
    return [nodes, imageChangeArrow()];
  }

  const { start, end } = part.ranges[0];
  const removed = { start, end, newPosition: part.newPosition };
  const { spaceBefore, isReplaced, spaceAfter } = removedTextSeparators(removed, pair, bounds);
  const separated: Node[] = [];

  if (spaceBefore) {
    separated.push(spaceNode());
  }

  separated.push(nodes);

  if (isReplaced) {
    markAsReplaced(nodes);
    separated.push(hiddenSpace());
  } else if (spaceAfter) {
    separated.push(spaceNode());
  }

  return separated;
}

/**
 * What separates text removed from the old line from the text around it in a merged line: a space
 * wherever the old line had one and the new line has none. Before added text that replaces it,
 * the removed text gets a gap and a hidden space instead of the space after it. The text around is
 * the new line's text within `bounds`, such as the part of a cell.
 */
export function removedTextSeparators(
  removed: RemovedRange,
  pair: WordChangedPair,
  bounds: TextRange,
): RemovedTextSeparators {
  const oldText = pair.oldLine.text;
  const newText = pair.newLine.text;
  const position = removed.newPosition;
  const hadSpaceBefore = isWhitespaceAt(oldText, removed.start - 1);
  const hadSpaceAfter = isWhitespaceAt(oldText, removed.end);
  const textBefore = position > bounds.start && !isWhitespaceAt(newText, position - 1);
  const textAfter = position < bounds.end && !isWhitespaceAt(newText, position);
  const isReplaced = pair.wordChanges.added.some((range) => range.start === position);
  const spaceBefore = hadSpaceBefore && textBefore;
  const spaceAfter = !isReplaced && hadSpaceAfter && textAfter;

  return { spaceBefore, isReplaced, spaceAfter };
}

/** Marks the last marker of the copy, which the added text follows. */
function markAsReplaced(copy: DocumentFragment): void {
  const markers = copy.querySelectorAll(REMOVED_MARKER_SELECTOR);

  markers.item(markers.length - 1)?.toggleAttribute(REPLACED_TEXT_ATTRIBUTE, true);
}

/** True when the character at the position is whitespace. */
function isWhitespaceAt(text: string, position: number): boolean {
  return WHITESPACE_CHARACTER.test(text.charAt(position));
}

/** A new text node with a space. */
function spaceNode(): Text {
  return document.createTextNode(SPACE);
}

/** A space that only screen readers and copied text see; the line may still break there. */
function hiddenSpace(): HTMLElement {
  const space = document.createElement(SPAN_TAG);

  space.toggleAttribute(HIDDEN_SPACE_ATTRIBUTE, true);
  space.append(spaceNode());

  return space;
}

/** The arrow between the old and the new image of a changed image. */
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
