import { TestBed } from '@angular/core/testing';

import { DrawingQueue } from './drawing-queue';

const DIFF_TAG = 'div';
const DIFF_HEIGHT = 100;

/** Where the waiting diffs stand: below the window of jsdom, which is 768 px high. */
const NEAR_TOP = 800;
const FAR_TOP = 5000;

/** A diff element whose top stands at the given place; jsdom lays out nothing. */
function diffAt(top: number): HTMLElement {
  const element = document.createElement(DIFF_TAG);

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: top, width: DIFF_HEIGHT, height: DIFF_HEIGHT }),
  );

  return element;
}

beforeEach(() => {
  vi.useFakeTimers();
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
    queue.finishTurn(first);
    await vi.advanceTimersByTimeAsync(0);

    expect(starts).toEqual(['first', 'near']);
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
