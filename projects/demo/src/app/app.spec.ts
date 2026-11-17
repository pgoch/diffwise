import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';

import { serveSampleFiles } from '../testing/sample-files';
import { App } from './app';
import { DOCS_URL, GITHUB_URL } from './site';

const DEMO_HASH = '#demo';
const UNKNOWN_HASH = '#unknown';
const DEMO_PAGE_SELECTOR = 'demo-demo-page';
const BRAND_SELECTOR = '.site-brand';
const LINK_SELECTOR = '.site-nav a';
const CURRENT_LINK_SELECTOR = '.site-nav [aria-current="page"]';
const HREF_ATTRIBUTE = 'href';
const DEMO_TITLE = 'Diffwise demo';
const HOME_HREF = '#';

beforeEach(() => {
  serveSampleFiles();
});

afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState(null, '', location.pathname);
});

/** Renders the site at the address after `#`, without a hash change event. */
function render(hash: string): HTMLElement {
  history.replaceState(null, '', location.pathname + hash);

  const fixture = TestBed.createComponent(App);

  fixture.detectChanges();

  return fixture.nativeElement;
}

/** The addresses of the links of the bar on top, by their text. */
function linksOf(element: HTMLElement): Record<string, string | null> {
  const links = Array.from(element.querySelectorAll(LINK_SELECTOR), (link) => [
    link.textContent?.trim() ?? '',
    link.getAttribute(HREF_ATTRIBUTE),
  ]);

  return Object.fromEntries(links);
}

describe('App', () => {
  it('shows the demo at its address, with its title and its link marked', () => {
    const element = render(DEMO_HASH);

    expect(element.querySelector(DEMO_PAGE_SELECTOR)).not.toBeNull();
    expect(element.querySelector(CURRENT_LINK_SELECTOR)?.textContent?.trim()).toBe('Demo');
    expect(TestBed.inject(Title).getTitle()).toBe(DEMO_TITLE);
  });

  it('shows the first page without an address and for an unknown one', () => {
    expect(render('').querySelector(DEMO_PAGE_SELECTOR)).not.toBeNull();
    expect(render(UNKNOWN_HASH).querySelector(DEMO_PAGE_SELECTOR)).not.toBeNull();
  });

  it('leads home from the name, and to the documentation and the repository', () => {
    const element = render(DEMO_HASH);

    expect(element.querySelector(BRAND_SELECTOR)?.getAttribute(HREF_ATTRIBUTE)).toBe(HOME_HREF);
    expect(linksOf(element)).toEqual({ Demo: DEMO_HASH, Docs: DOCS_URL, GitHub: GITHUB_URL });
  });
});
