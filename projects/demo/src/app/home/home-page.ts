import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { DiffwiseColorMode, DiffwiseHtml } from 'ngx-diffwise';

import { ownOptions } from '../diff-options';
import { CHANGELOG_URL, DOCS_URL, ISSUES_URL, VERSION } from '../site';

/** The command that adds Diffwise to an app. */
const INSTALL_COMMAND = 'npm install ngx-diffwise';

/** How long the copy button says "Copied", in ms. */
const COPIED_TIME = 2000;

/** Name of the command in the template. */
const COMMAND_REFERENCE = 'command';

/** The two versions of a short policy in the diff on top of the page. */
const OLD_POLICY = [
  '<h2>Returns policy</h2>',
  '<p>You can return a product within 14 days of delivery.</p>',
  '<p>Refunds go back to the card you paid with.</p>',
  '<p>Opened software cannot be returned.</p>',
].join('');

const NEW_POLICY = [
  '<h2>Returns policy</h2>',
  '<p>You can return a product within 30 days of delivery.</p>',
  '<p>Refunds go back to the card you paid with.</p>',
  '<p>Gift cards cannot be returned.</p>',
].join('');

/** Keeps the choices made in the view settings of the diff on top apart from those of the demo. */
const HOME_SETTINGS_KEY = 'diffwise-home';

/** Width of the diff on top of the page from which it shows two columns, in px. */
const POLICY_LAYOUT_BREAKPOINT = 480;

/**
 * The diff on top of the page: in the light theme, as the page, and apart from the demo. It shows
 * two columns beside the title, and one on a phone.
 */
const POLICY_DIFF_OPTIONS = ownOptions(HOME_SETTINGS_KEY, {
  colorMode: DiffwiseColorMode.Light,
  layoutBreakpoint: POLICY_LAYOUT_BREAKPOINT,
});

/** A way into the site, with a sentence about it. */
interface Entry {
  readonly title: string;
  readonly text: string;
  readonly more: string;
  readonly href: string;
}

const ENTRIES: readonly Entry[] = [
  {
    title: 'Demo',
    text: 'Compare sample documents in 12 languages and plain texts, with a panel for every option.',
    more: 'Open the demo',
    href: '#demo',
  },
  {
    title: 'Configurator',
    text: 'Pick the options step by step with a live preview, and copy the configuration into your app.',
    more: 'Start configuring',
    href: '#configurator',
  },
  {
    title: 'Documentation',
    text: 'Every option, how the comparison works, accessibility and the roadmap.',
    more: 'Read the docs',
    href: DOCS_URL,
  },
];

/** Something Diffwise does, in a few words. */
interface Feature {
  readonly title: string;
  readonly text: string;
}

const FEATURES: readonly Feature[] = [
  { title: 'What readers see', text: 'Compares the rendered text, not the markup.' },
  { title: 'Two layouts', text: 'Side by side, or one column on narrow screens.' },
  { title: 'Formatting, links, images', text: 'Tooltips say what changed besides the text.' },
  { title: 'Lists and tables', text: 'Columns matched, cells compared one by one.' },
  {
    title: 'Accessible',
    text: 'Keyboard, screen readers, high contrast and a colorblind-friendly palette.',
  },
  { title: '12 languages', text: 'An interface in the language of your users.' },
];

/**
 * The home page: what Diffwise is, with a real diff beside it, the ways into the demo, the
 * configurator and the documentation, and what Diffwise does.
 */
@Component({
  selector: 'demo-home-page',
  imports: [DiffwiseHtml],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  /** The version of Diffwise. */
  protected readonly version = VERSION;

  /** Links to the issues and to the changelog of the repository. */
  protected readonly links = { issues: ISSUES_URL, changelog: CHANGELOG_URL };

  /** The command that adds Diffwise to an app. */
  protected readonly installCommand = INSTALL_COMMAND;

  /** The two versions of the policy in the diff on top of the page, and its options. */
  protected readonly policy = { old: OLD_POLICY, new: NEW_POLICY, options: POLICY_DIFF_OPTIONS };

  /** The ways into the site. */
  protected readonly entries = ENTRIES;

  /** What Diffwise does. */
  protected readonly features = FEATURES;

  /** True for a while after the command was copied. */
  protected readonly isCopied = signal(false);

  /** The command on the page, which gets selected when the browser does not let it be copied. */
  private readonly command = viewChild.required<ElementRef<HTMLElement>>(COMMAND_REFERENCE);

  /** Copies the command, or selects it for copying by hand when the browser does not allow it. */
  protected async copyInstallCommand(): Promise<void> {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
    } catch {
      selectContent(this.command().nativeElement);
      return;
    }

    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), COPIED_TIME);
  }
}

/** Selects the text of the element, as a triple click does. */
function selectContent(element: HTMLElement): void {
  const selection = element.ownerDocument.getSelection();

  selection?.selectAllChildren(element);
}
