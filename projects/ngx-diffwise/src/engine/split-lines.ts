import {
  BLOCK_TAGS,
  CONTAINER_TAGS,
  HEADING_TAGS,
  PARAGRAPH_TAGS,
  VISIBLE_WITHOUT_TEXT_TAGS,
} from './html-tags';
import { type Line, LineKind } from './model';
import { readerText } from './reader-text';

const TEMPLATE_TAG = 'template';

/** What a line is built from. */
interface LineSource {
  readonly kind: LineKind;
  readonly tag: string | null;
  readonly nodes: readonly Node[];
  readonly wrappers: readonly Element[];
}

/** Splits a parsed document into lines. */
export function splitLines(root: Element): Line[] {
  const lines: Line[] = [];

  collectLines(root, [], lines);

  return lines;
}

/** Adds lines for the children of a container; containers of blocks are split further. */
function collectLines(container: Element, wrappers: readonly Element[], lines: Line[]): void {
  let inlineNodes: Node[] = [];

  const addInlineLine = (): void => {
    addLine(lines, { kind: LineKind.Paragraph, tag: null, nodes: inlineNodes, wrappers });
    inlineNodes = [];
  };

  for (const child of container.childNodes) {
    if (!isBlock(child)) {
      inlineNodes.push(child);
      continue;
    }

    addInlineLine();

    if (isContainerOfBlocks(child)) {
      collectLines(child, [...wrappers, child], lines);
    } else {
      addLine(lines, { kind: kindOf(child), tag: child.localName, nodes: [child], wrappers });
    }
  }

  addInlineLine();
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

/** Adds a line unless a reader would see nothing in it. */
function addLine(lines: Line[], { kind, tag, nodes, wrappers }: LineSource): void {
  const text = readerText(nodes);
  const readerSeesNothing = text.length === 0 && !nodes.some(hasVisibleContent);

  if (readerSeesNothing) {
    return;
  }

  lines.push({ kind, tag, text, html: lineHtml(nodes, wrappers) });
}

/** True for an image, a rule or anything else a reader sees without text, at any depth. */
function hasVisibleContent(node: Node): boolean {
  if (!(node instanceof Element)) {
    return false;
  }

  const isVisibleItself = VISIBLE_WITHOUT_TEXT_TAGS.has(node.localName);

  return isVisibleItself || Array.from(node.children).some(hasVisibleContent);
}

/** HTML of the nodes inside shallow copies of the wrappers, built in an inert template. */
function lineHtml(nodes: readonly Node[], wrappers: readonly Element[]): string {
  const template = document.createElement(TEMPLATE_TAG);
  let parent: Node = template.content;

  for (const wrapper of wrappers) {
    parent = parent.appendChild(wrapper.cloneNode(false));
  }

  for (const node of nodes) {
    parent.appendChild(node.cloneNode(true));
  }

  return template.innerHTML;
}
