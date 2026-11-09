import {
  BLOCK_TAGS,
  CONTAINER_TAGS,
  HEADING_TAGS,
  PARAGRAPH_TAGS,
  VISIBLE_WITHOUT_TEXT_TAGS,
} from './html-tags';
import { type FormattedRange, type Line, LineKind } from '../model';
import { prefixIds } from './prefix-ids';
import { type TextPiece, mapReaderText } from './reader-text';
import { TextFormatReader } from './text-format';

const TEMPLATE_TAG = 'template';

/** What a line is built from. */
interface LineSource {
  readonly kind: LineKind;
  readonly tag: string | null;
  readonly nodes: readonly Node[];
  readonly wrappers: readonly Element[];
}

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

  constructor(private readonly idPrefix: string) {}

  /** Adds lines for the children of a container; containers of blocks are split further. */
  addChildren(container: Element, wrappers: readonly Element[]): void {
    let inlineNodes: Node[] = [];

    const addInlineLine = (): void => {
      this.addLine({ kind: LineKind.Paragraph, tag: null, nodes: inlineNodes, wrappers });
      inlineNodes = [];
    };

    for (const child of container.childNodes) {
      if (!isBlock(child)) {
        inlineNodes.push(child);
        continue;
      }

      addInlineLine();

      if (isContainerOfBlocks(child)) {
        this.addChildren(child, [...wrappers, child]);
      } else {
        this.addLine({ kind: kindOf(child), tag: child.localName, nodes: [child], wrappers });
      }
    }

    addInlineLine();
  }

  /** Adds a line unless a reader would see nothing in it. */
  private addLine({ kind, tag, nodes, wrappers }: LineSource): void {
    const { text, pieces } = mapReaderText(nodes);
    const readerSeesNothing = text.length === 0 && !nodes.some(hasVisibleContent);

    if (readerSeesNothing) {
      return;
    }

    const formats = this.formatsOf(pieces);
    const html = this.lineHtml(nodes, wrappers);

    this.lines.push({ kind, tag, text, formats, html });
  }

  /** Format of each piece of the text; neighboring pieces with the same format share a range. */
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

  /** HTML of the nodes inside shallow copies of the wrappers, built in an inert template. */
  private lineHtml(nodes: readonly Node[], wrappers: readonly Element[]): string {
    const template = document.createElement(TEMPLATE_TAG);
    let parent: Node = template.content;

    for (const wrapper of wrappers) {
      parent = parent.appendChild(wrapper.cloneNode(false));
    }

    for (const node of nodes) {
      parent.appendChild(node.cloneNode(true));
    }

    prefixIds(template.content, this.idPrefix);

    return template.innerHTML;
  }
}

function isBlock(node: Node): node is Element {
  return node instanceof Element && BLOCK_TAGS.has(node.localName);
}

/** A container, such as a quote, whose blocks become separate lines. */
function isContainerOfBlocks(element: Element): boolean {
  return CONTAINER_TAGS.has(element.localName) && Array.from(element.children).some(isBlock);
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

/** True for an image, a rule or anything else a reader sees without text, at any depth. */
function hasVisibleContent(node: Node): boolean {
  if (!(node instanceof Element)) {
    return false;
  }

  const isVisibleItself = VISIBLE_WITHOUT_TEXT_TAGS.has(node.localName);

  return isVisibleItself || Array.from(node.children).some(hasVisibleContent);
}
