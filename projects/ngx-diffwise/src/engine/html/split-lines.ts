import {
  BLOCK_TAGS,
  FIGURE_TAG,
  HEADING_TAGS,
  LIST_ITEM_TAG,
  LIST_ITEM_TAGS,
  PARAGRAPH_TAGS,
  SPLIT_BLOCK_TAGS,
  TABLE_CAPTION_TAG,
  TABLE_TAG,
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
  type TableCell,
} from '../model';
import { prefixIds } from './prefix-ids';
import { type TextPiece, mapReaderText } from './reader-text';
import { type GridRow, rowCells, tableGrid } from './table-grid';
import { type TableLinePlace, type TablePart, completeTableCopy } from './table-row-html';
import { TextFormatReader } from './text-format';

const TEMPLATE_TAG = 'template';
const ID_ATTRIBUTE = 'id';
const VALUE_ATTRIBUTE = 'value';

/** Cells of a line that is not a table row. */
const NO_CELLS: readonly TableCell[] = [];

/** The place of a caption: the first line of its table, above its rows. */
const CAPTION_PLACE: TableLinePlace = { isFirstLine: true, isFirstRow: false, isLastRow: false };

/** What a line is built from. */
interface LineSource {
  readonly kind: LineKind;
  readonly tag: string | null;
  readonly nodes: readonly Node[];
  readonly wrappers: readonly Element[];
  /** The part of a table the line shows; none outside tables. */
  readonly tablePart?: TablePart;
}

/** Kind and tag of a line. */
type LineType = Pick<LineSource, 'kind' | 'tag'>;

/**
 * A format range while the line is read: its end moves on as long as the next pieces have its
 * format. A copy for each piece would take long in a large document.
 */
type GrowingRange = { -readonly [Key in keyof FormattedRange]: FormattedRange[Key] };

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

  /** Tables split into lines so far. */
  private tableCount = 0;

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
      } else if (child.localName === TABLE_TAG) {
        this.addTable(child, wrappers);
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

  /**
   * Adds the lines of a table: its caption, then its rows in the order a browser shows them. A row
   * without cells shows nothing, so it gives no line.
   */
  private addTable(table: Element, wrappers: readonly Element[]): void {
    const number = this.tableCount;
    const caption = Array.from(table.children).find(isCaption);
    const rows = tableGrid(table).filter(hasCells);
    const tableWrappers = [...wrappers, table];
    const lineCountBefore = this.lines.length;

    this.tableCount++;

    if (caption !== undefined) {
      const tablePart = { table, number, row: null, place: CAPTION_PLACE };

      this.addLine({
        ...captionLineType(caption),
        nodes: [caption],
        wrappers: tableWrappers,
        tablePart,
      });
    }

    const captionShown = this.lines.length > lineCountBefore;

    for (const [index, row] of rows.entries()) {
      const place = {
        isFirstLine: !captionShown && index === 0,
        isFirstRow: index === 0,
        isLastRow: index === rows.length - 1,
      };
      const tablePart = { table, number, row, place };
      const rowWrappers = [...tableWrappers, row.group];

      this.addLine({ ...rowLineType(row), nodes: [row.element], wrappers: rowWrappers, tablePart });
    }
  }

  /** Adds a line unless a reader would see nothing in it. */
  private addLine(source: LineSource): void {
    const { kind, tag, nodes, wrappers, tablePart } = source;
    const { text, pieces } = mapReaderText(nodes);
    const readerSeesNothing = text.length === 0 && !nodes.some(hasVisibleContent);

    if (readerSeesNothing) {
      return;
    }

    const formats = this.formatsOf(pieces);
    const images = lineImages(pieces);
    const itemStart = this.itemStartOf(nodes, wrappers);
    const table = tablePart?.number ?? null;
    const row = tablePart?.row ?? null;
    const cells = row === null ? NO_CELLS : rowCells(row, pieces);
    const html = this.lineHtml(source);

    this.lines.push({ kind, tag, text, formats, images, html, ...itemStart, table, cells });
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
    const formats: GrowingRange[] = [];

    for (const { start, end, node } of pieces) {
      const format = this.formatReader.formatOf(node);
      const previous = formats.at(-1);
      const extendsPrevious = previous?.format === format && previous.end === start;

      if (extendsPrevious) {
        previous.end = end;
        continue;
      }

      formats.push({ start, end, format });
    }

    return formats;
  }

  /**
   * HTML of the nodes inside shallow copies of the wrappers, built in an inert template. The list
   * item that the line belongs to, the innermost one, is marked for the view, and the copy of a
   * table holds the part of the table that the line shows.
   */
  private lineHtml({ nodes, wrappers, tablePart }: LineSource): string {
    const template = document.createElement(TEMPLATE_TAG);
    const tableKeepsIds = tablePart !== undefined && !this.copiedWrappers.has(tablePart.table);
    const wrapperCopies = wrappers.map((wrapper) => this.wrapperCopy(wrapper));
    const nodeCopies = nodes.map((node) => this.nodeCopy(node));
    const lineItem = [...wrapperCopies, ...nodeCopies].filter(isListItem).at(-1);
    let parent: ParentNode = template.content;

    for (const copy of wrapperCopies) {
      parent = parent.appendChild(copy);
    }

    parent.append(...nodeCopies);
    lineItem?.toggleAttribute(LINE_ITEM_ATTRIBUTE, true);

    if (tablePart !== undefined) {
      const tableCopy = wrapperCopies[wrappers.indexOf(tablePart.table)];

      completeTableCopy(tableCopy, tablePart, tableKeepsIds);
    }

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

/**
 * A container, such as a quote, a list or a list item, whose blocks become separate lines; also a
 * figure that holds a table, so the table splits into rows.
 */
function isContainerOfBlocks(element: Element): boolean {
  const splitsBlocks = SPLIT_BLOCK_TAGS.has(element.localName) || isFigureOfTable(element);
  return splitsBlocks && Array.from(element.children).some(isBlock);
}

function isFigureOfTable(element: Element): boolean {
  const holdsTable = Array.from(element.children).some((child) => child.localName === TABLE_TAG);
  return element.localName === FIGURE_TAG && holdsTable;
}

function isCaption(element: Element): boolean {
  return element.localName === TABLE_CAPTION_TAG;
}

function hasCells(row: GridRow): boolean {
  return row.cells.length > 0;
}

function captionLineType(caption: Element): LineType {
  return { kind: LineKind.TableCaption, tag: caption.localName };
}

function rowLineType(row: GridRow): LineType {
  return { kind: LineKind.TableRow, tag: row.element.localName };
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
