import { type DestroyRef, type Signal, computed, signal } from '@angular/core';

/**
 * The width of an element in pixels, with its borders, as a signal that follows its size. It is
 * `null` while the element has no width, and where sizes cannot be watched, such as on a server.
 */
export function observedWidth(element: HTMLElement, destroyRef: DestroyRef): Signal<number | null> {
  const reportedWidth = signal<number | null>(null);

  if (globalThis.ResizeObserver === undefined) {
    return reportedWidth.asReadonly();
  }

  const observer = new ResizeObserver(() => reportedWidth.set(measuredWidth(element)));

  observer.observe(element);
  destroyRef.onDestroy(() => observer.disconnect());

  return computed(() => reportedWidth() ?? measuredWidth(element));
}

/** The width the element has now; `null` without one, such as in a hidden part of the page. */
function measuredWidth(element: HTMLElement): number | null {
  const width = element.offsetWidth;
  return width > 0 ? width : null;
}
