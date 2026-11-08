import { PRESERVE_WHITESPACE_TAGS, WORD_BREAK_TAGS } from './html-tags';

const SPACE = ' ';
const NO_BREAK_SPACE = '\u00a0';

/** Splits text at whitespace runs and keeps them, so words and whitespace runs alternate. */
const WHITESPACE_RUN = /(\s+)/;
const WHITESPACE_ONLY = /^\s+$/;

/** A piece of reader text read from one text node. */
export interface TextPiece {
  /** Where the piece starts in the reader text. */
  readonly start: number;
  /** Where the piece ends in the reader text. */
  readonly end: number;
  readonly node: Text;
  /** Where the piece starts in the node's text. */
  readonly nodeOffset: number;
}

/** Reader text and the text nodes it was read from. */
export interface ReaderTextMap {
  readonly text: string;
  /** Pieces in reading order. A space between blocks has no piece, since no text node holds it. */
  readonly pieces: readonly TextPiece[];
}

/** A character in a text node. */
interface NodePosition {
  readonly node: Text;
  readonly offset: number;
}

/** Text as a reader sees it: whitespace shows as single spaces, except in code blocks. */
export function readerText(nodes: Iterable<Node>): string {
  return mapReaderText(nodes).text;
}

/** Reader text with the place in the text nodes that each piece of it comes from. */
export function mapReaderText(nodes: Iterable<Node>): ReaderTextMap {
  const builder = new ReaderTextBuilder();

  for (const node of nodes) {
    builder.addNode(node);
  }

  return builder.build();
}

/** Joins words with single spaces, as a browser shows them, and records where pieces come from. */
class ReaderTextBuilder {
  private builtText = '';
  private readonly builtPieces: TextPiece[] = [];
  private spaceBeforeNextWord = false;
  /** Whitespace the waiting space comes from; `null` when a block or a line break asked for it. */
  private spaceSource: NodePosition | null = null;

  /** Adds the text of a node and everything inside it. */
  addNode(node: Node, keepWhitespace = false): void {
    if (node instanceof Text) {
      this.addText(node, keepWhitespace);
    } else if (node instanceof Element) {
      this.addElement(node, keepWhitespace);
    }
  }

  build(): ReaderTextMap {
    return { text: this.builtText, pieces: this.builtPieces };
  }

  private addElement(element: Element, keepWhitespace: boolean): void {
    const separatesWords = WORD_BREAK_TAGS.has(element.localName);
    const keepInnerWhitespace = keepWhitespace || PRESERVE_WHITESPACE_TAGS.has(element.localName);

    if (separatesWords) {
      this.askForSpace(null);
    }

    for (const child of element.childNodes) {
      this.addNode(child, keepInnerWhitespace);
    }

    if (separatesWords) {
      this.askForSpace(null);
    }
  }

  private addText(node: Text, keepWhitespace: boolean): void {
    if (keepWhitespace) {
      this.addWord(node.data.replaceAll(NO_BREAK_SPACE, SPACE), { node, offset: 0 });
      return;
    }

    let offset = 0;

    for (const part of node.data.split(WHITESPACE_RUN)) {
      if (WHITESPACE_ONLY.test(part)) {
        this.askForSpace({ node, offset });
      } else {
        this.addWord(part, { node, offset });
      }

      offset += part.length;
    }
  }

  /** Puts a space before the next word. The first request decides where the space comes from. */
  private askForSpace(source: NodePosition | null): void {
    if (this.spaceBeforeNextWord) {
      return;
    }

    this.spaceBeforeNextWord = true;
    this.spaceSource = source;
  }

  private addWord(word: string, source: NodePosition): void {
    if (word.length === 0) {
      return;
    }

    if (this.spaceBeforeNextWord && this.builtText.length > 0) {
      this.append(SPACE, this.spaceSource);
    }

    this.append(word, source);
    this.spaceBeforeNextWord = false;
  }

  /** Adds text, and a piece that points to it when a text node holds it. */
  private append(text: string, source: NodePosition | null): void {
    const start = this.builtText.length;

    this.builtText += text;

    if (source) {
      this.builtPieces.push({
        start,
        end: this.builtText.length,
        node: source.node,
        nodeOffset: source.offset,
      });
    }
  }
}
