import {
  type CheckboxChangeDetail,
  ChangeDetailKind,
  type DiffOptions,
  type Line,
  type ListItemChangeDetail,
  type ListMarker,
  type ListMarkerChangeDetail,
  ListMarkerProperty,
  ListType,
} from '../model';

const MARKER_PROPERTIES = Object.values(ListMarkerProperty);
const NO_PROPERTIES: readonly ListMarkerProperty[] = [];
const ONLY_LIST_TYPE: readonly ListMarkerProperty[] = [ListMarkerProperty.ListType];

/** Whether each property of a marker counts as changed. */
type MarkerDifferences = Readonly<Record<ListMarkerProperty, boolean>>;

/**
 * Compares the list markers and the checkboxes of a line pair, matched by their text: the marker
 * first, then the checkbox. With `ignoreFormatting`, only numbers and checkboxes count.
 */
export function diffListMarkers(
  oldLine: Line,
  newLine: Line,
  options: DiffOptions,
): ListItemChangeDetail[] {
  const details: ListItemChangeDetail[] = [];
  const markerChange = listMarkerChange(oldLine.marker, newLine.marker, options);
  const checkboxChange = checkboxChangeOf(oldLine, newLine);

  if (markerChange !== null) {
    details.push(markerChange);
  }

  if (checkboxChange !== null) {
    details.push(checkboxChange);
  }

  return details;
}

function listMarkerChange(
  oldMarker: ListMarker | null,
  newMarker: ListMarker | null,
  options: DiffOptions,
): ListMarkerChangeDetail | null {
  const changedProperties = changedMarkerProperties(oldMarker, newMarker, options);

  if (changedProperties.length === 0) {
    return null;
  }

  return { kind: ChangeDetailKind.ListMarker, oldMarker, newMarker, changedProperties };
}

/**
 * Properties that differ, in the order of `ListMarkerProperty`. A line without a marker, such as
 * a paragraph, against a list item is another list type.
 */
function changedMarkerProperties(
  oldMarker: ListMarker | null,
  newMarker: ListMarker | null,
  options: DiffOptions,
): readonly ListMarkerProperty[] {
  if (oldMarker === null || newMarker === null) {
    const onlyOneHasMarker = oldMarker !== newMarker && !options.ignoreFormatting;
    return onlyOneHasMarker ? ONLY_LIST_TYPE : NO_PROPERTIES;
  }

  const differences = markerDifferences(oldMarker, newMarker, options);

  return MARKER_PROPERTIES.filter((property) => differences[property]);
}

/**
 * Which properties count as changed. Another list type or level explains another style, such as
 * the circles of a nested list, so only the cause counts.
 */
function markerDifferences(
  oldMarker: ListMarker,
  newMarker: ListMarker,
  { ignoreFormatting }: DiffOptions,
): MarkerDifferences {
  const lookCounts = !ignoreFormatting;
  const typeChanged = lookCounts && oldMarker.listType !== newMarker.listType;
  const levelChanged = lookCounts && oldMarker.level !== newMarker.level;
  const sameTypeAndLevel =
    oldMarker.listType === newMarker.listType && oldMarker.level === newMarker.level;
  const styleChanged = lookCounts && sameTypeAndLevel && oldMarker.style !== newMarker.style;
  const numberChanged = numberDiffers(oldMarker, newMarker);

  return {
    [ListMarkerProperty.ListType]: typeChanged,
    [ListMarkerProperty.Style]: styleChanged,
    [ListMarkerProperty.Number]: numberChanged,
    [ListMarkerProperty.Level]: levelChanged,
  };
}

/**
 * True when both markers show numbers that differ, and the item's place in its list does not
 * explain it: another `start` or `value` does, items added or removed before the item do not.
 */
function numberDiffers(oldMarker: ListMarker, newMarker: ListMarker): boolean {
  const bothShowNumbers =
    oldMarker.listType === ListType.Numbered && newMarker.listType === ListType.Numbered;
  const numbersDiffer = oldMarker.number !== newMarker.number;
  const shiftDoesNotExplain = oldMarker.unshiftedNumber !== newMarker.unshiftedNumber;

  return bothShowNumbers && numbersDiffer && shiftDoesNotExplain;
}

/** A checkbox checked or cleared; a checkbox in only one of the lines does not count. */
function checkboxChangeOf(oldLine: Line, newLine: Line): CheckboxChangeDetail | null {
  const oldState = oldLine.checkbox;
  const newState = newLine.checkbox;

  if (oldState === null || newState === null || oldState === newState) {
    return null;
  }

  return { kind: ChangeDetailKind.Checkbox, oldState, newState };
}
