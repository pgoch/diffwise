import { TestBed } from '@angular/core/testing';

import { DrawingQueue } from './drawing-queue';

const DIFF_TAG = 'div';
const DIFF_HEIGHT = 100;

/** Where the waiting diffs stand: below the window of jsdom, which is 768 px high. */
const NEAR_TOP = 800;
const FAR_TOP = 5000;

/** Times a group of diffs takes for its turn, in ms: quick enough for a larger next group, or not. */
const QUICK_TURN = 10;
const SLOW_TURN = 60;

/** The time of `performance.now()` in the tests, in ms; it moves only by the time the tests add. */
let now = 0;

/** A diff element whose top stands at the given place; jsdom lays out nothing. */
function diffAt(top: number): HTMLElement {
  const element = document.createElement(DIFF_TAG);

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: top, width: DIFF_HEIGHT, height: DIFF_HEIGHT }),
  );

  return element;
}

/** Diff elements one under another, from the nearest to the window. */
function diffsInOrder(count: number): HTMLElement[] {
  return Array.from({ length: count }, (_, index) => diffAt(NEAR_TOP + index * DIFF_HEIGHT));
}

/** Ends the turns of the diffs after the time they took, and runs the task of the next turn. */
async function finishTurns(
  queue: DrawingQueue,
  diffs: readonly HTMLElement[],
  time: number,
): Promise<void> {
  now += time;

  for (const diff of diffs) {
    queue.finishTurn(diff);
  }

  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  now = 0;
  vi.useFakeTimers();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DrawingQueue', () => {
  it('gives a diff alone its turn at once', () => {
    const queue = TestBed.inject(DrawingQueue);
    const start = vi.fn();

    queue.requestTurn(diffAt(0), start);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('gives the next diff its turn in a later task, after the diff before has drawn its first rows', async () => {
    const queue = TestBed.inject(DrawingQueue);
    const first = diffAt(0);
    const startSecond = vi.fn();

    queue.requestTurn(first, vi.fn());
    queue.requestTurn(diffAt(NEAR_TOP), startSecond);
    await vi.advanceTimersByTimeAsync(0);

    expect(startSecond).not.toHaveBeenCalled();

    queue.finishTurn(first);

    expect(startSecond).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(0);

    expect(startSecond).toHaveBeenCalledTimes(1);
  });

  it('gives the turn to the waiting diff nearest the window first', async () => {
    const queue = TestBed.inject(DrawingQueue);
    const first = diffAt(0);
    const starts: string[] = [];

    queue.requestTurn(first, () => starts.push('first'));
    queue.requestTurn(diffAt(FAR_TOP), () => starts.push('far'));
    queue.requestTurn(diffAt(NEAR_TOP), () => starts.push('near'));
    await finishTurns(queue, [first], SLOW_TURN);

    expect(starts).toEqual(['first', 'near']);
  });

  it('gives the next turn to twice as many diffs after a quick turn, and to half as many after a slow one', async () => {
    const queue = TestBed.inject(DrawingQueue);
    const diffs = diffsInOrder(11);
    const started: HTMLElement[] = [];

    for (const diff of diffs) {
      queue.requestTurn(diff, () => started.push(diff));
    }

    expect(started).toEqual(diffs.slice(0, 1));

    await finishTurns(queue, diffs.slice(0, 1), QUICK_TURN);

    expect(started).toEqual(diffs.slice(0, 3));

    await finishTurns(queue, diffs.slice(1, 3), QUICK_TURN);

    expect(started).toEqual(diffs.slice(0, 7));

    await finishTurns(queue, diffs.slice(3, 7), SLOW_TURN);

    expect(started).toEqual(diffs.slice(0, 9));
  });

  it('starts again from one diff in a turn once no diff waits', async () => {
    const queue = TestBed.inject(DrawingQueue);
    const firstPage = diffsInOrder(3);
    const secondPage = diffsInOrder(3);
    const started: HTMLElement[] = [];

    for (const diff of firstPage) {
      queue.requestTurn(diff, () => started.push(diff));
    }

    await finishTurns(queue, firstPage.slice(0, 1), QUICK_TURN);
    await finishTurns(queue, firstPage.slice(1), QUICK_TURN);

    for (const diff of secondPage) {
      queue.requestTurn(diff, () => started.push(diff));
    }

    await finishTurns(queue, secondPage.slice(0, 1), SLOW_TURN);

    expect(started).toEqual([...firstPage, ...secondPage.slice(0, 2)]);
  });

  it('passes over a diff that leaves the queue, and goes on when the diff with its turn goes', async () => {
    const queue = TestBed.inject(DrawingQueue);
    const startLeaving = vi.fn();
    const startLast = vi.fn();
    const leaveFirst = queue.requestTurn(diffAt(0), vi.fn());
    const leaveSecond = queue.requestTurn(diffAt(NEAR_TOP), startLeaving);

    queue.requestTurn(diffAt(FAR_TOP), startLast);
    leaveSecond();
    leaveFirst();
    await vi.advanceTimersByTimeAsync(0);

    expect(startLeaving).not.toHaveBeenCalled();
    expect(startLast).toHaveBeenCalledTimes(1);
  });
});
