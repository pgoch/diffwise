import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import {
  type TooltipContent,
  TooltipHighlight,
  TooltipLineKind,
  TooltipPartKind,
  titleOnlyTooltip,
} from './tooltip-content';

/** What of the tooltip describes its trigger for screen readers. */
export const TriggerDescription = {
  /** Nothing: the name of the trigger says all, as the name of a version icon does. */
  None: 'none',
  /** The lines under the title, since the name of the trigger is the title already. */
  Details: 'details',
  /** The whole tooltip, for a marked change, which has no name of its own. */
  Whole: 'whole',
} as const;

export type TriggerDescription = (typeof TriggerDescription)[keyof typeof TriggerDescription];

/** A tooltip to show by its trigger. */
export interface TooltipRequest {
  /** The element the tooltip belongs to, such as the icon of a row. */
  readonly trigger: HTMLElement;
  readonly content: TooltipContent;
  readonly description: TriggerDescription;
  /** True when the trigger got the focus; the tooltip then stays until the focus leaves. */
  readonly byFocus: boolean;
}

/** Space between the tooltip and its trigger, in px; the tooltip covers it for the pointer. */
const TRIGGER_GAP = 8;

/** Least space between the tooltip and the edges of the window, in px. */
const WINDOW_MARGIN = 8;

/** Content before the tooltip first shows. */
const NO_CONTENT = titleOnlyTooltip('');

const DETAILS_ID_END = '-details';
const DESCRIBED_BY_ATTRIBUTE = 'aria-describedby';
const ESCAPE_KEY = 'Escape';
const KEYDOWN_EVENT = 'keydown';
const SCROLL_EVENT = 'scroll';
const PIXEL_UNIT = 'px';
const FUNCTION_TYPE = 'function';

const HIGHLIGHT_CLASS = 'diffwise-diff__tooltip-highlight';

/** Classes of a highlighted part of a value, by the change it shows. */
const HIGHLIGHT_CLASSES: Readonly<Record<TooltipHighlight, string>> = {
  [TooltipHighlight.Removed]: `${HIGHLIGHT_CLASS} ${HIGHLIGHT_CLASS}--removed`,
  [TooltipHighlight.Added]: `${HIGHLIGHT_CLASS} ${HIGHLIGHT_CLASS}--added`,
};

/** Classes of the lines of the tooltip. */
const LINE_CLASSES: Readonly<Record<TooltipLineKind, string>> = {
  [TooltipLineKind.Subtitle]: 'diffwise-diff__tooltip-subtitle',
  [TooltipLineKind.Description]: 'diffwise-diff__tooltip-description',
  [TooltipLineKind.Row]: 'diffwise-diff__tooltip-row',
};

/**
 * The one tooltip of a diff, in the top layer of the page, so no `overflow` of the app cuts it.
 * The pointer can move onto it, and Escape hides it (WCAG 1.4.13).
 */
@Component({
  selector: 'diffwise-change-tooltip',
  templateUrl: './change-tooltip.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'diffwise-diff__tooltip',
    popover: 'manual',
    role: 'tooltip',
    '[id]': 'tooltipId()',
  },
})
export class ChangeTooltip {
  /** Id of the tooltip; a trigger without a name of its own points to it. */
  readonly tooltipId = input.required<string>();

  /** Id of the lines under the title; an icon named by the title points to them. */
  protected readonly detailsId = computed(() => this.tooltipId() + DETAILS_ID_END);

  protected readonly content = signal<TooltipContent>(NO_CONTENT);
  protected readonly lineClasses = LINE_CLASSES;
  protected readonly highlights = HIGHLIGHT_CLASSES;
  protected readonly partKinds = TooltipPartKind;

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly changeDetector = inject(ChangeDetectorRef);

  /** The tooltip shown now, or `null`. */
  private shown: TooltipRequest | null = null;

  /** Listens to the page while the tooltip shows: Escape and scrolling hide it. */
  private pageListeners: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  /** True while the tooltip shows for the trigger. */
  isShownFor(trigger: Element): boolean {
    return this.shown?.trigger === trigger;
  }

  /** True for the tooltip and everything in it. */
  contains(node: Node): boolean {
    return this.element.contains(node);
  }

  /** Shows the content under the trigger, or above it when the window has no room below. */
  show(request: TooltipRequest): void {
    if (this.shown !== null) {
      forgetDescription(this.shown);
    }

    this.shown = request;
    this.content.set(request.content);
    this.changeDetector.detectChanges();
    this.describe(request);
    this.open();
    this.placeBy(request.trigger);
  }

  hide(): void {
    if (this.shown === null) {
      return;
    }

    forgetDescription(this.shown);
    this.shown = null;
    this.close();
  }

  /** Hides a tooltip shown on hover when the pointer leaves both its trigger and the tooltip. */
  hideWhenPointerLeaves({ target, relatedTarget }: MouseEvent): void {
    const shown = this.shown;

    if (shown === null || shown.byFocus) {
      return;
    }

    const leavesShown = this.isTriggerOrTooltip(shown, target);
    const entersShown = this.isTriggerOrTooltip(shown, relatedTarget);

    if (leavesShown && !entersShown) {
      this.hide();
    }
  }

  /** Hides a tooltip shown on focus when the focus leaves its trigger. */
  hideWhenFocusLeaves({ target }: FocusEvent): void {
    const shown = this.shown;

    if (shown?.byFocus && target === shown.trigger) {
      this.hide();
    }
  }

  /** True for a node in the trigger or in the tooltip. */
  private isTriggerOrTooltip({ trigger }: TooltipRequest, node: EventTarget | null): boolean {
    return node instanceof Node && (trigger.contains(node) || this.contains(node));
  }

  /** Points the trigger to its description in the tooltip, for screen readers. */
  private describe({ trigger, description }: TooltipRequest): void {
    switch (description) {
      case TriggerDescription.Details:
        trigger.setAttribute(DESCRIBED_BY_ATTRIBUTE, this.detailsId());
        break;
      case TriggerDescription.Whole:
        trigger.setAttribute(DESCRIBED_BY_ATTRIBUTE, this.tooltipId());
        break;
      case TriggerDescription.None:
        break;
    }
  }

  /** Shows the tooltip in the top layer and starts listening to the page. */
  private open(): void {
    if (this.pageListeners !== null) {
      return;
    }

    this.pageListeners = new AbortController();

    const page = this.element.ownerDocument;
    const { signal } = this.pageListeners;

    page.addEventListener(KEYDOWN_EVENT, (event) => this.hideOnEscape(event), { signal });
    page.addEventListener(SCROLL_EVENT, () => this.hide(), {
      capture: true,
      passive: true,
      signal,
    });

    if (supportsPopover(this.element)) {
      this.element.showPopover();
    }
  }

  private close(): void {
    this.pageListeners?.abort();
    this.pageListeners = null;

    if (supportsPopover(this.element)) {
      this.element.hidePopover();
    }
  }

  private hideOnEscape(event: KeyboardEvent): void {
    if (event.key === ESCAPE_KEY) {
      this.hide();
    }
  }

  /** Centers the tooltip under the trigger, or above it, inside the window. */
  private placeBy(trigger: Element): void {
    const triggerBox = trigger.getBoundingClientRect();
    const viewport = this.element.ownerDocument.documentElement;
    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;
    const centeredLeft = triggerBox.left + (triggerBox.width - width) / 2;
    const maxLeft = viewport.clientWidth - width - WINDOW_MARGIN;
    const left = Math.max(WINDOW_MARGIN, Math.min(centeredLeft, maxLeft));
    const topBelow = triggerBox.bottom + TRIGGER_GAP;
    const topAbove = triggerBox.top - height - TRIGGER_GAP;
    const fitsBelow = topBelow + height <= viewport.clientHeight - WINDOW_MARGIN;
    const top = fitsBelow ? topBelow : topAbove;

    this.element.style.left = left + PIXEL_UNIT;
    this.element.style.top = top + PIXEL_UNIT;
  }
}

/** Takes back the description the tooltip gave its trigger. */
function forgetDescription({ trigger, description }: TooltipRequest): void {
  if (description !== TriggerDescription.None) {
    trigger.removeAttribute(DESCRIBED_BY_ATTRIBUTE);
  }
}

/** True in browsers; test environments, such as jsdom, have no Popover API. */
function supportsPopover(element: HTMLElement): boolean {
  return typeof element.showPopover === FUNCTION_TYPE;
}
