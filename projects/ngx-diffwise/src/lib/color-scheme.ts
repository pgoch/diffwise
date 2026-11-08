import { DOCUMENT, DestroyRef, Injectable, inject, signal } from '@angular/core';

import { DiffwiseColorMode } from './config/option-values';

/** Matches while the system uses a dark color scheme. */
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const CHANGE_EVENT = 'change';

/** Reports changes of attributes only, such as a class added to `<html>`. */
const ATTRIBUTE_CHANGES: MutationObserverInit = { attributes: true };

/** Follows the color scheme of the system and the dark mode marker of the app. */
@Injectable({ providedIn: 'root' })
export class ColorScheme {
  private readonly document = inject(DOCUMENT);
  private readonly darkSchemeQuery = this.document.defaultView?.matchMedia?.(DARK_SCHEME_QUERY);
  private readonly systemDark = signal(this.darkSchemeQuery?.matches ?? false);

  /** True while the system uses a dark color scheme; false where the browser cannot tell. */
  readonly systemPrefersDark = this.systemDark.asReadonly();

  constructor() {
    const query = this.darkSchemeQuery;

    if (query === undefined) {
      return;
    }

    const update = () => this.systemDark.set(query.matches);

    query.addEventListener(CHANGE_EVENT, update);
    inject(DestroyRef).onDestroy(() => query.removeEventListener(CHANGE_EVENT, update));
  }

  /**
   * True when the automatic mode is dark now: by the system, or by the dark mode marker of the
   * app on `<body>` or `<html>`.
   */
  autoModeIsDark(darkModeSelector: string | null): boolean {
    if (darkModeSelector === null) {
      return this.systemPrefersDark();
    }

    return this.document.body.closest(darkModeSelector) !== null;
  }
}

/** True for the dark mode, and for the automatic one when `autoModeIsDark()` says so. */
export function isDarkColorMode(
  colorMode: DiffwiseColorMode,
  autoModeIsDark: () => boolean,
): boolean {
  switch (colorMode) {
    case DiffwiseColorMode.Dark:
      return true;
    case DiffwiseColorMode.Light:
      return false;
    case DiffwiseColorMode.Auto:
      return autoModeIsDark();
  }
}

/**
 * Tells whether the element is inside an element that matches the selector, such as `.dark` on
 * `<html>`: now and after each attribute change on the way up. Returns a function that stops it.
 */
export function watchDarkMarker(
  element: Element,
  selector: string,
  onChange: (isInside: boolean) => void,
): () => void {
  const check = () => onChange(element.closest(selector) !== null);
  const observer = new MutationObserver(check);

  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    observer.observe(node, ATTRIBUTE_CHANGES);
  }

  check();

  return () => observer.disconnect();
}
