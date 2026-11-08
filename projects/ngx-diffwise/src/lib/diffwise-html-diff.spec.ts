import { Component, LOCALE_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { LineChangeKind } from '../engine';
import { ColorScheme } from './color-scheme';
import { DiffwiseConfig, type DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseColorMode,
  DiffwiseLanguage,
  DiffwiseVersionHeaders,
} from './config/option-values';
import { provideDiffwise } from './config/provide-diffwise';
import { Diffwise } from './diffwise';
import { DiffwiseHtmlDiff } from './diffwise-html-diff';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const VERSION_HEADERS_SELECTOR = '.diffwise-html-diff__version-headers';
const VERSION_HEADER_SELECTOR = '.diffwise-html-diff__version-header';
const VERSION_HEADER_ICON_SELECTOR = '.diffwise-html-diff__version-header-icon';
const LINE_NUMBER_SELECTOR = '.diffwise-html-diff__line-number';
const NO_LINE_NUMBERS_CLASS = 'diffwise-html-diff--no-line-numbers';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const ROW_SELECTOR = '.diffwise-html-diff__row';
const ROW_KIND_CLASS_START = 'diffwise-html-diff__row--';
const ROW_PART_SELECTOR = '.diffwise-html-diff__line-number, .diffwise-html-diff__gap';
const GAP_CLASS = 'diffwise-html-diff__gap';
const OLD_CONTENT_SELECTOR = '.diffwise-html-diff__content--old';
const NEW_CONTENT_SELECTOR = '.diffwise-html-diff__content--new';
const REMOVED_SELECTOR = 'del.diffwise-html-diff__highlight--removed';
const ADDED_SELECTOR = 'ins.diffwise-html-diff__highlight--added';
const ID_SELECTOR = '[id]';
const FRAGMENT_LINK_SELECTOR = 'a[href^="#"]';
const CHECKBOX_SELECTOR = 'input[type="checkbox"]';
const HREF_ATTRIBUTE = 'href';
const FRAGMENT_START = '#';
const GAP = 'gap';
const CLICK_EVENT = 'click';
const FOOTNOTE_HTML = '<p>Zobacz przypis<a href="#note">1</a>.</p><p id="note">Treść przypisu.</p>';
const ONE_LINE_HTML = '<p>Zasady ogólne.</p>';
const DARK_THEME_CLASS = 'diffwise-html-diff--dark-theme';
const PAGE_DARK_CLASS = 'dark';
const PAGE_DARK_SELECTOR = '.dark';
const ROLE_ATTRIBUTE = 'role';
const REGION_ROLE = 'region';
const POLISH_LOCALE = 'pl-PL';
const POLISH_VERSION_NAMES = ['Poprzednia wersja', 'Nowa wersja'];

/** Inputs of the component besides the two versions. */
type OptionInputs = DiffwiseConfigOptions & {
  readonly config?: DiffwiseConfig | DiffwiseConfigOptions;
};

/** Elements scrolled to; jsdom does not scroll, so tests record the calls instead. */
const scrolledTo: Element[] = [];

Element.prototype.scrollIntoView = function (this: Element) {
  scrolledTo.push(this);
};

/** Clicks the footnote link of the new version and returns the click event. */
function clickNewFootnoteLink(element: HTMLElement, options: MouseEventInit = {}): MouseEvent {
  const link = element.querySelector(`${NEW_CONTENT_SELECTOR} ${FRAGMENT_LINK_SELECTOR}`);
  const click = new MouseEvent(CLICK_EVENT, { ...options, bubbles: true, cancelable: true });

  link?.dispatchEvent(click);

  return click;
}

/** Renders the component with two versions of a document and, if given, its options. */
function render(oldHtml: string, newHtml: string, inputs: OptionInputs = {}) {
  const fixture = TestBed.createComponent(DiffwiseHtmlDiff);

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(inputs)) {
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

/** Names of the header icons, which screen readers read. */
function iconNamesOf(element: HTMLElement) {
  return Array.from(element.querySelectorAll(VERSION_HEADER_ICON_SELECTOR), (icon) =>
    icon.getAttribute(ARIA_LABEL_ATTRIBUTE),
  );
}

/** Two diffs of the same document on one page. */
@Component({
  imports: [DiffwiseHtmlDiff],
  template: `
    <diffwise-html-diff [oldHtml]="html" [newHtml]="html" />
    <diffwise-html-diff [oldHtml]="html" [newHtml]="html" />
  `,
})
class TwoDiffs {
  protected readonly html = '<h2 id="plans">Plany</h2><p><a href="#plans">Zobacz plany</a></p>';
}

describe('DiffwiseHtmlDiff', () => {
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

  it('marks changed words inside the formatting of a changed line (T2)', () => {
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
    const ids = Array.from(element.querySelectorAll(ID_SELECTOR), (found) => found.id);
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

  it('ignores differences in letter case and whitespace on request (T9)', () => {
    const oldHtml = '<p>Termin: 23:00, sala A.</p>';
    const newHtml = '<p>Termin:23:00, Sala A.</p>';
    const ignoring = { ignoreCase: true, ignoreWhitespace: true };

    expect(rowsOf(renderElement(oldHtml, newHtml))).toEqual([[LineChangeKind.Changed, 1, 1]]);
    expect(rowsOf(renderElement(oldHtml, newHtml, ignoring))).toEqual([
      [LineChangeKind.Unchanged, 1, 1],
    ]);
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

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(POLISH_VERSION_NAMES);
    expect(element.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe('Porównanie wersji dokumentu');
  });

  it('takes the language of the app in automatic mode', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: POLISH_LOCALE }],
    });

    expect(textsOf(renderElement('', ''), VERSION_HEADER_SELECTOR)).toEqual(POLISH_VERSION_NAMES);
  });

  it('shows custom texts instead of single texts of the interface, also as names of icons', () => {
    const element = renderElement('', '', {
      language: DiffwiseLanguage.PL,
      versionHeaders: DiffwiseVersionHeaders.Icons,
      customTexts: { oldVersion: 'Przed zmianami' },
    });

    expect(iconNamesOf(element)).toEqual(['Przed zmianami', 'Nowa wersja']);
  });

  it('takes custom texts from every level of the configuration, text by text', () => {
    const globalTexts = { oldVersion: 'Vorherige Version', newVersion: 'Neue Version' };

    TestBed.configureTestingModule({ providers: [provideDiffwise({ customTexts: globalTexts })] });

    const element = renderElement('', '', { customTexts: { newVersion: 'Entwurf' } });

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(['Vorherige Version', 'Entwurf']);
  });
});
