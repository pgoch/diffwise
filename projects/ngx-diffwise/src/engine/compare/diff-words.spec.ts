import { diffWords } from './diff-words';
import { parseHtml } from '../html/parse-html';
import { IMAGE_CHARACTER } from '../html/reader-text';
import { splitLines } from '../html/split-lines';
import { DEFAULT_DIFF_OPTIONS, type DiffOptions, type LineContent } from '../model';

const SENTENCE = 'The service runs all day and night, also on holidays and long weekends. ';
const SENTENCES_AROUND_CHANGE = 5;
const ID_PREFIX = 'diff-';
const NO_CHANGES = { removed: [], added: [] };

/** Removed and added text of two lines, instead of their ranges. */
function changedContent(
  oldLine: LineContent,
  newLine: LineContent,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
) {
  const { removed, added } = diffWords(oldLine, newLine, options);
  const removedTexts = removed.map((range) => oldLine.text.slice(range.start, range.end));
  const addedTexts = added.map((range) => newLine.text.slice(range.start, range.end));

  return { removed: removedTexts, added: addedTexts };
}

/** Removed and added text of two texts without images. */
function changedTexts(oldText: string, newText: string, options?: DiffOptions) {
  return changedContent({ text: oldText, images: [] }, { text: newText, images: [] }, options);
}

/** Removed and added text of the first lines of two documents. */
function changedLineTexts(oldHtml: string, newHtml: string) {
  const [oldLine] = splitLines(parseHtml(oldHtml), ID_PREFIX);
  const [newLine] = splitLines(parseHtml(newHtml), ID_PREFIX);

  return changedContent(oldLine, newLine);
}

/** Each removed text of two texts with the new text before the place where it stood. */
function removedTextPlaces(oldText: string, newText: string, options = DEFAULT_DIFF_OPTIONS) {
  const { removed } = diffWords(
    { text: oldText, images: [] },
    { text: newText, images: [] },
    options,
  );

  return removed.map(({ start, end, newPosition }) => [
    oldText.slice(start, end),
    newText.slice(0, newPosition),
  ]);
}

/** A paragraph of about 700 characters with one chosen word in the middle. */
function longParagraph(middleWord: string): string {
  const around = SENTENCE.repeat(SENTENCES_AROUND_CHANGE);
  return `${around}Support is ${middleWord} for all customers. ${around}`;
}

describe('diffWords', () => {
  it('marks only the changed word', () => {
    expect(
      changedTexts(
        'You can delete the account in the settings.',
        'You can close the account in the settings.',
      ),
    ).toEqual({ removed: ['delete'], added: ['close'] });
  });

  it('marks two changes in one line separately', () => {
    expect(
      changedTexts(
        'The fee is 19 USD and is paid at the start.',
        'The fee is 29 USD and is paid at the end.',
      ),
    ).toEqual({ removed: ['19', 'start'], added: ['29', 'end'] });
  });

  it('joins changed words separated only by whitespace', () => {
    expect(changedTexts('old plan name', 'new brand name')).toEqual({
      removed: ['old plan'],
      added: ['new brand'],
    });
  });

  it('marks a change of letter case unless case is ignored', () => {
    const ignoreCase = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(changedTexts('Business Account', 'Business account')).toEqual({
      removed: ['Account'],
      added: ['account'],
    });
    expect(changedTexts('Business Account', 'Business account', ignoreCase)).toEqual({
      removed: [],
      added: [],
    });
  });

  it('leaves whitespace at the edges of a change unmarked', () => {
    expect(changedTexts('Click', 'Click here')).toEqual({ removed: [], added: ['here'] });
  });

  it('keeps whitespace at the start and the end of the text in a change, such as an indentation', () => {
    expect(changedTexts('  old words', '    new words')).toEqual({
      removed: ['  old'],
      added: ['    new'],
    });
    expect(changedTexts('first item  ', 'first entry')).toEqual({
      removed: ['item  '],
      added: ['entry'],
    });
  });

  it('moves a removed sentence to start at a word and end with its full stop', () => {
    expect(
      changedTexts(
        'Open the side menu and add a name. You can change it later.',
        'Open the top menu and add a name.',
      ),
    ).toEqual({ removed: ['side', 'You can change it later.'], added: ['top'] });
  });

  it('moves an added sentence to start at a word and end with its full stop', () => {
    expect(
      changedTexts(
        'Use short names. Avoid repeats. Review tags every month.',
        'Use short names. Review tags every month. Write in one language.',
      ),
    ).toEqual({ removed: ['Avoid repeats.'], added: ['Write in one language.'] });
  });

  it('marks a change of whitespace unless whitespace is ignored', () => {
    const ignoreWhitespace = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };

    expect(changedTexts('let a  = 1;', 'let a = 1;')).toEqual({ removed: ['  '], added: [' '] });
    expect(changedTexts('let a  = 1;', 'let a = 1;', ignoreWhitespace)).toEqual({
      removed: [],
      added: [],
    });
  });

  it('finds one changed word in a long paragraph', () => {
    expect(changedTexts(longParagraph('unlimited'), longParagraph('limited'))).toEqual({
      removed: ['unlimited'],
      added: ['limited'],
    });
  });

  it('marks an added emoji whole, never half of it', () => {
    expect(changedTexts('Thanks for the update 🙂', 'Thanks for the update 🙂🎉')).toEqual({
      removed: [],
      added: ['🎉'],
    });
  });

  it('marks only the changed word in Chinese text', () => {
    expect(changedTexts('我们的服务全天开放。', '我们的服务每天开放。')).toEqual({
      removed: ['全天'],
      added: ['每天'],
    });
  });

  it('compares images by their files, like words', () => {
    expect(
      changedLineTexts(
        '<p><img src="images/logo-2025.svg" alt="Logo"> Notebook Online</p>',
        '<p><img src="images/logo-2026.svg" alt="Logo"> Notebook Online</p>',
      ),
    ).toEqual({ removed: [IMAGE_CHARACTER], added: [IMAGE_CHARACTER] });
  });

  it('keeps the same file unchanged as a word, whatever its size or alternative text', () => {
    expect(
      changedLineTexts(
        '<p><img src="images/logo-2025.svg" alt="Logo" width="160"> Notebook</p>',
        '<p><img src="images/logo-2025.svg" alt="Notebook logo" width="220"> Notebook</p>',
      ),
    ).toEqual(NO_CHANGES);
  });

  it('marks an image added to a sentence like an added word', () => {
    expect(
      changedLineTexts(
        '<p>Click <strong>Share</strong>.</p>',
        '<p>Click <img src="images/icon-share.svg" alt=""> <strong>Share</strong>.</p>',
      ),
    ).toEqual({ removed: [], added: [IMAGE_CHARACTER] });
  });

  it('places replaced text where the text that replaces it starts', () => {
    expect(
      removedTextPlaces(
        'The fee is 19 USD and is charged in advance.',
        'The fee is 29 USD and is charged afterwards.',
      ),
    ).toEqual([
      ['19', 'The fee is '],
      ['in advance', 'The fee is 29 USD and is charged '],
    ]);
  });

  it('places text removed from between words between the same words of the new text', () => {
    const [[removedText, textBefore]] = removedTextPlaces(
      'You can create one account today.',
      'You can create today.',
    );

    expect(removedText).toBe('one account');
    expect(textBefore.trimEnd()).toBe('You can create');
  });

  it('places text removed from the start and from the end at the edges of the new text', () => {
    expect(removedTextPlaces('Old intro. The rest stays.', 'The rest stays.')).toEqual([
      ['Old intro.', ''],
    ]);
    expect(removedTextPlaces('The rest stays. Old outro', 'The rest stays.')).toEqual([
      ['Old outro', 'The rest stays.'],
    ]);
  });

  it('places removed text that slid forward after the text it slid over', () => {
    expect(removedTextPlaces('First. Next one.', 'First.')).toEqual([['Next one.', 'First.']]);
  });

  it('places removed text before the next word when whitespace is ignored', () => {
    const ignoreWhitespace = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };

    expect(
      removedTextPlaces('Keep  the old   name', 'Keep the new name', ignoreWhitespace),
    ).toEqual([['old', 'Keep the ']]);
  });

  it('keeps the place of the first of the removed texts joined across whitespace', () => {
    expect(removedTextPlaces('the old plan name', 'the new product name')).toEqual([
      ['old plan', 'the '],
    ]);
  });
});
