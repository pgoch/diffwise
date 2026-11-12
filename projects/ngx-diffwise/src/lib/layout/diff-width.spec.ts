import { DestroyRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { observedWidth } from './diff-width';

const RESIZE_OBSERVER = 'ResizeObserver';
const OFFSET_WIDTH = 'offsetWidth';
const DIV_TAG = 'div';

/** Stands in for the observer of the browser, which jsdom lacks; a test reports the resizes. */
class FakeResizeObserver {
  static readonly watching = new Set<FakeResizeObserver>();

  constructor(private readonly report: () => void) {}

  observe(): void {
    FakeResizeObserver.watching.add(this);
  }

  disconnect(): void {
    FakeResizeObserver.watching.delete(this);
  }

  static reportResize(): void {
    for (const observer of FakeResizeObserver.watching) {
      observer.report();
    }
  }
}

/** Gives the element a width, which jsdom does not lay out. */
function setWidth(element: HTMLElement, width: number): void {
  Object.defineProperty(element, OFFSET_WIDTH, { configurable: true, value: width });
}

function resize(element: HTMLElement, width: number): void {
  setWidth(element, width);
  FakeResizeObserver.reportResize();
}

describe('observedWidth', () => {
  let element: HTMLElement;
  let destroyRef: DestroyRef;

  beforeEach(() => {
    vi.stubGlobal(RESIZE_OBSERVER, FakeResizeObserver);
    element = document.createElement(DIV_TAG);
    destroyRef = TestBed.inject(Injector).get(DestroyRef);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.watching.clear();
  });

  it('gives the width the element has when it is first read', () => {
    const width = observedWidth(element, destroyRef);

    setWidth(element, 640);

    expect(width()).toBe(640);
  });

  it('follows the width of the element', () => {
    const width = observedWidth(element, destroyRef);

    resize(element, 900);

    expect(width()).toBe(900);

    resize(element, 480);

    expect(width()).toBe(480);
  });

  it('gives null for an element without a width, such as a hidden one', () => {
    const width = observedWidth(element, destroyRef);

    expect(width()).toBeNull();

    resize(element, 0);

    expect(width()).toBeNull();
  });

  it('gives null where sizes cannot be watched, such as on a server', () => {
    vi.stubGlobal(RESIZE_OBSERVER, undefined);
    setWidth(element, 640);

    expect(observedWidth(element, destroyRef)()).toBeNull();
  });

  it('stops watching the element when its owner is destroyed', () => {
    observedWidth(element, destroyRef);

    expect(FakeResizeObserver.watching.size).toBe(1);

    TestBed.resetTestingModule();

    expect(FakeResizeObserver.watching.size).toBe(0);
  });
});
