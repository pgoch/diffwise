import { comparisonText } from './comparison-text';
import type { DiffOptions, TextRange, WordChanges } from './model';
import { EditKind, myersDiff } from './myers';
import { type Token, TokenKind, splitWords } from './split-words';

const WHITESPACE_ONLY = /^\s*$/;

/** Text removed from and added to a changed line, compared word by word. */
export function diffWords(oldText: string, newText: string, options: DiffOptions): WordChanges {
  const oldTokens = comparedTokens(oldText, options);
  const newTokens = comparedTokens(newText, options);
  const edits = myersDiff(
    oldTokens.map((token) => comparisonText(token.text, options)),
    newTokens.map((token) => comparisonText(token.text, options)),
  );
  const removed: TextRange[] = [];
  const added: TextRange[] = [];

  for (const edit of edits) {
    if (edit.kind === EditKind.Delete) {
      addRange(removed, oldTokens[edit.oldIndex], oldText);
    } else if (edit.kind === EditKind.Insert) {
      addRange(added, newTokens[edit.newIndex], newText);
    }
  }

  return { removed, added };
}

/** Tokens that take part in the comparison; whitespace drops out when it is ignored. */
function comparedTokens(text: string, options: DiffOptions): Token[] {
  const tokens = splitWords(text);

  return options.ignoreWhitespace ? withoutWhitespace(tokens) : tokens;
}

function withoutWhitespace(tokens: readonly Token[]): Token[] {
  return tokens.filter((token) => token.kind !== TokenKind.Whitespace);
}

/** Adds the range of a token, joined with the previous range if only whitespace lies between. */
function addRange(ranges: TextRange[], token: Token, text: string): void {
  const end = token.start + token.text.length;
  const previous = ranges.at(-1);

  if (previous && onlyWhitespaceBetween(text, previous.end, token.start)) {
    ranges[ranges.length - 1] = { start: previous.start, end };
    return;
  }

  ranges.push({ start: token.start, end });
}

function onlyWhitespaceBetween(text: string, start: number, end: number): boolean {
  return WHITESPACE_ONLY.test(text.slice(start, end));
}
