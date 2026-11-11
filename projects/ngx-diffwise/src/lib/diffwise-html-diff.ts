import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import {
  CHANGE_DETAILS_ATTRIBUTE,
  type ChangeDetail,
  DETAIL_INDEX_SEPARATOR,
  type DiffOptions,
  type LineChangeKind,
  type ViewLine,
  type ViewRow,
  diffHtml,
} from '../engine';
import { appearanceClasses, appearanceStyles } from './appearance';
import { ChangeDetailsButton } from './change-details/change-details-button';
import { ChangeDescriber } from './change-details/change-texts';
import {
  ChangeTooltip,
  type TooltipRequest,
  TriggerDescription,
} from './change-details/change-tooltip';
import { titleOnlyTooltip } from './change-details/tooltip-content';
import { ColorScheme, isDarkColorMode, watchDarkMarker } from './color-scheme';
import type { DiffwiseDiffColors, ThemeDiffColors } from './config/diff-colors';
import type { DiffwiseConfig, DiffwiseConfigOptions } from './config/diffwise-config';
import {
  type DiffwiseAlignment,
  DiffwiseChangeDetails,
  type DiffwiseChangeDetailsIconStyle,
  DiffwiseColorMode,
  type DiffwiseDividerStyle,
  type DiffwiseGapStyle,
  type DiffwiseHighlightStyle,
  type DiffwiseLanguage,
  type DiffwiseLevel,
  type DiffwiseLineNumberStyle,
  type DiffwiseTooltipColorMode,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
  type DiffwiseVerticalAlignment,
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

/** A `tabindex` that adds an element to the tab order, in the order of the page. */
const FOCUSABLE_IN_ORDER = '0';

const TOOLTIP_ID_END = '-tooltip';
const ROW_SELECTOR = '.diffwise-html-diff__row';
const CONTENT_SELECTOR = '.diffwise-html-diff__content';
const CHANGE_DETAILS_ICON_SELECTOR = '.diffwise-html-diff__change-details-icon';
const VERSION_HEADER_ICON_SELECTOR = '.diffwise-html-diff__version-header-icon';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';

/** Icons with a tooltip: icons of changes, and icons in place of the version headers. */
const ICON_TRIGGER_SELECTOR = [CHANGE_DETAILS_ICON_SELECTOR, VERSION_HEADER_ICON_SELECTOR].join();
const FOCUS_VISIBLE_SELECTOR = ':focus-visible';
const MOUSEOVER_EVENT = 'mouseover';
const MOUSEOUT_EVENT = 'mouseout';
const FOCUSIN_EVENT = 'focusin';
const FOCUSOUT_EVENT = 'focusout';

/** Marks a row with changes besides text with its position, so its markers find their details. */
const ROW_INDEX_ATTRIBUTE = 'data-diffwise-row';

/** A marker of changed text that points to change details. */
const DESCRIBED_MARKER_SELECTOR = `[${CHANGE_DETAILS_ATTRIBUTE}]`;

/** Markers that can take the focus: the new version has one for each change, which is one stop. */
const FOCUSABLE_MARKER_SELECTOR = `.diffwise-html-diff__content--new ${DESCRIBED_MARKER_SELECTOR}`;

/** Diffs created so far; numbers the id prefixes. */
let createdDiffs = 0;

/** Colors of a theme without colors of the app. */
const NO_COLORS: ThemeDiffColors = Object.freeze({});

const NO_CHANGE_DETAILS: readonly ChangeDetail[] = [];

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
  /** Changes besides changed text, such as formatting; markers point to them by position. */
  readonly changeDetails: readonly ChangeDetail[];
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
  imports: [ChangeDetailsButton, ChangeTooltip],
  templateUrl: './diffwise-html-diff.html',
  styleUrls: [
    './diffwise-html-diff.css',
    './list-and-table-lines.css',
    './change-details/change-details.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'diffwise-html-diff',
    role: 'region',
    '[attr.aria-label]': 'texts().diffLabel',
    '[class]': 'modifierClasses()',
    '[class.diffwise-html-diff--dark-theme]': 'isDark()',
    '[style]': 'inlineStyles()',
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

  /** Style of changed words; wins over `config` and the global configuration. */
  readonly highlightStyle = input<DiffwiseHighlightStyle>();

  /** Intensity of change colors, from 1 to 5; wins over `config` and the global configuration. */
  readonly diffIntensity = input<DiffwiseLevel>();

  /** Contrast besides the content, from 1 to 5; wins over `config` and the global configuration. */
  readonly uiContrast = input<DiffwiseLevel>();

  /**
   * Colors of changes for each theme; each wins over the same color of `config` and the global
   * configuration, and `null` shows none of their colors.
   */
  readonly diffColors = input<DiffwiseDiffColors | null>();

  /** Shows the number of each line; wins over `config` and the global configuration. */
  readonly showLineNumbers = input<boolean>();

  /** What the number of a changed line gets; wins over `config` and the global configuration. */
  readonly lineNumberStyle = input<DiffwiseLineNumberStyle>();

  /** Place of the line numbers in their lines; wins over `config` and the global configuration. */
  readonly lineNumberAlignment = input<DiffwiseVerticalAlignment>();

  /** Gives changed lines a background; wins over `config` and the global configuration. */
  readonly highlightChangedLines = input<boolean>();

  /**
   * Without backgrounds of changed lines, highlights an added or a removed line as a whole; wins
   * over `config` and the global configuration.
   */
  readonly highlightWholeLines = input<boolean>();

  /** What stands between the versions; wins over `config` and the global configuration. */
  readonly dividerStyle = input<DiffwiseDividerStyle>();

  /** What fills the gap opposite a line; wins over `config` and the global configuration. */
  readonly gapStyle = input<DiffwiseGapStyle>();

  /** Headers above the two versions; wins over `config` and the global configuration. */
  readonly versionHeaders = input<DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts>();

  /** Place of the header texts; wins over `config` and the global configuration. */
  readonly versionHeaderAlignment = input<DiffwiseAlignment>();

  /** Font of the diff, or a font of the app; wins over `config` and the global configuration. */
  readonly fontFamily = input<string>();

  /** Font size of the headers in rem; wins over `config` and the global configuration. */
  readonly versionHeaderFontSize = input<number>();

  /** Font size of the line numbers in rem; wins over `config` and the global configuration. */
  readonly lineNumberFontSize = input<number>();

  /** Font size of the tooltips in rem; wins over `config` and the global configuration. */
  readonly tooltipFontSize = input<number>();

  /** Where details of changes besides text show; wins over `config` and the global configuration. */
  readonly changeDetails = input<DiffwiseChangeDetails>();

  /** Look of the icons between the versions; wins over `config` and the global configuration. */
  readonly changeDetailsIconStyle = input<DiffwiseChangeDetailsIconStyle>();

  /** Colors of the tooltips; wins over `config` and the global configuration. */
  readonly tooltipColorMode = input<DiffwiseTooltipColorMode>();

  /**
   * Highlights in a tooltip the part of a value that changed; wins over `config` and the global
   * configuration.
   */
  readonly highlightTooltipChanges = input<boolean>();

  /** Place of the titles in the tooltips; wins over `config` and the global configuration. */
  readonly tooltipTitleAlignment = input<DiffwiseAlignment>();

  /** Ignores differences in whitespace; wins over `config` and the global configuration. */
  readonly ignoreWhitespace = input<boolean>();

  /** Ignores differences in letter case; wins over `config` and the global configuration. */
  readonly ignoreCase = input<boolean>();

  /** Ignores changes of formatting alone; wins over `config` and the global configuration. */
  readonly ignoreFormatting = input<boolean>();

  /**
   * Ignores links added, removed or pointing elsewhere around the same text; wins over `config`
   * and the global configuration.
   */
  readonly ignoreLinkChanges = input<boolean>();

  /** Language of the interface; wins over `config` and the global configuration. */
  readonly language = input<DiffwiseLanguage>();

  /**
   * Texts shown instead of texts of the interface; each wins over the same text of `config` and
   * the global configuration, and `null` shows none of their texts.
   */
  readonly customTexts = input<DiffwiseCustomTexts | null>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly diffwise = inject(Diffwise);
  private readonly colorScheme = inject(ColorScheme);
  private readonly localeId = inject(LOCALE_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly idPrefix = nextIdPrefix();

  /** Id of the tooltip of this diff. */
  protected readonly tooltipId = this.idPrefix + TOOLTIP_ID_END;

  /** The one tooltip of this diff, for the icons of changes and versions, and the marked changes. */
  private readonly tooltip = viewChild.required(ChangeTooltip);

  /** True while the diff is inside an element that matches the dark mode marker of the app. */
  private readonly insideDarkMarker = signal(false);

  /** Options set by single inputs; an input left unset changes nothing. */
  private readonly inputOptions = computed<DiffwiseConfigOptions>(() => ({
    colorMode: this.colorMode(),
    darkModeSelector: this.darkModeSelector(),
    highlightStyle: this.highlightStyle(),
    diffIntensity: this.diffIntensity(),
    uiContrast: this.uiContrast(),
    diffColors: this.diffColors(),
    showLineNumbers: this.showLineNumbers(),
    lineNumberStyle: this.lineNumberStyle(),
    lineNumberAlignment: this.lineNumberAlignment(),
    highlightChangedLines: this.highlightChangedLines(),
    highlightWholeLines: this.highlightWholeLines(),
    dividerStyle: this.dividerStyle(),
    gapStyle: this.gapStyle(),
    versionHeaders: this.versionHeaders(),
    versionHeaderAlignment: this.versionHeaderAlignment(),
    fontFamily: this.fontFamily(),
    versionHeaderFontSize: this.versionHeaderFontSize(),
    lineNumberFontSize: this.lineNumberFontSize(),
    tooltipFontSize: this.tooltipFontSize(),
    changeDetails: this.changeDetails(),
    changeDetailsIconStyle: this.changeDetailsIconStyle(),
    tooltipColorMode: this.tooltipColorMode(),
    highlightTooltipChanges: this.highlightTooltipChanges(),
    tooltipTitleAlignment: this.tooltipTitleAlignment(),
    ignoreWhitespace: this.ignoreWhitespace(),
    ignoreCase: this.ignoreCase(),
    ignoreFormatting: this.ignoreFormatting(),
    ignoreLinkChanges: this.ignoreLinkChanges(),
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
      const { ignoreWhitespace, ignoreCase, ignoreFormatting, ignoreLinkChanges } =
        this.effectiveConfig();

      return { ignoreWhitespace, ignoreCase, ignoreFormatting, ignoreLinkChanges };
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

  /** Language of the interface; it also joins lists in the tooltips. */
  private readonly uiLanguage = computed(() =>
    resolveLanguage(this.effectiveConfig().language, this.localeId),
  );

  /** Texts of the interface in its language, with the custom texts of the app. */
  protected readonly texts = computed<UiTexts>(() => {
    const languageTexts = LANGUAGE_TEXTS[this.uiLanguage()];
    return { ...languageTexts, ...this.effectiveConfig().customTexts };
  });

  /** Describes changes besides text in the language of the interface. */
  protected readonly describer = computed(() => {
    const { highlightTooltipChanges } = this.effectiveConfig();
    return new ChangeDescriber(this.texts(), this.uiLanguage(), highlightTooltipChanges);
  });

  /** True when icons between the versions show the details of changes. */
  protected readonly showsChangeIcons = computed(
    () => this.effectiveConfig().changeDetails !== DiffwiseChangeDetails.Hover,
  );

  /** True when marked changes show their details on hover. */
  private readonly markersShowDetails = computed(
    () => this.effectiveConfig().changeDetails !== DiffwiseChangeDetails.Icon,
  );

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

  /** Colors of changes the app gives for the theme shown now. */
  private readonly customColors = computed(() => {
    const { diffColors } = this.effectiveConfig();
    const themeColors = this.isDark() ? diffColors.dark : diffColors.light;

    return themeColors ?? NO_COLORS;
  });

  /** Digits of the highest line number, which set the width of the line numbers. */
  private readonly lineNumberDigits = computed(() => String(highestLineNumber(this.rows())).length);

  /** Modifier classes of the options with values other than the defaults. */
  protected readonly modifierClasses = computed(() =>
    appearanceClasses(this.effectiveConfig(), this.customColors()),
  );

  /** Styles of the element: the width of the line numbers, and the app's sizes, font and colors. */
  protected readonly inlineStyles = computed(() =>
    appearanceStyles(this.effectiveConfig(), this.customColors(), this.lineNumberDigits()),
  );

  /**
   * Watches the dark mode marker of the app after rendering, when the diff is in the page, and
   * prepares the tooltips of change details.
   */
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

    afterRenderEffect(() => this.prepareMarkers());
    this.listenForTooltipTriggers();
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

  /**
   * After new rows, or with details in another place: hides the tooltip, whose trigger may be gone,
   * and lets marked changes take the focus when no icons show their details.
   */
  private prepareMarkers(): void {
    const rows = this.rows();
    const markersTakeFocus = !this.showsChangeIcons();

    untracked(() => this.tooltip().hide());

    if (!rows.some(hasChangeDetails)) {
      return;
    }

    for (const marker of this.host.nativeElement.querySelectorAll(FOCUSABLE_MARKER_SELECTOR)) {
      setFocusable(marker, markersTakeFocus);
    }
  }

  /**
   * Listens outside Angular's event bindings, since after each of them Angular checks every row,
   * and the pointer moves often. A tooltip shows on hover, and on focus from the keyboard.
   */
  private listenForTooltipTriggers(): void {
    const listeners = new AbortController();
    const element = this.host.nativeElement;
    const options = { signal: listeners.signal };

    element.addEventListener(MOUSEOVER_EVENT, (event) => this.showTooltipOnHover(event), options);
    element.addEventListener(
      MOUSEOUT_EVENT,
      (event) => this.tooltip().hideWhenPointerLeaves(event),
      options,
    );
    element.addEventListener(FOCUSIN_EVENT, (event) => this.showTooltipOnFocus(event), options);
    element.addEventListener(
      FOCUSOUT_EVENT,
      (event) => this.tooltip().hideWhenFocusLeaves(event),
      options,
    );
    this.destroyRef.onDestroy(() => listeners.abort());
  }

  private showTooltipOnHover({ target }: MouseEvent): void {
    const trigger = this.triggerOf(target);

    if (trigger !== null && !this.tooltip().isShownFor(trigger)) {
      this.showTooltip(trigger, false);
    }
  }

  /** Shows the tooltip of a trigger focused from the keyboard; a click focuses a button too. */
  private showTooltipOnFocus({ target }: FocusEvent): void {
    const trigger = this.triggerOf(target);

    if (trigger?.matches(FOCUS_VISIBLE_SELECTOR)) {
      this.showTooltip(trigger, true);
    }
  }

  private showTooltip(trigger: HTMLElement, byFocus: boolean): void {
    const request = this.tooltipRequest(trigger, byFocus);

    if (request !== null) {
      this.tooltip().show(request);
    }
  }

  /** The element with a tooltip at the target: an icon, or a marked change. */
  private triggerOf(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element) || this.tooltip().contains(target)) {
      return null;
    }

    const content = target.closest(CONTENT_SELECTOR);

    if (content !== null) {
      return this.markerOf(target, content);
    }

    const icon = target.closest<HTMLElement>(ICON_TRIGGER_SELECTOR);
    const isOwnIcon = icon !== null && this.host.nativeElement.contains(icon);

    return isOwnIcon ? icon : null;
  }

  /** The marker with change details at the target, when marked changes show them on hover. */
  private markerOf(target: Element, content: Element): HTMLElement | null {
    const marker = target.closest<HTMLElement>(DESCRIBED_MARKER_SELECTOR);
    const showsDetails = marker !== null && content.contains(marker) && this.markersShowDetails();

    return showsDetails ? marker : null;
  }

  /** What the tooltip of a trigger shows; `null` when there is nothing to show. */
  private tooltipRequest(trigger: HTMLElement, byFocus: boolean): TooltipRequest | null {
    if (trigger.matches(VERSION_HEADER_ICON_SELECTOR)) {
      return versionNameRequest(trigger, byFocus);
    }

    const details = this.detailsOf(trigger);

    if (details.length === 0) {
      return null;
    }

    const content = this.describer().tooltip(details);
    const isIcon = trigger.matches(CHANGE_DETAILS_ICON_SELECTOR);
    const description = isIcon ? TriggerDescription.Details : TriggerDescription.Whole;

    return { trigger, content, description, byFocus };
  }

  /** Changes a trigger shows: all changes of its row for an icon, the ones a marker points to. */
  private detailsOf(trigger: Element): readonly ChangeDetail[] {
    const rowDetails = this.rowOf(trigger)?.changeDetails ?? NO_CHANGE_DETAILS;
    const detailIndices = trigger.getAttribute(CHANGE_DETAILS_ATTRIBUTE);

    if (detailIndices === null) {
      return rowDetails;
    }

    const positions = detailIndices.split(DETAIL_INDEX_SEPARATOR).map(Number);

    return rowDetails.filter((_, position) => positions.includes(position));
  }

  /** The row of an element, by the position its row element carries. */
  private rowOf(element: Element): ShownRow | null {
    const position = element.closest(ROW_SELECTOR)?.getAttribute(ROW_INDEX_ATTRIBUTE) ?? null;

    if (position === null) {
      return null;
    }

    return this.rows().at(Number(position)) ?? null;
  }

  private shownRow({ kind, oldLine, newLine, changeDetails }: ViewRow): ShownRow {
    return {
      kind,
      oldLine: this.shownLine(oldLine),
      newLine: this.shownLine(newLine),
      changeDetails,
    };
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

/** The highest line number in the rows, of either version; `0` without lines. */
function highestLineNumber(rows: readonly ShownRow[]): number {
  return rows.reduce(
    (highest, { oldLine, newLine }) =>
      Math.max(highest, oldLine?.number ?? 0, newLine?.number ?? 0),
    0,
  );
}

/**
 * The tooltip of a version icon: the name of the version. The name also names the icon for screen
 * readers, so the tooltip does not describe the icon again.
 */
function versionNameRequest(icon: HTMLElement, byFocus: boolean): TooltipRequest | null {
  const versionName = icon.getAttribute(ARIA_LABEL_ATTRIBUTE);

  if (versionName === null) {
    return null;
  }

  const content = titleOnlyTooltip(versionName);

  return { trigger: icon, content, description: TriggerDescription.None, byFocus };
}

function hasChangeDetails(row: ShownRow): boolean {
  return row.changeDetails.length > 0;
}

/** Puts the element in the tab order, or takes it out. */
function setFocusable(element: Element, focusable: boolean): void {
  if (focusable) {
    element.setAttribute(TABINDEX_ATTRIBUTE, FOCUSABLE_IN_ORDER);
  } else {
    element.removeAttribute(TABINDEX_ATTRIBUTE);
  }
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
  const versionLabels = { old: texts.oldVersionLabel, new: texts.newVersionLabel };

  switch (versionHeaders) {
    case DiffwiseVersionHeaders.None:
      return null;
    case DiffwiseVersionHeaders.Default:
      return { texts: versionLabels, asIcons: false };
    case DiffwiseVersionHeaders.Icons:
      return { texts: versionLabels, asIcons: true };
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
