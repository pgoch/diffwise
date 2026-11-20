import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { CHANGELOG_URL, DOCS_URL, ISSUES_URL } from '../site';
import { HomePage } from './home-page';

const ENTRY_SELECTOR = '.entry';
const ACTION_SELECTOR = '.actions a';
const VERSION_LINK_SELECTOR = '.meta a';
const DIFF_SELECTOR = '.shot diffwise-html';
const COPY_SELECTOR = '.install-copy';
const HREF_ATTRIBUTE = 'href';
const CLIPBOARD_PROPERTY = 'clipboard';
const INSTALL_COMMAND = 'npm install ngx-diffwise';
const COPY = 'Copy';
const COPIED = 'Copied';
const COPIED_TIME = 2000;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, CLIPBOARD_PROPERTY);
});

/** Renders the home page. */
function render(): ComponentFixture<HomePage> {
  const fixture = TestBed.createComponent(HomePage);

  fixture.detectChanges();

  return fixture;
}

/** Gives the browser a clipboard that copies or refuses to. */
function useClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, CLIPBOARD_PROPERTY, {
    value: { writeText },
    configurable: true,
  });
}

/** The trimmed text of the element of the selector. */
function textOf(fixture: ComponentFixture<HomePage>, selector: string): string {
  const element = fixture.nativeElement as HTMLElement;

  return element.querySelector(selector)?.textContent?.trim() ?? '';
}

/** The text and the address of each link of the selector. */
function linksOf(fixture: ComponentFixture<HomePage>, selector: string): [string, string | null][] {
  const element = fixture.nativeElement as HTMLElement;

  return Array.from(element.querySelectorAll(selector), (link) => [
    link.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    link.getAttribute(HREF_ATTRIBUTE),
  ]);
}

/** Clicks the copy button. */
function clickCopy(fixture: ComponentFixture<HomePage>): void {
  const element = fixture.nativeElement as HTMLElement;

  element.querySelector<HTMLButtonElement>(COPY_SELECTOR)?.click();
}

describe('HomePage', () => {
  it('leads to the demo, the configurator, the documentation and the issues', () => {
    const fixture = render();

    expect(linksOf(fixture, ACTION_SELECTOR)).toEqual([
      ['Try the demo', '#demo'],
      ['Build your configuration', '#configurator'],
      ['Report an issue', ISSUES_URL],
    ]);
    expect(linksOf(fixture, ENTRY_SELECTOR).map(([, href]) => href)).toEqual([
      '#demo',
      '#configurator',
      DOCS_URL,
    ]);
  });

  it('leads to the changelog from the line of the version', () => {
    const fixture = render();

    expect(linksOf(fixture, VERSION_LINK_SELECTOR)).toEqual([['Changelog', CHANGELOG_URL]]);
  });

  it('shows the changes of a short policy in a real diff', () => {
    const fixture = render();
    const diffText = textOf(fixture, DIFF_SELECTOR);

    expect(diffText).toContain('Returns policy');
    expect(diffText).toContain('14');
    expect(diffText).toContain('30');
  });

  it('copies the command that installs Diffwise, and says so for a while', async () => {
    const writeText = vi.fn(async () => undefined);

    useClipboard(writeText);
    vi.useFakeTimers();

    const fixture = render();

    clickCopy(fixture);
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(INSTALL_COMMAND);
    expect(textOf(fixture, COPY_SELECTOR)).toBe(COPIED);

    vi.advanceTimersByTime(COPIED_TIME);
    fixture.detectChanges();

    expect(textOf(fixture, COPY_SELECTOR)).toBe(COPY);
  });

  it('selects the command when the browser does not let it be copied', async () => {
    useClipboard(async () => {
      throw new Error('Not allowed');
    });

    const fixture = render();

    clickCopy(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.getSelection()?.toString()).toBe(INSTALL_COMMAND);
    expect(textOf(fixture, COPY_SELECTOR)).toBe(COPY);
  });
});
