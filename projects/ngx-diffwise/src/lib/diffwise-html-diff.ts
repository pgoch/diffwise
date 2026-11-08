import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import {
  type DiffOptions,
  type LineChangeKind,
  type ViewLine,
  type ViewRow,
  diffHtml,
} from '../engine';
import { ColorScheme, isDarkColorMode, watchDarkMarker } from './color-scheme';
import type { DiffwiseConfig, DiffwiseConfigOptions } from './config/diffwise-config';
import {
  DiffwiseColorMode,
  type DiffwiseLanguage,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
} from './config/option-values';
import { Diffwise } from './diffwise';
import { LANGUAGE_TEXTS, resolveLanguage } from './i18n/resolve-language';
import type { DiffwiseCustomTexts, UiTexts } from './i18n/texts';

/** Starts the id prefix of each diff on the page: `diffwise-1`, `diffwise-2` and so on. */
const ID_PREFIX_START = 'diffwise-';

const IN_PAGE_LINK_SELECTOR = 'a[href^="#"]';
const LINK_TARGET_SELECTOR = '[id], a[name]';
const ANCHOR_TAG = 'a';
const HREF_ATTRIBUTE = 'href';
const NAME_ATTRIBUTE = 'name';
const TABINDEX_ATTRIBUTE = 'tabindex';
const FRAGMENT_START = '#';

/** A `tabindex` that lets a script focus an element without adding it to the tab order. */
const FOCUSABLE_BY_SCRIPT = '-1';

/** Diffs created so far; numbers the id prefixes. */
let createdDiffs = 0;

/** A line as the template shows it. */
interface ShownLine {
  readonly number: number;
  /** HTML that DOMPurify has sanitized, marked as safe so that Angular shows it as it is. */
  readonly html: SafeHtml;
}

/** A row as the template shows it. */
interface ShownRow {
  readonly kind: LineChangeKind;
  readonly oldLine: ShownLine | null;
  readonly newLine: ShownLine | null;
}

/** Headers as the template shows them. */
interface ShownVersionHeaders {
  readonly texts: DiffwiseVersionHeaderTexts;
  /** Shows icons named by the texts instead of the texts. */
  readonly asIcons: boolean;
}

/** Shows two versions of an HTML document side by side, with the changes marked. */
@Component({
  selector: 'diffwise-html-diff',
  templateUrl: './diffwise-html-diff.html',
  styleUrl: './diffwise-html-diff.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'diffwise-html-diff',
    role: 'region',
    '[attr.aria-label]': 'texts().diffLabel',
    '[class.diffwise-html-diff--dark-theme]': 'isDark()',
    '[class.diffwise-html-diff--no-line-numbers]': '!effectiveConfig().showLineNumbers',
    '(click)': 'followInPageLink($event)',
  },
})
export class DiffwiseHtmlDiff {
  /** The earlier version of the document. */
  readonly oldHtml = input('');

  /** The later version of the document. */
  readonly newHtml = input('');

  /** Options of this diff in one object, such as a `DiffwiseConfig`; it changes only those it sets. */
  readonly config = input<DiffwiseConfig | DiffwiseConfigOptions>({});

  /** Light, dark, or automatic; wins over `config` and the global configuration. */
  readonly colorMode = input<DiffwiseColorMode>();

  /** The app's dark mode marker, such as `.dark`; wins over `config` and the global configuration. */
  readonly darkModeSelector = input<string | null>();

  /** Shows the number of each line; wins over `config` and the global configuration. */
  readonly showLineNumbers = input<boolean>();

  /** Headers above the two versions; wins over `config` and the global configuration. */
  readonly versionHeaders = input<DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts>();

  /** Ignores differences in whitespace; wins over `config` and the global configuration. */
  readonly ignoreWhitespace = input<boolean>();

  /** Ignores differences in letter case; wins over `config` and the global configuration. */
  readonly ignoreCase = input<boolean>();

  /** Language of the interface; wins over `config` and the global configuration. */
  readonly language = input<DiffwiseLanguage>();

  /**
   * Texts shown instead of texts of the interface; each wins over the same text of `config` and
   * the global configuration.
   */
  readonly customTexts = input<DiffwiseCustomTexts>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly diffwise = inject(Diffwise);
  private readonly colorScheme = inject(ColorScheme);
  private readonly localeId = inject(LOCALE_ID);
  private readonly idPrefix = nextIdPrefix();

  /** True while the diff is inside an element that matches the dark mode marker of the app. */
  private readonly insideDarkMarker = signal(false);

  /** Options set by single inputs; an input left unset changes nothing. */
  private readonly inputOptions = computed<DiffwiseConfigOptions>(() => ({
    colorMode: this.colorMode(),
    darkModeSelector: this.darkModeSelector(),
    showLineNumbers: this.showLineNumbers(),
    versionHeaders: this.versionHeaders(),
    ignoreWhitespace: this.ignoreWhitespace(),
    ignoreCase: this.ignoreCase(),
    language: this.language(),
    customTexts: this.customTexts(),
  }));

  /** The options in effect: single inputs over `config`, over the global configuration. */
  protected readonly effectiveConfig = computed(() =>
    this.diffwise.config().with(this.config()).with(this.inputOptions()),
  );

  /** What counts as a difference; other options change without comparing the versions again. */
  private readonly diffOptions = computed<DiffOptions>(
    () => {
      const { ignoreWhitespace, ignoreCase } = this.effectiveConfig();
      return { ignoreWhitespace, ignoreCase };
    },
    { equal: areDiffOptionsEqual },
  );

  /** The dark mode marker to watch in automatic mode, or `null` when the diff follows the system. */
  private readonly watchedDarkMarker = computed(() => {
    const { colorMode, darkModeSelector } = this.effectiveConfig();
    return colorMode === DiffwiseColorMode.Auto ? darkModeSelector : null;
  });

  /** True when the diff shows the dark theme. */
  protected readonly isDark = computed(() =>
    isDarkColorMode(this.effectiveConfig().colorMode, () => this.autoModeIsDark()),
  );

  /** Texts of the interface in its language, with the custom texts of the app. */
  protected readonly texts = computed<UiTexts>(() => {
    const { language, customTexts } = this.effectiveConfig();
    const languageTexts = LANGUAGE_TEXTS[resolveLanguage(language, this.localeId)];

    return { ...languageTexts, ...customTexts };
  });

  /** Headers above the two versions, or `null` without headers. */
  protected readonly shownVersionHeaders = computed(() =>
    toShownVersionHeaders(this.effectiveConfig().versionHeaders, this.texts()),
  );

  /** Rows of the view, compared again whenever either version or `diffOptions` changes. */
  protected readonly rows = computed(() => {
    const settings = { options: this.diffOptions(), idPrefix: this.idPrefix };
    const { rows } = diffHtml(this.oldHtml(), this.newHtml(), settings);

    return rows.map((row) => this.shownRow(row));
  });

  /** Watches the dark mode marker of the app after rendering, when the diff is in the page. */
  constructor() {
    afterRenderEffect((onCleanup) => {
      const selector = this.watchedDarkMarker();

      if (selector === null) {
        return;
      }

      const stopWatching = watchDarkMarker(this.host.nativeElement, selector, (isInside) =>
        this.insideDarkMarker.set(isInside),
      );

      onCleanup(stopWatching);
    });
  }

  /**
   * Follows a `#…` link of the content within this diff. The browser would resolve the link
   * against the app's `<base href>` and could leave the page.
   */
  protected followInPageLink(event: MouseEvent): void {
    const clicked = event.target;
    const link = clicked instanceof Element ? clicked.closest(IN_PAGE_LINK_SELECTOR) : null;

    if (link === null || hasModifierKeys(event)) {
      return;
    }

    event.preventDefault();

    const target = this.linkTarget(link);

    if (target !== null) {
      target.scrollIntoView();
      focusWithoutScrolling(target);
    }
  }

  /** In automatic mode: dark inside the dark mode marker of the app, or else as the system. */
  private autoModeIsDark(): boolean {
    return this.watchedDarkMarker() === null
      ? this.colorScheme.systemPrefersDark()
      : this.insideDarkMarker();
  }

  private shownRow({ kind, oldLine, newLine }: ViewRow): ShownRow {
    return { kind, oldLine: this.shownLine(oldLine), newLine: this.shownLine(newLine) };
  }

  /**
   * Marks the line HTML as safe. DOMPurify has sanitized it, and sanitizing it again in Angular
   * would remove inline styles and checkboxes.
   */
  private shownLine(line: ViewLine | null): ShownLine | null {
    if (line === null) {
      return null;
    }

    return { number: line.number, html: this.sanitizer.bypassSecurityTrustHtml(line.html) };
  }

  /** The element of this diff that a `#…` link points to. */
  private linkTarget(link: Element): HTMLElement | null {
    const fragment = link.getAttribute(HREF_ATTRIBUTE)?.slice(FRAGMENT_START.length);
    const targets = this.host.nativeElement.querySelectorAll<HTMLElement>(LINK_TARGET_SELECTOR);

    return Array.from(targets).find((target) => isLinkTarget(target, fragment)) ?? null;
  }
}

/** An id prefix that no other diff on the page uses, such as `diffwise-1`. */
function nextIdPrefix(): string {
  createdDiffs++;
  return ID_PREFIX_START + createdDiffs;
}

/** True when both count the same differences. */
function areDiffOptionsEqual(first: DiffOptions, second: DiffOptions): boolean {
  const names = Object.keys(first) as (keyof DiffOptions)[];
  return names.every((name) => first[name] === second[name]);
}

/**
 * Texts of the headers and whether icons show them; `null` without headers. Without texts of
 * the app, the texts of the interface name the versions.
 */
function toShownVersionHeaders(
  versionHeaders: DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts,
  texts: UiTexts,
): ShownVersionHeaders | null {
  const versionNames = { old: texts.oldVersion, new: texts.newVersion };

  switch (versionHeaders) {
    case DiffwiseVersionHeaders.None:
      return null;
    case DiffwiseVersionHeaders.Default:
      return { texts: versionNames, asIcons: false };
    case DiffwiseVersionHeaders.Icons:
      return { texts: versionNames, asIcons: true };
    default:
      return { texts: versionHeaders, asIcons: false };
  }
}

/** True for the element that `#fragment` points to: by its id or, for an anchor, by its name. */
function isLinkTarget(element: Element, fragment: string | undefined): boolean {
  const isNamedAnchor =
    element.localName === ANCHOR_TAG && element.getAttribute(NAME_ATTRIBUTE) === fragment;

  return element.id === fragment || isNamedAnchor;
}

/** True when a modifier key asks the browser for something else, such as a new tab. */
function hasModifierKeys(event: MouseEvent): boolean {
  return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
}

/** Moves the focus to the target as following a link does, so screen readers continue there. */
function focusWithoutScrolling(target: HTMLElement): void {
  const focusableByItself = target.tabIndex >= 0;

  if (!focusableByItself) {
    target.setAttribute(TABINDEX_ATTRIBUTE, FOCUSABLE_BY_SCRIPT);
  }

  target.focus({ preventScroll: true });
}
