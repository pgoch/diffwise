import { Injectable, PendingTasks, inject } from '@angular/core';

/** A diff that waits for its turn: where it stands on the page, and what starts its turn. */
interface WaitingDiff {
  readonly element: HTMLElement;
  readonly start: () => void;
}

/** Gives a turn back or leaves the queue; after the turn, it does nothing. */
export type LeaveQueue = () => void;

/** A group of diffs that drew their first rows within this time, in ms, lets the next group grow. */
const QUICK_GROUP_TIME = 50;

/** How many times larger the next group gets after a quick group, and smaller after a slow one. */
const GROUP_GROWTH = 2;

/** The size of the first group, and the least size of a group. */
const SMALLEST_GROUP_SIZE = 1;

/**
 * Gives the diffs of a page their turns to compare their versions and draw their first rows, a
 * group of diffs in each task, so a page with many diffs shows the first of them soon and stays
 * responsive. A diff alone gets its turn at once. Of the waiting diffs, those nearest the window
 * come next. A group grows while the turns stay quick and shrinks when they get slow, so small
 * diffs share their turns and large ones take theirs alone. The waiting counts as pending work of
 * the app, so `whenStable()` waits for every diff.
 */
@Injectable({ providedIn: 'root' })
export class DrawingQueue {
  private readonly pendingTasks = inject(PendingTasks);
  private readonly waiting = new Set<WaitingDiff>();

  /** The diffs whose turn it is, until they have drawn their first rows; none between turns. */
  private readonly current = new Set<WaitingDiff>();

  /** How many waiting diffs take the next turn together. */
  private groupSize = SMALLEST_GROUP_SIZE;

  /** When the current group got its turn, in ms of `performance.now()`. */
  private groupStart = 0;

  /** Ends the pending work of the queue; `null` while the queue has nothing to do. */
  private finishPendingWork: (() => void) | null = null;

  /**
   * Asks for the turn of a diff: at once when no other diff waits or takes its turn, or else in a
   * later task. Returns what gives the turn back or leaves the queue, such as when the diff goes.
   */
  requestTurn(element: HTMLElement, start: () => void): LeaveQueue {
    const diff: WaitingDiff = { element, start };

    if (this.current.size === 0 && this.waiting.size === 0) {
      this.give([diff]);
    } else {
      this.waiting.add(diff);
      this.holdPendingWork();
    }

    return () => this.leave(diff);
  }

  /**
   * Ends the turn of a diff that has drawn its first rows. Once its whole group has, the time the
   * group took sets the size of the next group, which starts in a new task.
   */
  finishTurn(element: HTMLElement): void {
    const diff = [...this.current].find((candidate) => candidate.element === element);

    if (diff === undefined) {
      return;
    }

    this.current.delete(diff);

    if (this.current.size > 0) {
      return;
    }

    this.groupSize = nextGroupSize(this.groupSize, performance.now() - this.groupStart);
    this.giveNextTurnLater();
  }

  private leave(diff: WaitingDiff): void {
    this.waiting.delete(diff);

    if (this.current.has(diff)) {
      this.finishTurn(diff.element);
      return;
    }

    this.releasePendingWorkWhenDone();
  }

  /** Gives the turn to a group of diffs, which start one after another in this task. */
  private give(diffs: readonly WaitingDiff[]): void {
    this.groupStart = performance.now();

    for (const diff of diffs) {
      this.current.add(diff);
    }

    this.holdPendingWork();

    for (const diff of diffs) {
      diff.start();
    }
  }

  /** Gives the turn to the waiting diffs nearest the window, in a task of their own. */
  private giveNextTurnLater(): void {
    if (this.waiting.size === 0) {
      this.releasePendingWorkWhenDone();
      return;
    }

    setTimeout(() => {
      if (this.current.size > 0 || this.waiting.size === 0) {
        this.releasePendingWorkWhenDone();
        return;
      }

      const next = nearestToWindow(this.waiting, this.groupSize);

      for (const diff of next) {
        this.waiting.delete(diff);
      }

      this.give(next);
    });
  }

  private holdPendingWork(): void {
    this.finishPendingWork ??= this.pendingTasks.add();
  }

  /**
   * Ends the pending work once no diff waits or takes its turn. The next diffs, such as those of
   * another page of the app, start again from a group of one.
   */
  private releasePendingWorkWhenDone(): void {
    if (this.current.size > 0 || this.waiting.size > 0) {
      return;
    }

    this.groupSize = SMALLEST_GROUP_SIZE;
    this.finishPendingWork?.();
    this.finishPendingWork = null;
  }
}

/** The size of the group after one that took `groupTime` ms: larger when quick, else smaller. */
function nextGroupSize(groupSize: number, groupTime: number): number {
  if (groupTime < QUICK_GROUP_TIME) {
    return groupSize * GROUP_GROWTH;
  }

  return Math.max(SMALLEST_GROUP_SIZE, Math.floor(groupSize / GROUP_GROWTH));
}

/** The diffs nearest the window, those in it first, at most `count` of them. */
function nearestToWindow(diffs: ReadonlySet<WaitingDiff>, count: number): WaitingDiff[] {
  return [...diffs]
    .map((diff) => ({ diff, distance: distanceToWindow(diff.element) }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, count)
    .map(({ diff }) => diff);
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
