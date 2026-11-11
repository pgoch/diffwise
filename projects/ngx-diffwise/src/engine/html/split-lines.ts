import {
  BLOCK_TAGS,
  HEADING_TAGS,
  LIST_ITEM_TAG,
  LIST_ITEM_TAGS,
  PARAGRAPH_TAGS,
  SPLIT_BLOCK_TAGS,
  VISIBLE_WITHOUT_TEXT_TAGS,
} from './html-tags';
import { lineImages } from './line-images';
import { ListMarkerReader, startCheckboxState } from './list-items';
import {
  CONTINUED_ITEM_ATTRIBUTE,
  type FormattedRange,
  LINE_ITEM_ATTRIBUTE,
  type Line,
  LineKind,
} from '../model';
import { prefixIds } from './prefix-ids';
import { type TextPiece, mapReaderText } from './reader-text';
import { TextFormatReader } from './text-format';

const TEMPLATE_TAG = 'template';
const ID_ATTRIBUTE = 'id';
const VALUE_ATTRIBUTE = 'value';

/** What a line is built from. */
interface LineSource {
  readonly kind: LineKind;
  readonly tag: string | null;
  readonly nodes: readonly Node[];
  readonly wrappers: readonly Element[];
}

/** Kind and tag of a line. */
type LineType = Pick<LineSource, 'kind' | 'tag'>;

/** What a line shows of the list item it starts: its marker and its checkbox. */
type ItemStart = Pick<Line, 'marker' | 'checkbox'>;

/** A line that starts no list item. */
const NO_ITEM_START: ItemStart = { marker: null, checkbox: null };

/** Text outside any block, or next to the blocks of a container such as a quote. */
const TEXT_OUTSIDE_BLOCKS: LineType = { kind: LineKind.Paragraph, tag: null };

/**
 * Splits a parsed document into lines. Text and formats are read from the document as it is,
 * and only the HTML of each line gets the prefix before its ids.
 */
export function splitLines(root: Element, idPrefix: string): Line[] {
  const collector = new LineCollector(idPrefix);

  collector.addChildren(root, []);

  return collector.lines;
}

/** Collects the lines of a document in reading order. */
class LineCollector {
  /** Lines collected so far. */
  readonly lines: Line[] = [];

  private readonly formatReader = new TextFormatReader();
  private readonly markerReader = new ListMarkerReader();

  /** Containers copied into the HTML of a line so far; a later copy is not the first one. */
  private readonly copiedWrappers = new Set<Element>();

  constructor(private readonly idPrefix: string) {}

  /** Adds lines for the children of a container; containers of blocks are split further. */
  addChildren(container: Element, wrappers: readonly Element[]): void {
    const inlineLineType = textLineType(container);
    let inlineNodes: Node[] = [];

    const addInlineLine = (): void => {
      this.addLine({ ...inlineLineType, nodes: inlineNodes, wrappers });
      inlineNodes = [];
    };

    for (const child of container.childNodes) {
      if (!isBlock(child)) {
        inlineNodes.push(child);
        continue;
      }

      addInlineLine();

      if (LIST_ITEM_TAGS.has(child.localName)) {
        this.addListItem(child, wrappers);
      } else if (isContainerOfBlocks(child)) {
        this.addChildren(child, [...wrappers, child]);
      } else {
        this.addLine({ kind: kindOf(child), tag: child.localName, nodes: [child], wrappers });
      }
    }

    addInlineLine();
  }

  /**
   * Adds the lines of a list item. An item with blocks inside, such as a nested list, is split like
   * a quote; an item that gives no line that way, such as one with empty paragraphs, is one line.
   */
  private addListItem(item: Element, wrappers: readonly Element[]): void {
    const lineCountBefore = this.lines.length;

    if (isContainerOfBlocks(item)) {
      this.addChildren(item, [...wrappers, item]);
    }

    if (this.lines.length === lineCountBefore) {
      this.addLine({ kind: LineKind.ListItem, tag: item.localName, nodes: [item], wrappers });
    }
  }

  /** Adds a line unless a reader would see nothing in it. */
  private addLine({ kind, tag, nodes, wrappers }: LineSource): void {
    const { text, pieces } = mapReaderText(nodes);
    const readerSeesNothing = text.length === 0 && !nodes.some(hasVisibleContent);

    if (readerSeesNothing) {
      return;
    }

    const formats = this.formatsOf(pieces);
    const images = lineImages(pieces);
    const itemStart = this.itemStartOf(nodes, wrappers);
    const html = this.lineHtml(nodes, wrappers);

    this.lines.push({ kind, tag, text, formats, images, html, ...itemStart });
  }

  /**
   * Marker and checkbox of the line's innermost `li`, in the first line of the item. Runs before the
   * line's HTML is built, which counts the item's copies.
   */
  private itemStartOf(nodes: readonly Node[], wrappers: readonly Element[]): ItemStart {
    const item = [...wrappers, ...nodes].filter(isMarkerItem).at(-1);
    const startsItem = item !== undefined && !this.copiedWrappers.has(item);

    if (!startsItem) {
      return NO_ITEM_START;
    }

    return { marker: this.markerReader.markerOf(item), checkbox: startCheckboxState(item) };
  }

  /**
   * Format of each piece of the text; neighboring pieces with the same format share a range. An
   * image has the format of its place, like a word.
   */
  private formatsOf(pieces: readonly TextPiece[]): FormattedRange[] {
    const formats: FormattedRange[] = [];

    for (const { start, end, node } of pieces) {
      const format = this.formatReader.formatOf(node);
      const previous = formats.at(-1);
      const extendsPrevious = previous?.format === format && previous.end === start;

      if (extendsPrevious) {
        formats[formats.length - 1] = { ...previous, end };
        continue;
      }

      formats.push({ start, end, format });
    }

    return formats;
  }

  /**
   * HTML of the nodes inside shallow copies of the wrappers, built in an inert template. The list
   * item that the line belongs to, the innermost one, is marked for the view.
   */
  private lineHtml(nodes: readonly Node[], wrappers: readonly Element[]): string {
    const template = document.createElement(TEMPLATE_TAG);
    let parent: Node = template.content;
    let lineItem: Element | null = null;

    for (const wrapper of wrappers) {
      const copy = this.wrapperCopy(wrapper);

      parent = parent.appendChild(copy);

      if (isListItem(copy)) {
        lineItem = copy;
      }
    }

    for (const node of nodes) {
      const copy = parent.appendChild(this.nodeCopy(node));

      if (isListItem(copy)) {
        lineItem = copy;
      }
    }

    lineItem?.toggleAttribute(LINE_ITEM_ATTRIBUTE, true);
    prefixIds(template.content, this.idPrefix);

    return template.innerHTML;
  }

  /**
   * A shallow copy of a container. Only its first copy keeps its id, so ids stay unique. A later
   * copy of a list item hides the marker, which its first line shows.
   */
  private wrapperCopy(wrapper: Element): Element {
    const copy = shallowCopy(wrapper);
    const isFirstCopy = !this.copiedWrappers.has(wrapper);

    if (!isFirstCopy) {
      copy.removeAttribute(ID_ATTRIBUTE);
    }

    if (isMarkerItem(wrapper)) {
      this.setItemNumber(copy, wrapper);
      copy.toggleAttribute(CONTINUED_ITEM_ATTRIBUTE, !isFirstCopy);
    }

    this.copiedWrappers.add(wrapper);

    return copy;
  }

  /** A deep copy of a node; a list item keeps its number, as alone it would count from 1. */
  private nodeCopy(node: Node): Node {
    const copy = node.cloneNode(true);

    if (isMarkerItem(node) && isMarkerItem(copy)) {
      this.setItemNumber(copy, node);
    }

    return copy;
  }

  /** Gives the copy of a list item the number the item has in its list, as its `value`. */
  private setItemNumber(copy: Element, item: Element): void {
    copy.setAttribute(VALUE_ATTRIBUTE, String(this.markerReader.numberOf(item)));
  }
}

function isBlock(node: Node): node is Element {
  return node instanceof Element && BLOCK_TAGS.has(node.localName);
}

/** True for `li`, `dt` and `dd`. */
function isListItem(node: Node): node is Element {
  return node instanceof Element && LIST_ITEM_TAGS.has(node.localName);
}

/** True for `li`, the item that shows a marker, such as a bullet or a number. */
function isMarkerItem(node: Node): node is Element {
  return node instanceof Element && node.localName === LIST_ITEM_TAG;
}

/** A container, such as a quote, a list or a list item, whose blocks become separate lines. */
function isContainerOfBlocks(element: Element): boolean {
  return SPLIT_BLOCK_TAGS.has(element.localName) && Array.from(element.children).some(isBlock);
}

/** Kind and tag of text next to the blocks of a container: a list item's text, or a paragraph. */
function textLineType(container: Element): LineType {
  if (LIST_ITEM_TAGS.has(container.localName)) {
    return { kind: LineKind.ListItem, tag: container.localName };
  }

  return TEXT_OUTSIDE_BLOCKS;
}

function kindOf(block: Element): LineKind {
  if (HEADING_TAGS.has(block.localName)) {
    return LineKind.Heading;
  }

  if (PARAGRAPH_TAGS.has(block.localName)) {
    return LineKind.Paragraph;
  }

  return LineKind.Block;
}

/** A copy of the element without its children. */
function shallowCopy(element: Element): Element {
  return element.cloneNode(false) as Element;
}

/** True for an image, a rule or anything else a reader sees without text, at any depth. */
function hasVisibleContent(node: Node): boolean {
  if (!(node instanceof Element)) {
    return false;
  }

  const isVisibleItself = VISIBLE_WITHOUT_TEXT_TAGS.has(node.localName);

  return isVisibleItself || Array.from(node.children).some(hasVisibleContent);
}
