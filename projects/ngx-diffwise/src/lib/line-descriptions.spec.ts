import { DocumentVersion, LineChangeKind } from '../engine';
import { ENGLISH_TEXTS } from './i18n/en';
import { POLISH_TEXTS } from './i18n/pl';
import { keepOutOfTabOrder, lineDescription } from './line-descriptions';

const TABINDEX_ATTRIBUTE = 'tabindex';

/** The link, the summary, the button and the text of the copy in the test, in their order. */
const COPY_ELEMENTS_SELECTOR = 'a, summary, button, span';

describe('lineDescription', () => {
  it('says that a line was removed or added, with its number', () => {
    const removed = { kind: LineChangeKind.Removed, version: DocumentVersion.Old, lineNumber: 6 };
    const added = { kind: LineChangeKind.Added, version: DocumentVersion.New, lineNumber: 7 };

    expect(lineDescription(removed, ENGLISH_TEXTS)).toBe('Removed line 6');
    expect(lineDescription(added, ENGLISH_TEXTS)).toBe('Added line 7');
  });

  it('says which version of a changed line it is, or that a merged line is changed', () => {
    const changed = { kind: LineChangeKind.Changed, lineNumber: 2 };

    expect(lineDescription({ ...changed, version: DocumentVersion.Old }, ENGLISH_TEXTS)).toBe(
      'Changed line 2, before',
    );
    expect(lineDescription({ ...changed, version: DocumentVersion.New }, ENGLISH_TEXTS)).toBe(
      'Changed line 2, after',
    );
    expect(lineDescription({ ...changed, version: null }, ENGLISH_TEXTS)).toBe('Changed line 2');
  });

  it('describes no unchanged line', () => {
    const unchanged = {
      kind: LineChangeKind.Unchanged,
      version: DocumentVersion.New,
      lineNumber: 1,
    };

    expect(lineDescription(unchanged, ENGLISH_TEXTS)).toBeNull();
  });

  it('describes lines in Polish', () => {
    const changed = { kind: LineChangeKind.Changed, version: DocumentVersion.Old, lineNumber: 12 };
    const removed = { kind: LineChangeKind.Removed, version: DocumentVersion.Old, lineNumber: 3 };

    expect(lineDescription(changed, POLISH_TEXTS)).toBe('Zmieniona linia 12, przed');
    expect(lineDescription(removed, POLISH_TEXTS)).toBe('Usunięta linia 3');
  });
});

describe('keepOutOfTabOrder', () => {
  it('takes links, buttons and other focusable elements out of the order of Tab', () => {
    const copy = document.createElement('div');

    copy.innerHTML =
      '<p>Read the <a href="#guide">guide</a>.</p><details><summary>More</summary></details><button type="button">Go</button><span>Text</span>';
    keepOutOfTabOrder(copy);

    const tabindexes = Array.from(copy.querySelectorAll(COPY_ELEMENTS_SELECTOR), (element) =>
      element.getAttribute(TABINDEX_ATTRIBUTE),
    );

    expect(tabindexes).toEqual(['-1', '-1', '-1', null]);
  });
});
