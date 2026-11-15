import { DocumentVersion, LineChangeKind } from '../engine';
import { type UiTexts, withLineNumber } from './i18n/texts';

/** A line of the view as its description needs it. */
export interface DescribedLine {
  readonly kind: LineChangeKind;
  /** The version the line comes from; `null` for a merged line, with the text of both versions. */
  readonly version: DocumentVersion | null;
  /** Number of the line in its version; a merged line has the number of its new line. */
  readonly lineNumber: number;
}

/** Elements that take the focus by `Tab`, which a copy hidden from screen readers must not do. */
const FOCUSABLE_SELECTOR =
  'a[href], area[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]';

const TABINDEX_ATTRIBUTE = 'tabindex';

/** A `tabindex` that keeps an element focusable by a script and a click, but not by `Tab`. */
const OUT_OF_TAB_ORDER = '-1';

/**
 * What a screen reader says before a line: that it was removed, added or changed, and its number,
 * such as "Changed line 2, before". `null` for an unchanged line, which needs no description.
 */
export function lineDescription(line: DescribedLine, texts: UiTexts): string | null {
  const text = descriptionText(line, texts);

  return text === null ? null : withLineNumber(text, line.lineNumber);
}

/**
 * Takes the focusable elements of a copy hidden from screen readers out of the order of `Tab`, so
 * that the keyboard does not stop where a screen reader says nothing. Clicks still work.
 */
export function keepOutOfTabOrder(copy: Element): void {
  for (const element of copy.querySelectorAll(FOCUSABLE_SELECTOR)) {
    element.setAttribute(TABINDEX_ATTRIBUTE, OUT_OF_TAB_ORDER);
  }
}

function descriptionText({ kind, version }: DescribedLine, texts: UiTexts): string | null {
  switch (kind) {
    case LineChangeKind.Removed:
      return texts.removedLineLabel;
    case LineChangeKind.Added:
      return texts.addedLineLabel;
    case LineChangeKind.Changed:
      return changedLineText(version, texts);
    default:
      return null;
  }
}

function changedLineText(version: DocumentVersion | null, texts: UiTexts): string {
  if (version === null) {
    return texts.changedLineLabel;
  }

  return version === DocumentVersion.Old
    ? texts.changedLineBeforeLabel
    : texts.changedLineAfterLabel;
}
