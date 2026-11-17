import { ADDED_TEXT_MARKER, type ChangeMarker, REMOVED_TEXT_MARKER } from '../mark/mark-changes';
import { type WordChangedPair, removedTextSeparators } from '../mark/merge-lines';
import {
  HIDDEN_SPACE_ATTRIBUTE,
  REPLACED_TEXT_ATTRIBUTE,
  type RemovedRange,
  type TextRange,
} from '../model';

const NO_TEXT = '';
const SPACE = ' ';
const TAB = '\t';
const SPAN_TAG = 'span';
const CLASS_ATTRIBUTE = 'class';
const CLASS_SEPARATOR = ' ';

/** The value of an on-off attribute, as the DOM writes it, such as `data-diffwise-replaced=""`. */
const ON_ATTRIBUTE_VALUE = '';

/** Characters that HTML reads as markup. */
const MARKUP_CHARACTERS = /[&<>]/g;

/** Character references that show the characters of markup as text. */
const CHARACTER_REFERENCES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/** Spaces and tabs, which changed text shows as signs. */
const SPACES_AND_TABS = /[ \t]/g;

/** Holds a space or a tab of changed text; styles draw a sign over it, so copied text keeps it. */
const WHITESPACE_CLASS = 'diffwise-diff__whitespace';
const SPACE_CLASS = `${WHITESPACE_CLASS}--space`;
const TAB_CLASS = `${WHITESPACE_CLASS}--tab`;

/** An attribute of an element: its name and its value, which holds no characters to escape. */
type Attribute = readonly [name: string, value: string];

const REPLACED_TEXT: Attribute = [REPLACED_TEXT_ATTRIBUTE, ON_ATTRIBUTE_VALUE];

/** HTML of each space and tab in changed text. */
const MARKED_WHITESPACE: Readonly<Record<string, string>> = {
  [SPACE]: elementHtml(SPAN_TAG, [classAttribute([WHITESPACE_CLASS, SPACE_CLASS])], SPACE),
  [TAB]: elementHtml(SPAN_TAG, [classAttribute([WHITESPACE_CLASS, TAB_CLASS])], TAB),
};

/**
 * The space between removed text and the added text that replaces it, which only screen readers
 * and copied text see.
 */
const HIDDEN_SPACE_HTML = elementHtml(
  SPAN_TAG,
  [[HIDDEN_SPACE_ATTRIBUTE, ON_ATTRIBUTE_VALUE]],
  SPACE,
);

/** HTML of a part of a merged line that goes before the new text at a position. */
interface PlacedHtml {
  readonly position: number;
  readonly html: string;
}

/** HTML that shows the text as it is: the characters of markup escaped, so no text becomes HTML. */
export function textHtml(text: string): string {
  return text.replace(MARKUP_CHARACTERS, (character) => CHARACTER_REFERENCES[character]);
}

/**
 * HTML of a line's text with the ranges in markers, such as removed text in `del`. The ranges come
 * in reading order and apart, as the comparison of words gives them.
 */
export function markedTextHtml(
  text: string,
  ranges: readonly TextRange[],
  marker: ChangeMarker,
): string {
  const parts: string[] = [];
  let position = 0;

  for (const { start, end } of ranges) {
    const unchangedText = text.slice(position, start);
    const changedText = text.slice(start, end);

    parts.push(textHtml(unchangedText), changedTextHtml(changedText, marker));
    position = end;
  }

  parts.push(textHtml(text.slice(position)));

  return parts.join(NO_TEXT);
}

/**
 * HTML of a changed pair as one line: the new line's text with its added text marked, and the text
 * removed from the old line, marked, where it stood. Removed text gets the same separators as in a
 * merged line of an HTML document, such as a space where the old line had one.
 */
export function mergedTextHtml(pair: WordChangedPair): string {
  const newText = pair.newLine.text;
  const added = pair.wordChanges.added;
  const removedParts = pair.wordChanges.removed.map((removed) => removedPart(removed, pair));
  const cuts = cutPositions(newText, added, removedParts);
  const parts: string[] = [];

  for (const [index, cut] of cuts.entries()) {
    const removedHere = removedParts.filter((part) => part.position === cut);
    const nextCut = cuts.at(index + 1);

    parts.push(...removedHere.map((part) => part.html));

    if (nextCut !== undefined) {
      parts.push(pieceHtml(newText, { start: cut, end: nextCut }, added));
    }
  }

  return parts.join(NO_TEXT);
}

/** Removed text in its marker, with its separators, and its place in the new line's text. */
function removedPart(removed: RemovedRange, pair: WordChangedPair): PlacedHtml {
  const bounds = { start: 0, end: pair.newLine.text.length };
  const { spaceBefore, isReplaced, spaceAfter } = removedTextSeparators(removed, pair, bounds);
  const removedText = pair.oldLine.text.slice(removed.start, removed.end);
  const textBefore = spaceBefore ? SPACE : NO_TEXT;
  const markedText = changedTextHtml(removedText, REMOVED_TEXT_MARKER, isReplaced);
  const hiddenSpace = isReplaced ? HIDDEN_SPACE_HTML : NO_TEXT;
  const textAfter = spaceAfter ? SPACE : NO_TEXT;
  const html = [textBefore, markedText, hiddenSpace, textAfter].join(NO_TEXT);

  return { position: removed.newPosition, html };
}

/**
 * Positions where the merged line cuts the new line's text: its ends, the edges of added text and
 * the places of removed text. Removed text may stand inside added text joined across whitespace.
 */
function cutPositions(
  newText: string,
  added: readonly TextRange[],
  removedParts: readonly PlacedHtml[],
): number[] {
  const addedEdges = added.flatMap(({ start, end }) => [start, end]);
  const removedPlaces = removedParts.map((part) => part.position);
  const positions = new Set([0, ...addedEdges, ...removedPlaces, newText.length]);

  return [...positions].sort((first, second) => first - second);
}

/** HTML of a piece of the new line's text between two cuts: marked when it is added text. */
function pieceHtml(newText: string, piece: TextRange, added: readonly TextRange[]): string {
  const pieceText = newText.slice(piece.start, piece.end);
  const isAdded = added.some((range) => range.start <= piece.start && piece.end <= range.end);

  return isAdded ? changedTextHtml(pieceText, ADDED_TEXT_MARKER) : textHtml(pieceText);
}

/**
 * HTML of changed text in its marker, with each space and tab in an element that styles show as a
 * sign. Removed text that added text replaces is marked for the gap between the two.
 */
function changedTextHtml(text: string, marker: ChangeMarker, isReplaced = false): string {
  const content = textHtml(text).replace(
    SPACES_AND_TABS,
    (character) => MARKED_WHITESPACE[character],
  );
  const markerClasses = classAttribute(marker.classNames);
  const attributes = isReplaced ? [markerClasses, REPLACED_TEXT] : [markerClasses];

  return elementHtml(marker.tag, attributes, content);
}

/** The `class` attribute with the class names. */
function classAttribute(classNames: readonly string[]): Attribute {
  return [CLASS_ATTRIBUTE, classNames.join(CLASS_SEPARATOR)];
}

/** HTML of an element around content, with its attributes in their order. */
function elementHtml(tag: string, attributes: readonly Attribute[], content: string): string {
  const attributesHtml = attributes.map(([name, value]) => ` ${name}="${value}"`).join(NO_TEXT);
  return `<${tag}${attributesHtml}>${content}</${tag}>`;
}
