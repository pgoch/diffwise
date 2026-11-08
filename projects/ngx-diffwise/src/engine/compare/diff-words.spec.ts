import { diffWords } from './diff-words';
import { DEFAULT_DIFF_OPTIONS, type DiffOptions } from '../model';

const SENTENCE = 'Usługa działa przez całą dobę, także w święta i długie weekendy. ';
const SENTENCES_AROUND_CHANGE = 5;

/** Removed and added text, instead of their ranges. */
function changedTexts(
  oldText: string,
  newText: string,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
) {
  const { removed, added } = diffWords(oldText, newText, options);
  const removedTexts = removed.map((range) => oldText.slice(range.start, range.end));
  const addedTexts = added.map((range) => newText.slice(range.start, range.end));

  return { removed: removedTexts, added: addedTexts };
}

/** A paragraph of about 700 characters with one chosen word in the middle (T10). */
function longParagraph(middleWord: string): string {
  const around = SENTENCE.repeat(SENTENCES_AROUND_CHANGE);
  return `${around}Pomoc jest ${middleWord} dla klientów. ${around}`;
}

describe('diffWords', () => {
  it('marks only the changed word (T2)', () => {
    expect(
      changedTexts('Konto można usunąć w ustawieniach.', 'Konto można zamknąć w ustawieniach.'),
    ).toEqual({ removed: ['usunąć'], added: ['zamknąć'] });
  });

  it('marks two changes in one line separately (T3)', () => {
    expect(
      changedTexts(
        'Opłata wynosi 19 zł i jest pobierana z góry.',
        'Opłata wynosi 29 zł i jest pobierana z dołu.',
      ),
    ).toEqual({ removed: ['19', 'góry'], added: ['29', 'dołu'] });
  });

  it('joins changed words separated only by whitespace', () => {
    expect(changedTexts('stara nazwa planu', 'nowa marka planu')).toEqual({
      removed: ['stara nazwa'],
      added: ['nowa marka'],
    });
  });

  it('marks a change of letter case unless case is ignored (T9)', () => {
    const ignoreCase = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(changedTexts('Konto Firmowe', 'Konto firmowe')).toEqual({
      removed: ['Firmowe'],
      added: ['firmowe'],
    });
    expect(changedTexts('Konto Firmowe', 'Konto firmowe', ignoreCase)).toEqual({
      removed: [],
      added: [],
    });
  });

  it('marks a change of whitespace unless whitespace is ignored', () => {
    const ignoreWhitespace = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };

    expect(changedTexts('let a  = 1;', 'let a = 1;')).toEqual({ removed: ['  '], added: [' '] });
    expect(changedTexts('let a  = 1;', 'let a = 1;', ignoreWhitespace)).toEqual({
      removed: [],
      added: [],
    });
  });

  it('finds one changed word in a long paragraph (T10)', () => {
    expect(changedTexts(longParagraph('bezpłatna'), longParagraph('płatna'))).toEqual({
      removed: ['bezpłatna'],
      added: ['płatna'],
    });
  });

  it('marks an added emoji whole, never half of it (T13)', () => {
    expect(changedTexts('Zażółć gęślą jaźń 🙂', 'Zażółć gęślą jaźń 🙂🎉')).toEqual({
      removed: [],
      added: ['🎉'],
    });
  });

  it('marks only the changed word in Chinese text (T14)', () => {
    expect(changedTexts('我们的服务全天开放。', '我们的服务每天开放。')).toEqual({
      removed: ['全天'],
      added: ['每天'],
    });
  });
});
