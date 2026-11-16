import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { type DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseAlignment,
  DiffwiseChangeDetails,
  DiffwiseChangeDetailsIconStyle,
  DiffwiseInlineDiffStyle,
  DiffwiseLanguage,
  DiffwiseLayout,
  DiffwiseNoChangesView,
  DiffwiseTooltipColorMode,
} from './config/option-values';
import { type DiffwiseDiffStats } from './diff-stats';
import { DiffwiseHtml } from './diffwise-html';
import { DiffwiseText } from './diffwise-text';

const OLD_TEXT_INPUT = 'oldText';
const NEW_TEXT_INPUT = 'newText';
const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const WARN_METHOD = 'warn';
const HOST_CLASS = 'diffwise-diff';
const ROLE_ATTRIBUTE = 'role';
const REGION_ROLE = 'region';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const ROW_SELECTOR = '.diffwise-diff__row';
const ROW_KIND_CLASS_START = 'diffwise-diff__row--';
const ROW_PART_SELECTOR = '.diffwise-diff__line-number, .diffwise-diff__gap';
const GAP_CLASS = 'diffwise-diff__gap';
const GAP = 'gap';
const CONTENT_SELECTOR = '.diffwise-diff__content';
const OLD_CONTENT_SELECTOR = '.diffwise-diff__content--old';
const NEW_CONTENT_SELECTOR = '.diffwise-diff__content--new';
const MERGED_CONTENT_SELECTOR = '.diffwise-diff__content--merged';
const REMOVED_SELECTOR = 'del.diffwise-diff__highlight--removed';
const ADDED_SELECTOR = 'ins.diffwise-diff__highlight--added';
const SPACE_SIGN_SELECTOR = '.diffwise-diff__whitespace--space';
const TAB_SIGN_SELECTOR = '.diffwise-diff__whitespace--tab';
const ANY_ELEMENT_SELECTOR = '*';
const MARKER_ELEMENTS = new Set(['del', 'ins', 'span']);
const COLLAPSED_LINES_SELECTOR = '.diffwise-diff__collapsed-lines';
const ACTIVE_ROW_SELECTOR = '.diffwise-diff__row--active';
const VERSION_HEADER_SELECTOR = '.diffwise-diff__version-header';
const DESCRIPTION_SELECTOR = '[data-diffwise-line-description]';
const CHOICE_SELECTOR = '.diffwise-diff__view-settings-choice';
const GROUP_LABEL_SELECTOR = '.diffwise-diff__view-settings-label';
const DARK_THEME_CLASS = 'diffwise-diff--dark-theme';
const LINE_COUNT = 12;
const CHANGED_LINE = 6;

/** Twelve lines with another word in the line of the given number. */
function numberedLines(changedNumber: number | null): string {
  return Array.from({ length: LINE_COUNT }, (_, index) => {
    const number = index + 1;
    const word = number === changedNumber ? 'changed' : 'sample';

    return `Line ${number} of the ${word} text.`;
  }).join('\n');
}

/** jsdom does not scroll; the navigation only needs the method to exist. */
Element.prototype.scrollIntoView = function () {
  return undefined;
};

/** jsdom has no Popover API; the view settings only need the methods to exist. */
HTMLElement.prototype.showPopover = function () {
  return undefined;
};

HTMLElement.prototype.hidePopover = function () {
  return undefined;
};

/** Renders the diff of two texts with its options. */
function render(
  oldText: string,
  newText: string,
  options: DiffwiseConfigOptions = {},
): ComponentFixture<DiffwiseText> {
  const fixture = TestBed.createComponent(DiffwiseText);
  const allOptions = { noChangesView: DiffwiseNoChangesView.Diff, ...options };

  fixture.componentRef.setInput(OLD_TEXT_INPUT, oldText);
  fixture.componentRef.setInput(NEW_TEXT_INPUT, newText);

  for (const [name, value] of Object.entries(allOptions)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function renderElement(oldText: string, newText: string, options?: DiffwiseConfigOptions) {
  return render(oldText, newText, options).nativeElement as HTMLElement;
}

/** Rows as `[kind, old number, new number]`; a gap opposite an added or removed line is `gap`. */
function rowsOf(element: HTMLElement) {
  return Array.from(element.querySelectorAll(ROW_SELECTOR), (row) => [
    rowKind(row),
    ...Array.from(row.querySelectorAll(ROW_PART_SELECTOR), partText),
  ]);
}

function rowKind(row: Element) {
  const kindClass = Array.from(row.classList).find((name) => name.startsWith(ROW_KIND_CLASS_START));
  return kindClass?.slice(ROW_KIND_CLASS_START.length);
}

function partText(part: Element) {
  return part.classList.contains(GAP_CLASS) ? GAP : Number(part.textContent);
}

/** Texts of the elements as they are, with their spaces and tabs. */
function textsOf(element: Element, selector: string) {
  return Array.from(element.querySelectorAll(selector), (found) => found.textContent);
}

function countOf(element: Element, selector: string): number {
  return element.querySelectorAll(selector).length;
}

/** HTML of the content of every line, in order. */
function contentHtmlOf(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll(CONTENT_SELECTOR), (content) => content.innerHTML);
}

/** The button of a value in the view settings, by its text. */
function choiceOf(element: HTMLElement, text: string): HTMLButtonElement {
  const choices = element.querySelectorAll<HTMLButtonElement>(CHOICE_SELECTOR);
  const choice = Array.from(choices).find((button) => button.textContent?.trim() === text);

  if (choice === undefined) {
    throw new Error(`No button "${text}" in the view settings.`);
  }

  return choice;
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiffwiseText', () => {
  it('has the class of the diff and a name for screen readers', () => {
    const element = renderElement('one', 'one');

    expect(element.classList).toContain(HOST_CLASS);
    expect(element.getAttribute(ROLE_ATTRIBUTE)).toBe(REGION_ROLE);
    expect(element.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Comparison of document versions');
  });

  it('shows each line of the text in a row with its number in the text, empty lines too', () => {
    const element = renderElement('first\n\nthird', 'first\n\nnew line\nthird');

    expect(rowsOf(element)).toEqual([
      ['unchanged', 1, 1],
      ['unchanged', 2, 2],
      ['added', GAP, 3],
      ['unchanged', 3, 4],
    ]);
  });

  it('keeps the spaces, tabs and indentation of each line as in the text', () => {
    const text = '  two spaces\n\ta tab\nspaces at the end  ';
    const element = renderElement(text, text);

    expect(textsOf(element, NEW_CONTENT_SELECTOR)).toEqual([
      '  two spaces',
      '\ta tab',
      'spaces at the end  ',
    ]);
  });

  it('marks changed words, and shows the spaces and tabs of changed text as signs', () => {
    const element = renderElement(
      'Sync every hour\n\tonly on Wi-Fi',
      'Sync every day\n    only on Wi-Fi',
    );
    const [firstOld, secondOld] = Array.from(element.querySelectorAll(OLD_CONTENT_SELECTOR));
    const [firstNew, secondNew] = Array.from(element.querySelectorAll(NEW_CONTENT_SELECTOR));

    expect(textsOf(element, REMOVED_SELECTOR)).toEqual(['hour', '\t']);
    expect(textsOf(element, ADDED_SELECTOR)).toEqual(['day', '    ']);
    expect(countOf(firstOld, SPACE_SIGN_SELECTOR) + countOf(firstNew, SPACE_SIGN_SELECTOR)).toBe(0);
    expect(countOf(secondOld, TAB_SIGN_SELECTOR)).toBe(1);
    expect(countOf(secondNew, SPACE_SIGN_SELECTOR)).toBe(4);
  });

  it('shows tags and character references in the text as plain characters', () => {
    const text = '<b>bold</b> <script>alert(1)</script> &lt;';
    const element = renderElement(text, text);
    const content = element.querySelector(NEW_CONTENT_SELECTOR);

    expect(content?.textContent).toBe(text);
    expect(countOf(content as Element, ANY_ELEMENT_SELECTOR)).toBe(0);
  });

  it('puts only the markers of changes into lines, whatever the text holds', () => {
    const element = renderElement('<img src=x onerror=alert(1)>', '<img src=y onerror=alert(2)>');
    const elements = Array.from(element.querySelectorAll(`${CONTENT_SELECTOR} *`));

    expect(elements.length).toBeGreaterThan(0);
    expect(elements.every((found) => MARKER_ELEMENTS.has(found.localName))).toBe(true);
  });

  it('shows a changed line as one merged line in the single column', () => {
    const element = renderElement('Sync every hour', 'Sync every day', {
      layout: DiffwiseLayout.Inline,
      inlineDiffStyle: DiffwiseInlineDiffStyle.Merged,
    });

    expect(textsOf(element, MERGED_CONTENT_SELECTOR)).toEqual(['Sync every hour day']);
    expect(textsOf(element, `${MERGED_CONTENT_SELECTOR} ${REMOVED_SELECTOR}`)).toEqual(['hour']);
    expect(textsOf(element, `${MERGED_CONTENT_SELECTOR} ${ADDED_SELECTOR}`)).toEqual(['day']);
  });

  it('hides the unchanged lines far from changes on request', () => {
    const element = renderElement(numberedLines(null), numberedLines(CHANGED_LINE), {
      hideUnchangedLines: true,
      contextLines: 1,
    });

    expect(countOf(element, COLLAPSED_LINES_SELECTOR)).toBe(2);
    expect(rowsOf(element)).toEqual([
      ['unchanged', 5, 5],
      ['changed', 6, 6],
      ['unchanged', 7, 7],
    ]);
  });

  it('emits the numbers of changed lines and steps to the changes', async () => {
    const fixture = TestBed.createComponent(DiffwiseText);
    const emitted: DiffwiseDiffStats[] = [];

    fixture.componentInstance.diffStatsComputed.subscribe((stats) => emitted.push(stats));
    fixture.componentRef.setInput(OLD_TEXT_INPUT, numberedLines(null));
    fixture.componentRef.setInput(NEW_TEXT_INPUT, `${numberedLines(CHANGED_LINE)}\nLast line.`);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.goToNextChange();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(emitted).toEqual([
      { addedLines: 1, removedLines: 0, changedLines: 1, hasChanges: true },
    ]);
    expect(rowsOf(element).filter((row) => row[0] === 'changed')).toEqual([['changed', 6, 6]]);
    expect(element.querySelector(ACTIVE_ROW_SELECTOR)?.textContent).toContain('changed');
  });

  it('compares again when a text changes', () => {
    const fixture = render('first', 'first');

    fixture.componentRef.setInput(NEW_TEXT_INPUT, 'first\nsecond');
    fixture.detectChanges();

    expect(rowsOf(fixture.nativeElement)).toEqual([
      ['unchanged', 1, 1],
      ['added', GAP, 2],
    ]);
  });

  it('shows the texts of the interface in the language of the options', () => {
    const element = renderElement('one', 'one', { language: DiffwiseLanguage.PL });

    expect(textsOf(element, VERSION_HEADER_SELECTOR).map((text) => text?.trim())).toEqual([
      'Poprzednia wersja',
      'Nowa wersja',
    ]);
  });

  it('describes each changed line for screen readers, with its number', () => {
    const element = renderElement('one\ntwo\nthree', 'one\n2\nthree\nfour', {
      layout: DiffwiseLayout.SideBySide,
    });

    expect(textsOf(element, DESCRIPTION_SELECTOR).map((text) => text?.trim())).toEqual([
      'Removed line 2',
      'Added line 2',
      'Added line 4',
    ]);
  });

  it('changes nothing in the lines with the options that only HTML documents have', () => {
    const oldText = 'Plans <b>and</b> prices\nhttps://example.com/plans';
    const newText = 'Plans <i>and</i> prices\nhttps://example.com/prices';
    const htmlOnlyOptions: DiffwiseConfigOptions = {
      changeDetails: DiffwiseChangeDetails.Icon,
      changeDetailsIconStyle: DiffwiseChangeDetailsIconStyle.Filled,
      tooltipColorMode: DiffwiseTooltipColorMode.Reversed,
      highlightTooltipChanges: false,
      tooltipTitleAlignment: DiffwiseAlignment.End,
      tooltipFontSize: 18,
      ignoreFormatting: true,
      ignoreLinkChanges: true,
    };

    expect(contentHtmlOf(renderElement(oldText, newText, htmlOnlyOptions))).toEqual(
      contentHtmlOf(renderElement(oldText, newText)),
    );
  });

  it('shows the view settings of the HTML diff and shares the choices with it', () => {
    const textFixture = render('one', 'two');
    const htmlFixture = TestBed.createComponent(DiffwiseHtml);
    const textElement = textFixture.nativeElement as HTMLElement;

    htmlFixture.componentRef.setInput(OLD_HTML_INPUT, '<p>one</p>');
    htmlFixture.componentRef.setInput(NEW_HTML_INPUT, '<p>two</p>');
    htmlFixture.detectChanges();

    expect(textsOf(textElement, GROUP_LABEL_SELECTOR)).toEqual(
      textsOf(htmlFixture.nativeElement, GROUP_LABEL_SELECTOR),
    );

    choiceOf(textElement, 'Dark').click();
    textFixture.detectChanges();
    htmlFixture.detectChanges();

    expect(textElement.classList).toContain(DARK_THEME_CLASS);
    expect((htmlFixture.nativeElement as HTMLElement).classList).toContain(DARK_THEME_CLASS);
  });
});
