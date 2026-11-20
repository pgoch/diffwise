import { Injectable, PendingTasks, inject } from '@angular/core';

/** A diff that waits for its turn: where it stands on the page, and what starts its turn. */
interface WaitingDiff {
  readonly element: HTMLElement;
  readonly start: () => void;
}

/** Gives a turn back or leaves the queue; after the turn, it does nothing. */
export type LeaveQueue = () => void;

/**
 * Gives the diffs of a page their turns to compare their versions and draw their first rows, one
 * diff in each task, so a page with many diffs shows the first of them soon and stays responsive.
 * A diff alone gets its turn at once. Of the waiting diffs, the one nearest the window comes next.
 * The waiting counts as pending work of the app, so `whenStable()` waits for every diff.
 */
@Injectable({ providedIn: 'root' })
export class DrawingQueue {
  private readonly pendingTasks = inject(PendingTasks);
  private readonly waiting = new Set<WaitingDiff>();

  /** The diff whose turn it is, until it has drawn its first rows; `null` between turns. */
  private current: WaitingDiff | null = null;

  /** Ends the pending work of the queue; `null` while the queue has nothing to do. */
  private finishPendingWork: (() => void) | null = null;

  /**
   * Asks for the turn of a diff: at once when no other diff waits or takes its turn, or else in a
   * later task. Returns what gives the turn back or leaves the queue, such as when the diff goes.
   */
  requestTurn(element: HTMLElement, start: () => void): LeaveQueue {
    const diff: WaitingDiff = { element, start };

    if (this.current === null && this.waiting.size === 0) {
      this.give(diff);
    } else {
      this.waiting.add(diff);
      this.holdPendingWork();
    }

    return () => this.leave(diff);
  }

  /** Ends the turn of a diff that has drawn its first rows; the next diff starts in a new task. */
  finishTurn(element: HTMLElement): void {
    if (this.current?.element !== element) {
      return;
    }

    this.current = null;
    this.giveNextTurnLater();
  }

  private leave(diff: WaitingDiff): void {
    this.waiting.delete(diff);

    if (this.current === diff) {
      this.finishTurn(diff.element);
      return;
    }

    this.releasePendingWorkWhenDone();
  }

  private give(diff: WaitingDiff): void {
    this.current = diff;
    this.holdPendingWork();
    diff.start();
  }

  /** Gives the turn to the waiting diff nearest the window, in a task of its own. */
  private giveNextTurnLater(): void {
    if (this.waiting.size === 0) {
      this.releasePendingWorkWhenDone();
      return;
    }

    setTimeout(() => {
      const next = nearestToWindow(this.waiting);

      if (this.current !== null || next === null) {
        this.releasePendingWorkWhenDone();
        return;
      }

      this.waiting.delete(next);
      this.give(next);
    });
  }

  private holdPendingWork(): void {
    this.finishPendingWork ??= this.pendingTasks.add();
  }

  private releasePendingWorkWhenDone(): void {
    if (this.current !== null || this.waiting.size > 0) {
      return;
    }

    this.finishPendingWork?.();
    this.finishPendingWork = null;
  }
}

/** The diff nearest the window, one in it first; `null` without diffs. */
function nearestToWindow(diffs: ReadonlySet<WaitingDiff>): WaitingDiff | null {
  let nearest: WaitingDiff | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const diff of diffs) {
    const distance = distanceToWindow(diff.element);

    if (distance < nearestDistance) {
      nearest = diff;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/** How far an element stands from the window, in pixels; `0` when any part of it is in the window. */
function distanceToWindow(element: HTMLElement): number {
  const { top, bottom } = element.getBoundingClientRect();
  const windowHeight = element.ownerDocument.defaultView?.innerHeight ?? 0;

  if (bottom < 0) {
    return -bottom;
  }

  return Math.max(0, top - windowHeight);
}
