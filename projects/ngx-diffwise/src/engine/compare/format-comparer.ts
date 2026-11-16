import {
  type ChangeDetail,
  ChangeDetailKind,
  type DiffOptions,
  type FormattingChangeDetail,
  FormattingValue,
  type FormattingValueChange,
  type TextFormat,
} from '../model';

const FORMATTING_VALUES = Object.values(FormattingValue);

/** What changed in a format, and a key that is equal for equal changes. */
export interface FormatDifference {
  readonly details: readonly ChangeDetail[];
  readonly key: string;
}

/** Finds what changed between formats; remembers every pair of formats it compared. */
export class FormatComparer {
  private readonly differences = new Map<TextFormat, Map<TextFormat, FormatDifference | null>>();

  constructor(private readonly options: DiffOptions) {}

  /** What changed between two formats; `null` when nothing that counts did. */
  difference(oldFormat: TextFormat, newFormat: TextFormat): FormatDifference | null {
    const knownDifferences = this.differencesFrom(oldFormat);
    let difference = knownDifferences.get(newFormat);

    if (difference === undefined) {
      difference = formatDifference(oldFormat, newFormat, this.options);
      knownDifferences.set(newFormat, difference);
    }

    return difference;
  }

  /** Differences found so far between the old format and new formats. */
  private differencesFrom(oldFormat: TextFormat): Map<TextFormat, FormatDifference | null> {
    let differences = this.differences.get(oldFormat);

    if (differences === undefined) {
      differences = new Map();
      this.differences.set(oldFormat, differences);
    }

    return differences;
  }
}

/** What changed between two formats; `null` when nothing that counts did. */
function formatDifference(
  oldFormat: TextFormat,
  newFormat: TextFormat,
  options: DiffOptions,
): FormatDifference | null {
  const details = changeDetails(oldFormat, newFormat, options);

  if (details.length === 0) {
    return null;
  }

  return { details, key: JSON.stringify(details) };
}

/** Details of a formatting change, a link change, or both, as far as the options count them. */
function changeDetails(
  oldFormat: TextFormat,
  newFormat: TextFormat,
  options: DiffOptions,
): ChangeDetail[] {
  const details: ChangeDetail[] = [];
  const formattingDetail = options.ignoreFormatting ? null : formattingChange(oldFormat, newFormat);
  const linkChanged = !options.ignoreLinkChanges && oldFormat.link !== newFormat.link;

  if (formattingDetail !== null) {
    details.push(formattingDetail);
  }

  if (linkChanged) {
    details.push({ kind: ChangeDetailKind.Link, oldLink: oldFormat.link, newLink: newFormat.link });
  }

  return details;
}

/** The change between the formatting of two formats; `null` when it is the same. */
function formattingChange(
  oldFormat: TextFormat,
  newFormat: TextFormat,
): FormattingChangeDetail | null {
  const removedStyles = oldFormat.styles.filter((style) => !newFormat.styles.includes(style));
  const addedStyles = newFormat.styles.filter((style) => !oldFormat.styles.includes(style));
  const changedValues = changedValuesBetween(oldFormat, newFormat);
  const formattingIsSame =
    removedStyles.length === 0 && addedStyles.length === 0 && changedValues.length === 0;

  if (formattingIsSame) {
    return null;
  }

  return { kind: ChangeDetailKind.Formatting, removedStyles, addedStyles, changedValues };
}

/** Values that differ between two formats, in the order of `FormattingValue`. */
function changedValuesBetween(
  oldFormat: TextFormat,
  newFormat: TextFormat,
): FormattingValueChange[] {
  const changedNames = FORMATTING_VALUES.filter(
    (name) => oldFormat.values[name] !== newFormat.values[name],
  );

  return changedNames.map((name) => ({
    name,
    oldValue: oldFormat.values[name],
    newValue: newFormat.values[name],
  }));
}
