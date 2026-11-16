import { Component, LOCALE_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { LineChangeKind } from '../engine';
import { ColorScheme } from './color-scheme';
import { DiffwiseConfig, type DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseAlignment,
  DiffwiseChangeDetails,
  DiffwiseChangeDetailsIconStyle,
  DiffwiseColorMode,
  DiffwiseGapStyle,
  DiffwiseLanguage,
  DiffwiseNoChangesView,
  DiffwisePalette,
  DiffwiseTooltipColorMode,
  DiffwiseVersionHeaders,
} from './config/option-values';
import { provideDiffwise } from './config/provide-diffwise';
import { Diffwise } from './diffwise';
import { DiffwiseHtml } from './diffwise-html';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const TOOLTIP_COLOR_MODE_INPUT = 'tooltipColorMode';
const IGNORE_LINK_CHANGES_INPUT = 'ignoreLinkChanges';
const WARN_METHOD = 'warn';
const VERSION_HEADERS_SELECTOR = '.diffwise-diff__version-headers';
const VERSION_HEADER_SELECTOR = '.diffwise-diff__version-header';
const VERSION_HEADER_ICON_SELECTOR = '.diffwise-diff__version-header-icon';
const LINE_NUMBER_SELECTOR = '.diffwise-diff__line-number';
const NO_LINE_NUMBERS_CLASS = 'diffwise-diff--no-line-numbers';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const ROW_SELECTOR = '.diffwise-diff__row';
const ROW_KIND_CLASS_START = 'diffwise-diff__row--';
const ROW_PART_SELECTOR = '.diffwise-diff__line-number, .diffwise-diff__gap';
const GAP_CLASS = 'diffwise-diff__gap';
const OLD_CONTENT_SELECTOR = '.diffwise-diff__content--old';
const NEW_CONTENT_SELECTOR = '.diffwise-diff__content--new';
const REMOVED_SELECTOR = 'del.diffwise-diff__highlight--removed';
const ADDED_SELECTOR = 'ins.diffwise-diff__highlight--added';
const ID_SELECTOR = '[id]';
const CONTENT_ID_SELECTOR = '.diffwise-diff__content [id]';
const FRAGMENT_LINK_SELECTOR = 'a[href^="#"]';
const CHECKBOX_SELECTOR = 'input[type="checkbox"]';
const HREF_ATTRIBUTE = 'href';
const FRAGMENT_START = '#';
const GAP = 'gap';
const CLICK_EVENT = 'click';
const FOOTNOTE_HTML = '<p>Zobacz przypis<a href="#note">1</a>.</p><p id="note">Treść przypisu.</p>';
const ONE_LINE_HTML = '<p>Zasady ogólne.</p>';
const DARK_THEME_CLASS = 'diffwise-diff--dark-theme';
const PAGE_DARK_CLASS = 'dark';
const PAGE_DARK_SELECTOR = '.dark';
const ROLE_ATTRIBUTE = 'role';
const REGION_ROLE = 'region';
const POLISH_LOCALE = 'pl-PL';
const POLISH_VERSION_LABELS = ['Poprzednia wersja', 'Nowa wersja'];
const HOST_CLASS = 'diffwise-diff';
const GRAY_GAP_CLASS = 'diffwise-diff--gap-style-gray';
const STRONGER_CONTRAST_CLASS = 'diffwise-diff--ui-contrast-4';
const STRONGEST_INTENSITY_CLASS = 'diffwise-diff--diff-intensity-5';
const COLORBLIND_PALETTE_CLASS = 'diffwise-diff--diff-palette-colorblind';
const LINE_NUMBER_DIGITS_VARIABLE = '--diffwise-line-number-digits';
const ADDED_ACCENT_VARIABLE = '--diffwise-added-accent';
const TOOLTIP_FONT_SIZE_VARIABLE = '--diffwise-tooltip-font-size';

/** Classes of the looks of the icons and the tooltips, other than the defaults. */
const ICON_AND_TOOLTIP_CLASSES = [
  'diffwise-diff--change-details-icon-style-filled',
  'diffwise-diff--tooltip-color-mode-reversed',
  'diffwise-diff--tooltip-title-alignment-end',
  'diffwise-diff--no-tooltip-change-highlight',
];
const CHANGE_DETAILS_ICON_SELECTOR = '.diffwise-diff__change-details-icon';
const CHANGE_DETAILS_COUNT_SELECTOR = '.diffwise-diff__change-details-count';
const ICON_KIND_CLASS_START = 'diffwise-diff__change-details-icon--';
const TOOLTIP_SELECTOR = '.diffwise-diff__tooltip';
const TOOLTIP_LINE_SELECTOR = [
  '.diffwise-diff__tooltip-title',
  '.diffwise-diff__tooltip-subtitle',
  '.diffwise-diff__tooltip-description',
  '.diffwise-diff__tooltip-row',
].join();
const REMOVED_TOOLTIP_HIGHLIGHT_SELECTOR = '.diffwise-diff__tooltip-highlight--removed';
const ADDED_TOOLTIP_HIGHLIGHT_SELECTOR = '.diffwise-diff__tooltip-highlight--added';
const DESCRIBED_MARKER_SELECTOR = '[data-diffwise-change-details]';
const ICON_ONLY_CLASS = 'diffwise-diff--change-details-icon';
const DESCRIBED_BY_ATTRIBUTE = 'aria-describedby';
const TABINDEX_ATTRIBUTE = 'tabindex';
const TITLE_ATTRIBUTE = 'title';
const IN_TAB_ORDER = '0';
const MOUSEOVER_EVENT = 'mouseover';
const MOUSEOUT_EVENT = 'mouseout';
const KEYDOWN_EVENT = 'keydown';
const SCROLL_EVENT = 'scroll';
const TABLE_ATTRIBUTE = 'data-diffwise-table';

/** Two tables: one with two rows, then one with one row. */
const TWO_TABLES_HTML =
  '<table><tr><td>Free</td></tr><tr><td>Personal</td></tr></table><table><tr><td>Search</td></tr></table>';
const ESCAPE_KEY = 'Escape';
const TAB_KEY = 'Tab';
const PART_SEPARATOR = ' ';
const ID_SELECTOR_START = '#';
const SVG_SELECTOR = 'svg';

/** Versions with one change of each kind besides text, and with two changes in one line. */
const ITALIC_HTML = '<p><i>Important:</i> back up your notes.</p>';
const BOLD_HTML = '<p><b>Important:</b> back up your notes.</p>';
const OLD_LINK_HTML = '<p>Read <a href="https://example.com/terms-2025">the terms</a> first.</p>';
const NEW_LINK_HTML = '<p>Read <a href="https://example.com/terms-2026">the terms</a> first.</p>';
const OLD_IMAGE_HTML = '<p><img src="img/logo-2025.svg" alt="Logo"> Notes</p>';
const NEW_IMAGE_HTML = '<p><img src="img/logo-2026.svg" alt="Logo"> Notes</p>';
const OLD_TWO_CHANGES_HTML =
  '<p><a href="https://example.com/a">Public links</a> let anyone view.</p>';
const NEW_TWO_CHANGES_HTML =
  '<p><a href="https://example.com/b">Public links</a> let <b>anyone</b> view.</p>';
const BULLETED_HTML = '<ul><li>Text notes</li><li>Checklists</li></ul>';
const NUMBERED_HTML = '<ol><li>Text notes</li><li>Checklists</li></ol>';
const LIST_FROM_FIVE_HTML = '<ol start="5"><li>Import notes</li></ol>';
const LIST_FROM_SIX_HTML = '<ol start="6"><li>Import notes</li></ol>';
const NEW_DRAWN_MARKER_SELECTOR = `${NEW_CONTENT_SELECTOR} .diffwise-diff__highlight--list-marker`;
const UNCHECKED_HTML =
  '<ul><li><label><input type="checkbox"> Invite your family</label></li></ul>';
const CHECKED_HTML =
  '<ul><li><label><input type="checkbox" checked> Invite your family</label></li></ul>';

/** Inputs of the component besides the two versions. */
type OptionInputs = DiffwiseConfigOptions & {
  readonly config?: DiffwiseConfig | DiffwiseConfigOptions;
};

/** Elements scrolled to; jsdom does not scroll, so tests record the calls instead. */
const scrolledTo: Element[] = [];

Element.prototype.scrollIntoView = function (this: Element) {
  scrolledTo.push(this);
};

/** Open popovers; jsdom has no Popover API, so tests define it and record the calls instead. */
const openPopovers = new Set<Element>();

HTMLElement.prototype.showPopover = function (this: HTMLElement) {
  openPopovers.add(this);
};

HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
  openPopovers.delete(this);
};

/** Clicks the footnote link of the new version and returns the click event. */
function clickNewFootnoteLink(element: HTMLElement, options: MouseEventInit = {}): MouseEvent {
  const link = element.querySelector(`${NEW_CONTENT_SELECTOR} ${FRAGMENT_LINK_SELECTOR}`);
  const click = new MouseEvent(CLICK_EVENT, { ...options, bubbles: true, cancelable: true });

  link?.dispatchEvent(click);

  return click;
}

/**
 * Renders the component with two versions of a document and, if given, its options. Many tests
 * compare a document with itself to see how the diff shows it, so the same versions show both
 * versions here, unless the options say otherwise.
 */
function render(oldHtml: string, newHtml: string, inputs: OptionInputs = {}) {
  const fixture = TestBed.createComponent(DiffwiseHtml);
  const allInputs = { noChangesView: DiffwiseNoChangesView.Diff, ...inputs };

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(allInputs)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

/** Renders the component with options and returns its element. */
function renderElement(oldHtml: string, newHtml: string, inputs: OptionInputs = {}) {
  return render(oldHtml, newHtml, inputs).nativeElement as HTMLElement;
}

/** Waits until the diff shows a change of the page, which an observer reports in a microtask. */
async function whenPageChangeShown(fixture: ComponentFixture<unknown>): Promise<void> {
  await Promise.resolve();
  await fixture.whenStable();
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

function textsOf(element: HTMLElement, selector: string) {
  return Array.from(element.querySelectorAll(selector), (found) => found.textContent?.trim());
}

/** Positions of the tables of the lines of one version; `null` for a line outside tables. */
function tablePositionsOf(element: HTMLElement, contentSelector: string) {
  return Array.from(element.querySelectorAll(contentSelector), (content) =>
    content.getAttribute(TABLE_ATTRIBUTE),
  );
}

/** How far the lines of one version are scrolled to the side. */
function scrollPositionsOf(element: HTMLElement, contentSelector: string) {
  return Array.from(element.querySelectorAll(contentSelector), (content) => content.scrollLeft);
}

/** Digits of the highest line number, which the diff sets as a CSS variable. */
function lineNumberDigitsOf(element: HTMLElement) {
  return element.style.getPropertyValue(LINE_NUMBER_DIGITS_VARIABLE);
}

/** Names of the header icons, which screen readers read. */
function iconNamesOf(element: HTMLElement) {
  return Array.from(element.querySelectorAll(VERSION_HEADER_ICON_SELECTOR), (icon) =>
    icon.getAttribute(ARIA_LABEL_ATTRIBUTE),
  );
}

/** Moves the pointer onto the element, from the element it was on. */
function pointTo(element: Element, from: Element | null = null): void {
  element.dispatchEvent(new MouseEvent(MOUSEOVER_EVENT, { bubbles: true, relatedTarget: from }));
}

/** Moves the pointer from the element onto another one, or out of the page. */
function pointAwayFrom(element: Element, to: Element | null = null): void {
  element.dispatchEvent(new MouseEvent(MOUSEOUT_EVENT, { bubbles: true, relatedTarget: to }));
}

function pressEscape(): void {
  document.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT, { key: ESCAPE_KEY }));
}

/** Focuses the element as the Tab key does; jsdom counts a focus after a mouse event as a click. */
function focusFromKeyboard(element: HTMLElement): void {
  document.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT, { key: TAB_KEY }));
  element.focus();
}

/** The first icon of changes between the versions. */
function iconOf(element: HTMLElement): HTMLElement {
  return element.querySelector(CHANGE_DETAILS_ICON_SELECTOR) as HTMLElement;
}

function tooltipOf(element: HTMLElement): HTMLElement {
  return element.querySelector(TOOLTIP_SELECTOR) as HTMLElement;
}

function isTooltipShown(element: HTMLElement): boolean {
  return openPopovers.has(tooltipOf(element));
}

/** Lines of the tooltip, from the title on; a row is its label and its value. */
function tooltipLinesOf(element: HTMLElement) {
  return Array.from(tooltipOf(element).querySelectorAll(TOOLTIP_LINE_SELECTOR), tooltipLineText);
}

function tooltipLineText(line: Element) {
  const parts = line.children.length > 0 ? Array.from(line.children) : [line];
  return parts.map((part) => part.textContent).join(PART_SEPARATOR);
}

/** Marked changes with details in the new version. */
function newMarkersOf(element: HTMLElement) {
  const selector = `${NEW_CONTENT_SELECTOR} ${DESCRIBED_MARKER_SELECTOR}`;
  return Array.from(element.querySelectorAll<HTMLElement>(selector));
}

/** Two diffs of the same document on one page. */
@Component({
  imports: [DiffwiseHtml],
  template: `
    <diffwise-html [oldHtml]="html" [newHtml]="html" noChangesView="diff" />
    <diffwise-html [oldHtml]="html" [newHtml]="html" noChangesView="diff" />
  `,
})
class TwoDiffs {
  protected readonly html = '<h2 id="plans">Plany</h2><p><a href="#plans">Zobacz plany</a></p>';
}

describe('DiffwiseHtml', () => {
  it('shows the headers of both versions', () => {
    const element = render('', '').nativeElement as HTMLElement;

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(['Previous version', 'New version']);
  });

  it('shows each line in a row with its numbers, and a gap opposite added and removed lines', () => {
    const oldHtml = '<p>Zasady ogólne.</p><p>Okres próbny.</p><p>Kontakt.</p>';
    const newHtml = '<p>Zasady ogólne.</p><p>Kontakt.</p><p>Płatności.</p>';

    expect(rowsOf(render(oldHtml, newHtml).nativeElement)).toEqual([
      [LineChangeKind.Unchanged, 1, 1],
      [LineChangeKind.Removed, 2, GAP],
      [LineChangeKind.Unchanged, 3, 2],
      [LineChangeKind.Added, GAP, 3],
    ]);
  });

  it('marks changed words inside the formatting of a changed line', () => {
    const element = render(
      '<p>Konto można <b>usunąć</b> w ustawieniach.</p>',
      '<p>Konto można <b>zamknąć</b> w ustawieniach.</p>',
    ).nativeElement as HTMLElement;

    expect(textsOf(element, `${OLD_CONTENT_SELECTOR} b ${REMOVED_SELECTOR}`)).toEqual(['usunąć']);
    expect(textsOf(element, `${NEW_CONTENT_SELECTOR} b ${ADDED_SELECTOR}`)).toEqual(['zamknąć']);
  });

  it('keeps inline styles and read-only checkboxes of the content', () => {
    const html = '<p style="color: rgb(200, 0, 0)"><input type="checkbox" checked> Gotowe</p>';
    const element = render(html, html).nativeElement as HTMLElement;
    const paragraph = element.querySelector<HTMLElement>(`${OLD_CONTENT_SELECTOR} p`);
    const checkbox = element.querySelector<HTMLInputElement>(CHECKBOX_SELECTOR);

    expect(paragraph?.style.color).toBe('rgb(200, 0, 0)');
    expect(checkbox?.checked).toBe(true);
    expect(checkbox?.disabled).toBe(true);
  });

  it('marks the content of each table line with the position of its table', () => {
    const html = `<p>Plans</p>${TWO_TABLES_HTML}`;
    const element = renderElement(html, html);

    expect(tablePositionsOf(element, OLD_CONTENT_SELECTOR)).toEqual([null, '0', '0', '1']);
    expect(tablePositionsOf(element, NEW_CONTENT_SELECTOR)).toEqual([null, '0', '0', '1']);
  });

  it('scrolls the lines of a table together, in each version on its own', () => {
    const element = renderElement(TWO_TABLES_HTML, TWO_TABLES_HTML);
    const [firstRow] = element.querySelectorAll<HTMLElement>(OLD_CONTENT_SELECTOR);

    firstRow.scrollLeft = 120;
    firstRow.dispatchEvent(new Event(SCROLL_EVENT));

    expect(scrollPositionsOf(element, OLD_CONTENT_SELECTOR)).toEqual([120, 120, 0]);
    expect(scrollPositionsOf(element, NEW_CONTENT_SELECTOR)).toEqual([0, 0, 0]);
  });

  it('compares again when a version changes', () => {
    const fixture = render('<p>Pierwsza wersja.</p>', '<p>Pierwsza wersja.</p>');

    fixture.componentRef.setInput(NEW_HTML_INPUT, '<p>Druga wersja.</p>');
    fixture.detectChanges();

    expect(rowsOf(fixture.nativeElement)).toEqual([[LineChangeKind.Changed, 1, 1]]);
  });

  it('gives every diff on the page its own ids, so links stay within their version', () => {
    const fixture = TestBed.createComponent(TwoDiffs);

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const ids = Array.from(element.querySelectorAll(CONTENT_ID_SELECTOR), (found) => found.id);
    const links = Array.from(element.querySelectorAll(FRAGMENT_LINK_SELECTOR), (link) =>
      link.getAttribute(HREF_ATTRIBUTE),
    );

    expect(new Set(ids).size).toBe(4);
    expect(links).toEqual(ids.map((id) => FRAGMENT_START + id));
  });

  it('follows a footnote link within its version and stays on the page', () => {
    const element = render(FOOTNOTE_HTML, FOOTNOTE_HTML).nativeElement as HTMLElement;
    const footnote = element.querySelector(`${NEW_CONTENT_SELECTOR} ${ID_SELECTOR}`);

    scrolledTo.length = 0;

    const click = clickNewFootnoteLink(element);

    expect(click.defaultPrevented).toBe(true);
    expect(scrolledTo).toEqual([footnote]);
    expect(document.activeElement).toBe(footnote);
  });

  it('leaves a link clicked with a modifier key to the browser', () => {
    const element = render(FOOTNOTE_HTML, FOOTNOTE_HTML).nativeElement as HTMLElement;

    scrolledTo.length = 0;

    const click = clickNewFootnoteLink(element, { ctrlKey: true });

    expect(click.defaultPrevented).toBe(false);
    expect(scrolledTo).toEqual([]);
  });

  it('hides the line numbers on request', () => {
    const element = renderElement(ONE_LINE_HTML, ONE_LINE_HTML, { showLineNumbers: false });

    expect(element.querySelectorAll(LINE_NUMBER_SELECTOR)).toHaveLength(0);
    expect(element.classList).toContain(NO_LINE_NUMBERS_CLASS);
  });

  it('shows icons named by the default header texts', () => {
    const element = renderElement('', '', { versionHeaders: DiffwiseVersionHeaders.Icons });

    expect(iconNamesOf(element)).toEqual(['Previous version', 'New version']);
    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(['', '']);
  });

  it('shows the header texts of the app, or no headers', () => {
    const versionHeaders = { old: 'Wersja 3 · 12.10.2026', new: 'Wersja 4 · 05.11.2026' };
    const withTexts = renderElement('', '', { versionHeaders });
    const withoutHeaders = renderElement('', '', { versionHeaders: DiffwiseVersionHeaders.None });

    expect(textsOf(withTexts, VERSION_HEADER_SELECTOR)).toEqual([
      versionHeaders.old,
      versionHeaders.new,
    ]);
    expect(withoutHeaders.querySelector(VERSION_HEADERS_SELECTOR)).toBeNull();
  });

  it('ignores differences in letter case and whitespace on request', () => {
    const oldHtml = '<p>Termin: 23:00, sala A.</p>';
    const newHtml = '<p>Termin:23:00, Sala A.</p>';
    const ignoring = { ignoreCase: true, ignoreWhitespace: true };

    expect(rowsOf(renderElement(oldHtml, newHtml))).toEqual([[LineChangeKind.Changed, 1, 1]]);
    expect(rowsOf(renderElement(oldHtml, newHtml, ignoring))).toEqual([
      [LineChangeKind.Unchanged, 1, 1],
    ]);
  });

  it('ignores changes of formatting alone on request', () => {
    const element = renderElement(ITALIC_HTML, BOLD_HTML, { ignoreFormatting: true });

    expect(rowsOf(element)).toEqual([[LineChangeKind.Unchanged, 1, 1]]);
    expect(element.querySelector(DESCRIBED_MARKER_SELECTOR)).toBeNull();
    expect(element.querySelector(CHANGE_DETAILS_ICON_SELECTOR)).toBeNull();
  });

  it('ignores link changes on request, and keeps other changes of the line', () => {
    const linkOnly = renderElement(OLD_LINK_HTML, NEW_LINK_HTML, { ignoreLinkChanges: true });
    const withFormatting = renderElement(OLD_TWO_CHANGES_HTML, NEW_TWO_CHANGES_HTML, {
      ignoreLinkChanges: true,
    });

    expect(rowsOf(linkOnly)).toEqual([[LineChangeKind.Unchanged, 1, 1]]);
    expect(iconOf(withFormatting).classList).toContain(ICON_KIND_CLASS_START + 'formatting');
    expect(withFormatting.querySelector(CHANGE_DETAILS_COUNT_SELECTOR)).toBeNull();
  });

  it('compares the versions again only when an option of the comparison changes', () => {
    const fixture = render(ITALIC_HTML, BOLD_HTML);
    const element = fixture.nativeElement as HTMLElement;
    const [marker] = newMarkersOf(element);

    fixture.componentRef.setInput(TOOLTIP_COLOR_MODE_INPUT, DiffwiseTooltipColorMode.Reversed);
    fixture.detectChanges();

    expect(element.contains(marker)).toBe(true);

    fixture.componentRef.setInput(IGNORE_LINK_CHANGES_INPUT, true);
    fixture.detectChanges();

    expect(element.contains(marker)).toBe(false);
    expect(newMarkersOf(element)).toHaveLength(1);
  });

  it('takes an option from the level below when its value is invalid, with a warning', () => {
    const warn = vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
    const invalidValue = 'yes' as unknown as boolean;

    TestBed.configureTestingModule({ providers: [provideDiffwise({ ignoreFormatting: true })] });

    const element = renderElement(ITALIC_HTML, BOLD_HTML, { ignoreFormatting: invalidValue });

    expect(rowsOf(element)).toEqual([[LineChangeKind.Unchanged, 1, 1]]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses the global configuration, and its own options win over it', () => {
    const globalOptions = { showLineNumbers: false, versionHeaders: DiffwiseVersionHeaders.None };

    TestBed.configureTestingModule({ providers: [provideDiffwise(globalOptions)] });

    const element = renderElement(ONE_LINE_HTML, ONE_LINE_HTML, { showLineNumbers: true });

    expect(element.querySelectorAll(LINE_NUMBER_SELECTOR)).toHaveLength(2);
    expect(element.querySelector(VERSION_HEADERS_SELECTOR)).toBeNull();
  });

  it('takes from config only the options it sets, and single inputs win over it', () => {
    const config = new DiffwiseConfig({
      versionHeaders: DiffwiseVersionHeaders.None,
      ignoreCase: true,
    });

    TestBed.configureTestingModule({ providers: [provideDiffwise({ showLineNumbers: false })] });

    const element = renderElement('<p>Konto firmowe.</p>', '<p>Konto Firmowe.</p>', {
      config,
      ignoreCase: false,
    });

    expect(element.querySelectorAll(LINE_NUMBER_SELECTOR)).toHaveLength(0);
    expect(element.querySelector(VERSION_HEADERS_SELECTOR)).toBeNull();
    expect(rowsOf(element)).toEqual([[LineChangeKind.Changed]]);
  });

  it('follows changes of the global configuration while the app runs', () => {
    const fixture = render(ONE_LINE_HTML, ONE_LINE_HTML);
    const element = fixture.nativeElement as HTMLElement;

    TestBed.inject(Diffwise).updateConfig({ versionHeaders: DiffwiseVersionHeaders.None });
    fixture.detectChanges();

    expect(element.querySelector(VERSION_HEADERS_SELECTOR)).toBeNull();
  });

  it('shows the dark theme on request, and the light one by default', () => {
    const light = renderElement('', '');
    const dark = renderElement('', '', { colorMode: DiffwiseColorMode.Dark });

    expect(light.classList).not.toContain(DARK_THEME_CLASS);
    expect(dark.classList).toContain(DARK_THEME_CLASS);
  });

  it('follows the color scheme of the system in automatic mode', () => {
    const systemPrefersDark = signal(true);

    TestBed.configureTestingModule({
      providers: [{ provide: ColorScheme, useValue: { systemPrefersDark } }],
    });

    const fixture = render('', '');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.classList).toContain(DARK_THEME_CLASS);

    systemPrefersDark.set(false);
    fixture.detectChanges();

    expect(element.classList).not.toContain(DARK_THEME_CLASS);
  });

  it('follows the dark mode marker of the app around it in automatic mode', async () => {
    const fixture = render('', '', { darkModeSelector: PAGE_DARK_SELECTOR });
    const element = fixture.nativeElement as HTMLElement;

    await fixture.whenStable();

    expect(element.classList).not.toContain(DARK_THEME_CLASS);

    document.documentElement.classList.add(PAGE_DARK_CLASS);
    await whenPageChangeShown(fixture);
    document.documentElement.classList.remove(PAGE_DARK_CLASS);

    expect(element.classList).toContain(DARK_THEME_CLASS);
  });

  it('names the diff for screen readers', () => {
    const element = renderElement('', '');

    expect(element.getAttribute(ROLE_ATTRIBUTE)).toBe(REGION_ROLE);
    expect(element.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Comparison of document versions');
  });

  it('shows the texts of the interface in Polish on request', () => {
    const element = renderElement('', '', { language: DiffwiseLanguage.PL });

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(POLISH_VERSION_LABELS);
    expect(element.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Porównanie wersji dokumentu');
  });

  it('takes the language of the app in automatic mode', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: POLISH_LOCALE }],
    });

    expect(textsOf(renderElement('', ''), VERSION_HEADER_SELECTOR)).toEqual(POLISH_VERSION_LABELS);
  });

  it('shows custom texts instead of single texts of the interface, also as names of icons', () => {
    const element = renderElement('', '', {
      language: DiffwiseLanguage.PL,
      versionHeaders: DiffwiseVersionHeaders.Icons,
      customTexts: { oldVersionLabel: 'Przed zmianami' },
    });

    expect(iconNamesOf(element)).toEqual(['Przed zmianami', 'Nowa wersja']);
  });

  it('takes custom texts from every level of the configuration, text by text', () => {
    const globalTexts = { oldVersionLabel: 'Vorherige Version', newVersionLabel: 'Neue Version' };

    TestBed.configureTestingModule({ providers: [provideDiffwise({ customTexts: globalTexts })] });

    const element = renderElement('', '', { customTexts: { newVersionLabel: 'Entwurf' } });

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(['Vorherige Version', 'Entwurf']);
  });

  it('shows the texts of the interface when an input takes away the custom texts with null', () => {
    const globalTexts = { oldVersionLabel: 'Vorherige Version', newVersionLabel: 'Neue Version' };

    TestBed.configureTestingModule({ providers: [provideDiffwise({ customTexts: globalTexts })] });

    const element = renderElement('', '', { customTexts: null });

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(['Previous version', 'New version']);
  });

  it('shows options of the appearance as modifier classes, next to its own class', () => {
    const element = renderElement(ONE_LINE_HTML, ONE_LINE_HTML, {
      gapStyle: DiffwiseGapStyle.Gray,
      uiContrast: 4,
    });

    expect(element.classList).toContain(HOST_CLASS);
    expect(element.classList).toContain(GRAY_GAP_CLASS);
    expect(element.classList).toContain(STRONGER_CONTRAST_CLASS);
  });

  it('sizes the column of line numbers by the digits of the highest number', () => {
    const twelveLines = ONE_LINE_HTML.repeat(12);

    expect(lineNumberDigitsOf(renderElement(ONE_LINE_HTML, ONE_LINE_HTML))).toBe('1');
    expect(lineNumberDigitsOf(renderElement(ONE_LINE_HTML, twelveLines))).toBe('2');
  });

  it('shows colors of the app in their theme, where they replace the intensity', () => {
    const options: DiffwiseConfigOptions = {
      diffColors: { dark: { addedAccent: '#5eead4' } },
      diffIntensity: 5,
    };
    const light = renderElement('', '', { ...options, colorMode: DiffwiseColorMode.Light });
    const dark = renderElement('', '', { ...options, colorMode: DiffwiseColorMode.Dark });

    expect(light.style.getPropertyValue(ADDED_ACCENT_VARIABLE)).toBe('');
    expect(light.classList).toContain(STRONGEST_INTENSITY_CLASS);
    expect(dark.style.getPropertyValue(ADDED_ACCENT_VARIABLE)).toBe('#5eead4');
    expect(dark.classList).not.toContain(STRONGEST_INTENSITY_CLASS);
  });

  it('shows the colorblind palette of the global configuration, and its own palette wins over it', () => {
    TestBed.configureTestingModule({
      providers: [provideDiffwise({ diffPalette: DiffwisePalette.Colorblind })],
    });

    const globalPalette = renderElement(ONE_LINE_HTML, ONE_LINE_HTML);
    const ownPalette = renderElement(ONE_LINE_HTML, ONE_LINE_HTML, {
      diffPalette: DiffwisePalette.Default,
    });

    expect(globalPalette.classList).toContain(COLORBLIND_PALETTE_CLASS);
    expect(ownPalette.classList).not.toContain(COLORBLIND_PALETTE_CLASS);
  });

  it('sets the font of the app on its element', () => {
    const element = renderElement('', '', { fontFamily: 'Georgia' });

    expect(element.style.fontFamily).toContain('"Georgia"');
  });

  it('shows the looks of the icons and the tooltips as modifier classes, and their font size', () => {
    const element = renderElement(ONE_LINE_HTML, ONE_LINE_HTML, {
      changeDetailsIconStyle: DiffwiseChangeDetailsIconStyle.Filled,
      tooltipColorMode: DiffwiseTooltipColorMode.Reversed,
      tooltipTitleAlignment: DiffwiseAlignment.End,
      highlightTooltipChanges: false,
      tooltipFontSize: 1,
    });

    expect(Array.from(element.classList)).toEqual(expect.arrayContaining(ICON_AND_TOOLTIP_CLASSES));
    expect(element.style.getPropertyValue(TOOLTIP_FONT_SIZE_VARIABLE)).toBe('1rem');
  });
});

describe('DiffwiseHtml change details', () => {
  it('shows an icon between the versions for a change besides text, named by its kind', () => {
    const versions = [
      [ITALIC_HTML, BOLD_HTML, 'formatting', 'Formatting change'],
      [OLD_LINK_HTML, NEW_LINK_HTML, 'link', 'Link address changed'],
      [OLD_IMAGE_HTML, NEW_IMAGE_HTML, 'image', 'Image changed'],
    ];

    for (const [oldHtml, newHtml, iconKind, name] of versions) {
      const icon = iconOf(renderElement(oldHtml, newHtml));

      expect(icon.classList).toContain(ICON_KIND_CLASS_START + iconKind);
      expect(icon.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(name);
    }
  });

  it('shows one icon with the number of changes for several changes in a line', () => {
    const element = renderElement(OLD_TWO_CHANGES_HTML, NEW_TWO_CHANGES_HTML);
    const icons = element.querySelectorAll(CHANGE_DETAILS_ICON_SELECTOR);

    expect(icons.length).toBe(1);
    expect(icons[0].classList).toContain(ICON_KIND_CLASS_START + 'multiple');
    expect(icons[0].getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Formatting changes: 2');
    expect(textsOf(element, CHANGE_DETAILS_COUNT_SELECTOR)).toEqual(['2']);
  });

  it('shows no icon for changed text', () => {
    const element = renderElement('<p>Zasady ogólne.</p>', '<p>Zasady szczegółowe.</p>');

    expect(element.querySelector(CHANGE_DETAILS_ICON_SELECTOR)).toBeNull();
  });

  it('marks another item number as changed text, with no icon and no tooltip', () => {
    const element = renderElement(LIST_FROM_FIVE_HTML, LIST_FROM_SIX_HTML);
    const drawnMarker = element.querySelector(NEW_DRAWN_MARKER_SELECTOR);

    expect(drawnMarker?.matches(ADDED_SELECTOR)).toBe(true);
    expect(element.querySelector(CHANGE_DETAILS_ICON_SELECTOR)).toBeNull();
    expect(newMarkersOf(element)).toEqual([]);
  });

  it('shows the tooltip of an icon on hover, with the changed part of a value highlighted', () => {
    const element = renderElement(OLD_LINK_HTML, NEW_LINK_HTML);

    pointTo(iconOf(element).querySelector(SVG_SELECTOR) as Element);

    expect(isTooltipShown(element)).toBe(true);
    expect(tooltipLinesOf(element)).toEqual([
      'Link address changed',
      'Before https://example.com/terms-2025',
      'After https://example.com/terms-2026',
    ]);
    expect(textsOf(element, REMOVED_TOOLTIP_HIGHLIGHT_SELECTOR)).toEqual(['2025']);
    expect(textsOf(element, ADDED_TOOLTIP_HIGHLIGHT_SELECTOR)).toEqual(['2026']);
  });

  it('shows whole values in the tooltip when highlights of changed parts are off', () => {
    const element = renderElement(OLD_LINK_HTML, NEW_LINK_HTML, { highlightTooltipChanges: false });

    pointTo(iconOf(element));

    expect(tooltipLinesOf(element)).toEqual([
      'Link address changed',
      'Before https://example.com/terms-2025',
      'After https://example.com/terms-2026',
    ]);
    expect(element.querySelector(REMOVED_TOOLTIP_HIGHLIGHT_SELECTOR)).toBeNull();
    expect(element.querySelector(ADDED_TOOLTIP_HIGHLIGHT_SELECTOR)).toBeNull();
  });

  it('lists every change of a line in the tooltip of its icon', () => {
    const element = renderElement(OLD_TWO_CHANGES_HTML, NEW_TWO_CHANGES_HTML);

    pointTo(iconOf(element));

    expect(tooltipLinesOf(element)).toEqual([
      'Formatting changes: 2',
      'Link address changed',
      'Before https://example.com/a',
      'After https://example.com/b',
      'Formatting change',
      'bold added',
    ]);
  });

  it('describes an icon for screen readers with the lines under the title of its tooltip', () => {
    const element = renderElement(OLD_LINK_HTML, NEW_LINK_HTML);
    const icon = iconOf(element);

    pointTo(icon);

    const descriptionId = icon.getAttribute(DESCRIBED_BY_ATTRIBUTE);
    const description = element.querySelector(ID_SELECTOR_START + descriptionId);

    expect(description?.textContent).toContain('https://example.com/terms-2025');
    expect(description?.textContent).not.toContain('Link address changed');
  });

  it('marks a changed list marker and a checked checkbox with no icon and no tooltip', () => {
    const changedItems = [
      [BULLETED_HTML, NUMBERED_HTML],
      [UNCHECKED_HTML, CHECKED_HTML],
    ];

    for (const [oldHtml, newHtml] of changedItems) {
      const element = renderElement(oldHtml, newHtml);

      expect(element.querySelector(ADDED_SELECTOR)).not.toBeNull();
      expect(element.querySelector(CHANGE_DETAILS_ICON_SELECTOR)).toBeNull();
      expect(newMarkersOf(element)).toEqual([]);
    }
  });

  it('keeps the tooltip while the pointer moves onto it, and hides it after both (WCAG 1.4.13)', () => {
    const element = renderElement(OLD_LINK_HTML, NEW_LINK_HTML);
    const icon = iconOf(element);
    const tooltip = tooltipOf(element);

    pointTo(icon);
    pointAwayFrom(icon, tooltip);

    expect(isTooltipShown(element)).toBe(true);

    pointAwayFrom(tooltip, element);

    expect(isTooltipShown(element)).toBe(false);
    expect(icon.hasAttribute(DESCRIBED_BY_ATTRIBUTE)).toBe(false);
  });

  it('shows the tooltip of an icon focused from the keyboard until the focus leaves', () => {
    const element = renderElement(OLD_LINK_HTML, NEW_LINK_HTML);
    const icon = iconOf(element);

    focusFromKeyboard(icon);
    pointAwayFrom(icon, element);

    expect(isTooltipShown(element)).toBe(true);

    icon.blur();

    expect(isTooltipShown(element)).toBe(false);
  });

  it('hides the tooltip on Escape', () => {
    const element = renderElement(OLD_LINK_HTML, NEW_LINK_HTML);

    pointTo(iconOf(element));
    pressEscape();

    expect(isTooltipShown(element)).toBe(false);
  });

  it('hides the tooltip when the page scrolls, which would move its trigger away', () => {
    const element = renderElement(OLD_LINK_HTML, NEW_LINK_HTML);

    pointTo(iconOf(element));
    document.dispatchEvent(new Event(SCROLL_EVENT));

    expect(isTooltipShown(element)).toBe(false);
  });

  it('shows the details a marked change points to on hover, by default', () => {
    const element = renderElement(OLD_TWO_CHANGES_HTML, NEW_TWO_CHANGES_HTML);
    const [, boldMarker] = newMarkersOf(element);

    pointTo(boldMarker);

    expect(tooltipLinesOf(element)).toEqual(['Formatting change', 'bold added']);
    expect(boldMarker.getAttribute(DESCRIBED_BY_ATTRIBUTE)).toBe(tooltipOf(element).id);
    expect(boldMarker.hasAttribute(TABINDEX_ATTRIBUTE)).toBe(false);
  });

  it('shows details only from the icons in icon mode', () => {
    const element = renderElement(OLD_TWO_CHANGES_HTML, NEW_TWO_CHANGES_HTML, {
      changeDetails: DiffwiseChangeDetails.Icon,
    });

    pointTo(newMarkersOf(element)[0]);

    expect(isTooltipShown(element)).toBe(false);
    expect(element.classList).toContain(ICON_ONLY_CLASS);
    expect(element.querySelector(CHANGE_DETAILS_ICON_SELECTOR)).not.toBeNull();
  });

  it('shows details only on marked changes in hover mode; the new version takes the focus', async () => {
    const fixture = render(OLD_LINK_HTML, NEW_LINK_HTML, {
      changeDetails: DiffwiseChangeDetails.Hover,
    });

    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const markers = element.querySelectorAll<HTMLElement>(DESCRIBED_MARKER_SELECTOR);
    const tabIndexes = Array.from(markers, (marker) => marker.getAttribute(TABINDEX_ATTRIBUTE));

    expect(element.querySelector(CHANGE_DETAILS_ICON_SELECTOR)).toBeNull();
    expect(tabIndexes).toEqual([null, IN_TAB_ORDER]);

    focusFromKeyboard(markers[1]);

    expect(isTooltipShown(element)).toBe(true);
    expect(tooltipLinesOf(element)[0]).toBe('Link address changed');
  });

  it('shows the texts of the tooltips in the language of the interface, and custom texts', () => {
    const polish = renderElement(OLD_LINK_HTML, NEW_LINK_HTML, { language: DiffwiseLanguage.PL });
    const custom = renderElement(OLD_LINK_HTML, NEW_LINK_HTML, {
      customTexts: { linkChangeLabel: 'Other address' },
    });

    pointTo(iconOf(polish));

    expect(tooltipLinesOf(polish)).toEqual([
      'Zmieniony adres linku',
      'Było https://example.com/terms-2025',
      'Jest https://example.com/terms-2026',
    ]);
    expect(iconOf(custom).getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Other address');
  });

  it('shows the names of the version icons in the tooltip, also on focus from the keyboard', () => {
    const element = renderElement('', '', { versionHeaders: DiffwiseVersionHeaders.Icons });
    const [oldIcon, newIcon] = element.querySelectorAll<HTMLElement>(VERSION_HEADER_ICON_SELECTOR);

    pointTo(oldIcon);

    expect(tooltipLinesOf(element)).toEqual(['Previous version']);
    expect(oldIcon.hasAttribute(DESCRIBED_BY_ATTRIBUTE)).toBe(false);

    focusFromKeyboard(newIcon);

    expect(tooltipLinesOf(element)).toEqual(['New version']);
    expect(newIcon.getAttribute(TABINDEX_ATTRIBUTE)).toBe(IN_TAB_ORDER);
    expect(newIcon.hasAttribute(TITLE_ATTRIBUTE)).toBe(false);
  });

  it('hides the tooltip when the rows change, since its trigger may be gone', async () => {
    const fixture = render(OLD_LINK_HTML, NEW_LINK_HTML);
    const element = fixture.nativeElement as HTMLElement;

    await fixture.whenStable();
    pointTo(iconOf(element));
    fixture.componentRef.setInput(NEW_HTML_INPUT, OLD_LINK_HTML);
    await fixture.whenStable();

    expect(isTooltipShown(element)).toBe(false);
  });
});
