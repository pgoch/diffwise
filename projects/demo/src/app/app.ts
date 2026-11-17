import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { DemoPage } from './demo/demo-page';
import { DOCS_URL, GITHUB_URL, VERSION } from './site';

/** Pages of the site. */
const Page = {
  Demo: 'demo',
} as const;

type Page = (typeof Page)[keyof typeof Page];

/** A page with its address after `#` and the title of the browser tab. */
interface SitePage {
  readonly page: Page;
  readonly hash: string;
  readonly title: string;
}

/** The pages of the site; the first one shows without an address and for an unknown one. */
const SITE_PAGES: readonly SitePage[] = [
  { page: Page.Demo, hash: '#demo', title: 'Diffwise demo' },
];

const HASH_CHANGE_EVENT = 'hashchange';

/** The site of Diffwise: a bar on top and one page under it, chosen by the address after `#`. */
@Component({
  selector: 'demo-root',
  imports: [DemoPage],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Pages of the site, for the template. */
  protected readonly pages = Page;

  /** Links of the bar on top, for the template. */
  protected readonly links = { docs: DOCS_URL, github: GITHUB_URL };

  /** The version in the bar on top. */
  protected readonly version = VERSION;

  /** The page that shows. */
  protected readonly page = signal<Page>(SITE_PAGES[0].page);

  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);

  constructor() {
    const listeners = new AbortController();

    this.showPage(sitePageOf(this.document.location.hash));
    this.document.defaultView?.addEventListener(HASH_CHANGE_EVENT, () => this.followAddress(), {
      signal: listeners.signal,
    });
    inject(DestroyRef).onDestroy(() => listeners.abort());
  }

  /** Shows the page of the new address from the top, as a link to another page does. */
  private followAddress(): void {
    const sitePage = sitePageOf(this.document.location.hash);

    if (sitePage.page === this.page()) {
      return;
    }

    this.showPage(sitePage);
    this.document.defaultView?.scrollTo(0, 0);
  }

  /** Shows the page and its title in the browser tab. */
  private showPage({ page, title }: SitePage): void {
    this.page.set(page);
    this.title.setTitle(title);
  }
}

/** The page of an address after `#`; the first page for an empty or unknown one. */
function sitePageOf(hash: string): SitePage {
  return SITE_PAGES.find((sitePage) => sitePage.hash === hash) ?? SITE_PAGES[0];
}
