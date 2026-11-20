import { type Signal, type WritableSignal, computed, linkedSignal } from '@angular/core';

import type { ChangeBlock } from '../../engine';

const NEXT_STEP = 1;
const PREVIOUS_STEP = -1;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SMOOTH_SCROLL: ScrollBehavior = 'smooth';
const INSTANT_SCROLL: ScrollBehavior = 'auto';
const TO_MIDDLE: ScrollLogicalPosition = 'center';
const TO_TOP: ScrollLogicalPosition = 'start';
const PIXEL_UNIT = 'px';
const STICKY_POSITION = 'sticky';
const NO_STYLE = '';

/**
 * Frames after a jump in which the scroll follows rows that take their real heights: at most so
 * many, and until the rows have stayed in place for a few frames, since they grow a frame or two
 * after they come near.
 */
const MAX_FRAMES_TO_SETTLE = 12;
const SETTLED_FRAMES = 3;

/**
 * The block of changes the user has stepped to. Steps go around: after the last block comes the
 * first, and before the first the last. A new comparison starts again before the first step.
 */
export class ChangeNavigation {
  /** Position of the active block among the blocks; `null` before the first step. */
  private readonly activePosition: WritableSignal<number | null>;

  /** Position of the active block among the blocks; `null` before the first step. */
  readonly position: Signal<number | null>;

  /** The active block; `null` before the first step. */
  readonly activeBlock: Signal<ChangeBlock | null>;

  /**
   * Steps between `blocks`, from the first step after each change of `comparison`, which reads
   * what starts a comparison.
   */
  constructor(
    readonly blocks: Signal<readonly ChangeBlock[]>,
    comparison: () => unknown,
  ) {
    this.activePosition = linkedSignal<unknown, number | null>({
      source: comparison,
      computation: () => null,
    });
    this.position = computed(() => {
      const position = this.activePosition();
      const isInBlocks = position !== null && position < this.blocks().length;

      return isInBlocks ? position : null;
    });
    this.activeBlock = computed(() => {
      const position = this.position();
      return position === null ? null : this.blocks()[position];
    });
  }

  /** Steps to the next block: the first one before any step, or after the last one. */
  goToNext(): void {
    this.step(NEXT_STEP);
  }

  /** Steps to the previous block: the last one before any step, or before the first one. */
  goToPrevious(): void {
    this.step(PREVIOUS_STEP);
  }

  /** Moves the active block by the step, when there are blocks. */
  private step(step: number): void {
    const count = this.blocks().length;

    if (count === 0) {
      return;
    }

    this.activePosition.set(steppedPosition(this.position(), step, count));
  }
}

/** The position one step away, going around the ends; the first step goes to an end. */
function steppedPosition(position: number | null, step: number, count: number): number {
  if (position === null) {
    return step > 0 ? 0 : count - 1;
  }

  return (position + step + count) % count;
}

/**
 * Scrolls the rows from `first` to `last` into view: to the middle of the window, or to its top
 * when they are taller than the window. The toolbar, which sticks to the top, does not cover them.
 *
 * The scroll is smooth within about a window from the rows, unless the system asks for less motion.
 * Farther, it jumps, and follows the rows until they stay in place: rows far from the screen skip
 * their layout and take their real heights only as they come near, which moves the rows after them.
 */
export function scrollRowsIntoView(
  first: HTMLElement,
  last: HTMLElement,
  toolbar: Element | null,
): void {
  const firstTop = first.getBoundingClientRect().top;
  const blockBottom = last.getBoundingClientRect().bottom;
  const distance = Math.max(firstTop - window.innerHeight, -blockBottom, 0);
  const behavior = scrollBehavior(distance);

  scrollOnce(first, last, toolbar, behavior);

  if (behavior === INSTANT_SCROLL) {
    followUntilSettled(first, () => scrollOnce(first, last, toolbar, INSTANT_SCROLL));
  }
}

/** One scroll to the rows, with the scroll margins that place them, taken off right after. */
function scrollOnce(
  first: HTMLElement,
  last: HTMLElement,
  toolbar: Element | null,
  behavior: ScrollBehavior,
): void {
  if (!first.isConnected || !last.isConnected) {
    return;
  }

  const firstBox = first.getBoundingClientRect();
  const blockBottom = last.getBoundingClientRect().bottom;
  const coveredTop = toolbar === null ? 0 : coveredHeight(toolbar);
  const fitsInWindow = blockBottom - firstBox.top <= window.innerHeight - coveredTop;
  const rowsBelowMargin = blockBottom - firstBox.bottom + PIXEL_UNIT;
  const block = fitsInWindow ? TO_MIDDLE : TO_TOP;

  first.style.scrollMarginTop = coveredTop + PIXEL_UNIT;
  first.style.scrollMarginBottom = fitsInWindow ? rowsBelowMargin : NO_STYLE;
  first.scrollIntoView({ block, behavior });
  first.style.scrollMarginTop = NO_STYLE;
  first.style.scrollMarginBottom = NO_STYLE;
}

/**
 * Calls `follow` in each of the next animation frames in which `row` has moved, until it stays in
 * place for `SETTLED_FRAMES` frames, or for at most `framesLeft` frames.
 */
function followUntilSettled(
  row: HTMLElement,
  follow: () => void,
  framesLeft = MAX_FRAMES_TO_SETTLE,
  stillFrames = 0,
): void {
  const top = row.getBoundingClientRect().top;

  if (framesLeft === 0 || stillFrames === SETTLED_FRAMES) {
    return;
  }

  requestAnimationFrame(() => {
    const hasMoved = row.getBoundingClientRect().top !== top;
    const nextStillFrames = hasMoved ? 0 : stillFrames + 1;

    if (hasMoved) {
      follow();
    }

    followUntilSettled(row, follow, framesLeft - 1, nextStillFrames);
  });
}

/**
 * How far down the toolbar covers the scrolled area: its offset from the top, such as the height of
 * a sticky header of the app, and its own height while it sticks. In a low window it scrolls with
 * the diff and covers nothing.
 */
function coveredHeight(toolbar: Element): number {
  const { top, position } = getComputedStyle(toolbar);
  const offset = Number.parseFloat(top) || 0;
  const stickingHeight = position === STICKY_POSITION ? toolbar.getBoundingClientRect().height : 0;

  return offset + stickingHeight;
}

/**
 * Smooth over a short way, at most a window beyond the window. Over a longer one, the scroll jumps:
 * rows far from the screen skip their layout and take their real heights only as they come near,
 * so a smooth scroll past many of them would stop short of the target.
 */
function scrollBehavior(distance: number): ScrollBehavior {
  const reducesMotion = globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
  const isShortWay = distance <= window.innerHeight;

  return isShortWay && !reducesMotion ? SMOOTH_SCROLL : INSTANT_SCROLL;
}
