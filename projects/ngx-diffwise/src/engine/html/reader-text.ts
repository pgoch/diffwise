import { PRESERVE_WHITESPACE_TAGS, WORD_BREAK_TAGS } from './html-tags';

const SPACE = ' ';
const WHITESPACE = /\s+/;
const NO_BREAK_SPACE = '\u00a0';

/** Text as a reader sees it: whitespace shows as single spaces, except in code blocks. */
export function readerText(nodes: Iterable<Node>): string {
  const builder = new ReaderTextBuilder();

  for (const node of nodes) {
    builder.addNode(node);
  }

  return builder.toString();
}

/** Joins words with single spaces, as a browser shows them. */
class ReaderTextBuilder {
  private builtText = '';
  private spaceBeforeNextWord = false;

  /** Adds the text of a node and everything inside it. */
  addNode(node: Node, keepWhitespace = false): void {
    if (node instanceof Text) {
      this.addText(node.data, keepWhitespace);
    } else if (node instanceof Element) {
      this.addElement(node, keepWhitespace);
    }
  }

  toString(): string {
    return this.builtText;
  }

  private addElement(element: Element, keepWhitespace: boolean): void {
    const separatesWords = WORD_BREAK_TAGS.has(element.localName);
    const keepInnerWhitespace = keepWhitespace || PRESERVE_WHITESPACE_TAGS.has(element.localName);

    if (separatesWords) {
      this.spaceBeforeNextWord = true;
    }

    for (const child of element.childNodes) {
      this.addNode(child, keepInnerWhitespace);
    }

    if (separatesWords) {
      this.spaceBeforeNextWord = true;
    }
  }

  private addText(text: string, keepWhitespace: boolean): void {
    if (keepWhitespace) {
      this.addWord(text.replaceAll(NO_BREAK_SPACE, SPACE));
      return;
    }

    text.split(WHITESPACE).forEach((word, index) => {
      if (index > 0) {
        this.spaceBeforeNextWord = true;
      }

      this.addWord(word);
    });
  }

  private addWord(word: string): void {
    if (word.length === 0) {
      return;
    }

    if (this.spaceBeforeNextWord && this.builtText.length > 0) {
      this.builtText += SPACE;
    }

    this.builtText += word;
    this.spaceBeforeNextWord = false;
  }
}
