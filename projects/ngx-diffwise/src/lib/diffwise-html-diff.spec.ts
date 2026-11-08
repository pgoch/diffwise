import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LineChangeKind } from '../engine';
import { DiffwiseHtmlDiff } from './diffwise-html-diff';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const VERSION_HEADER_SELECTOR = '.diffwise-html-diff__version-header';
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

/** Renders the component with two versions of a document. */
function render(oldHtml: string, newHtml: string) {
  const fixture = TestBed.createComponent(DiffwiseHtmlDiff);

  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);
  fixture.detectChanges();

  return fixture;
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
});
