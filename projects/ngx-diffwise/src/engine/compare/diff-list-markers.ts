import { type DiffOptions, type Line, type ListMarker, ListType } from '../model';

/** True when the list items that the lines start differ: by their markers, or by their checkboxes. */
export function listItemsDiffer(oldLine: Line, newLine: Line, options: DiffOptions): boolean {
  return listMarkerChanged(oldLine, newLine, options) || checkboxChanged(oldLine, newLine);
}

/**
 * True when the markers of the list items that the lines start differ: by their look, such as
 * bullets that became numbers, or by their numbers. Numbers count also with `ignoreFormatting`, as
 * readers cite them; the look does not.
 */
export function listMarkerChanged(oldLine: Line, newLine: Line, options: DiffOptions): boolean {
  const lookChanged =
    !options.ignoreFormatting && markerLooksDiffer(oldLine.marker, newLine.marker);

  return lookChanged || itemNumberChanged(oldLine, newLine);
}

/**
 * True when both lines start items that show numbers, and the numbers differ, also when an item
 * added or removed before shifts them.
 */
export function itemNumberChanged(oldLine: Line, newLine: Line): boolean {
  const oldMarker = oldLine.marker;
  const newMarker = newLine.marker;
  const bothShowNumbers =
    oldMarker?.listType === ListType.Numbered && newMarker?.listType === ListType.Numbered;

  return bothShowNumbers && oldMarker.number !== newMarker.number;
}

/** True when a checkbox was checked or cleared; a checkbox in only one of the lines does not count. */
export function checkboxChanged(oldLine: Line, newLine: Line): boolean {
  const oldState = oldLine.checkbox;
  const newState = newLine.checkbox;

  return oldState !== null && newState !== null && oldState !== newState;
}

/**
 * True when the markers look different: another list type, style or level. A line without a
 * marker, such as a paragraph, against a list item counts too.
 */
function markerLooksDiffer(oldMarker: ListMarker | null, newMarker: ListMarker | null): boolean {
  if (oldMarker === null || newMarker === null) {
    return oldMarker !== newMarker;
  }

  return (
    oldMarker.listType !== newMarker.listType
    || oldMarker.style !== newMarker.style
    || oldMarker.level !== newMarker.level
  );
}
