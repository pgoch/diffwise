import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';

import { serveSampleFiles } from '../testing/sample-files';
import { App } from './app';
import { DOCS_URL, GITHUB_URL } from './site';

const DEMO_HASH = '#demo';
const CONFIGURATOR_HASH = '#configurator';
const UNKNOWN_HASH = '#unknown';
const HOME_PAGE_SELECTOR = 'demo-home-page';
const DEMO_PAGE_SELECTOR = 'demo-demo-page';
const CONFIGURATOR_PAGE_SELECTOR = 'demo-configurator-page';
const BRAND_SELECTOR = '.site-brand';
const LINK_SELECTOR = '.site-nav a';
const CURRENT_LINK_SELECTOR = '.site-nav [aria-current="page"]';
const HREF_ATTRIBUTE = 'href';
const HOME_TITLE = 'Diffwise';
const DEMO_TITLE = 'Diffwise demo';
const CONFIGURATOR_TITLE = 'Diffwise configurator';
const HASH_CHANGE_EVENT = 'hashchange';
const HOME_HREF = '#';

beforeEach(async () => {
  serveSampleFiles();
  TestBed.configureTestingModule({ imports: [App] });
  await TestBed.compileComponents();
});

afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState(null, '', location.pathname);
});

/** The site, kept for `follow()`. */
let fixture: ComponentFixture<App>;

/** Renders the site at the address after `#`, without a hash change event, once its page loads. */
async function render(hash: string): Promise<HTMLElement> {
  history.replaceState(null, '', location.pathname + hash);
  fixture = TestBed.createComponent(App);
  await settle();

  return fixture.nativeElement;
}

/** Goes to the address after `#` as a link does, and waits for its page. */
async function follow(hash: string): Promise<void> {
  history.replaceState(null, '', location.pathname + hash);
  window.dispatchEvent(new HashChangeEvent(HASH_CHANGE_EVENT));
  await settle();
}

/** Waits for the page to load and show. */
async function settle(): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
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
  it('shows the demo at its address, with its title and its link marked', async () => {
    const element = await render(DEMO_HASH);

    expect(element.querySelector(DEMO_PAGE_SELECTOR)).not.toBeNull();
    expect(element.querySelector(CURRENT_LINK_SELECTOR)?.textContent?.trim()).toBe('Demo');
    expect(TestBed.inject(Title).getTitle()).toBe(DEMO_TITLE);
  });

  it('shows the home page without an address and for an unknown one', async () => {
    expect((await render('')).querySelector(HOME_PAGE_SELECTOR)).not.toBeNull();
    expect((await render(UNKNOWN_HASH)).querySelector(HOME_PAGE_SELECTOR)).not.toBeNull();
    expect(TestBed.inject(Title).getTitle()).toBe(HOME_TITLE);
  });

  it('goes back home without an address, with no link marked', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const element = await render(DEMO_HASH);

    await follow('');

    expect(element.querySelector(HOME_PAGE_SELECTOR)).not.toBeNull();
    expect(element.querySelector(CURRENT_LINK_SELECTOR)).toBeNull();
  });

  it('shows the page of a new address from the top, with its title and its link marked', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const element = await render(DEMO_HASH);

    await follow(CONFIGURATOR_HASH);

    expect(element.querySelector(CONFIGURATOR_PAGE_SELECTOR)).not.toBeNull();
    expect(element.querySelector(DEMO_PAGE_SELECTOR)).toBeNull();
    expect(element.querySelector(CURRENT_LINK_SELECTOR)?.textContent?.trim()).toBe('Configurator');
    expect(TestBed.inject(Title).getTitle()).toBe(CONFIGURATOR_TITLE);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('stays on the page when the address does not change it', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const element = await render(CONFIGURATOR_HASH);

    await follow(CONFIGURATOR_HASH);

    expect(element.querySelector(CONFIGURATOR_PAGE_SELECTOR)).not.toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leads home from the name, and to the documentation and the repository', async () => {
    const element = await render(DEMO_HASH);

    expect(element.querySelector(BRAND_SELECTOR)?.getAttribute(HREF_ATTRIBUTE)).toBe(HOME_HREF);
    expect(linksOf(element)).toEqual({
      Demo: DEMO_HASH,
      Configurator: CONFIGURATOR_HASH,
      Docs: DOCS_URL,
      GitHub: GITHUB_URL,
    });
  });
});
