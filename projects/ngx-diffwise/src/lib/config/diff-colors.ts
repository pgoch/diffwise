/** Colors of changes in one theme, in CSS; a color left out comes from the built-in palette. */
export interface ThemeDiffColors {
  /** Background of a changed line in the earlier version. */
  readonly removedLine?: string;
  /** Background of removed words. */
  readonly removedHighlight?: string;
  /** Outlines, bars and numbers of changed lines in the earlier version. */
  readonly removedAccent?: string;
  /** Background of a changed line in the later version. */
  readonly addedLine?: string;
  /** Background of added words. */
  readonly addedHighlight?: string;
  /** Outlines, bars and numbers of changed lines in the later version. */
  readonly addedAccent?: string;
}

/**
 * Colors of changes given by an app, for the light and the dark theme. In a theme with such
 * colors, `diffIntensity` does not apply.
 */
export interface DiffwiseDiffColors {
  readonly light?: ThemeDiffColors;
  readonly dark?: ThemeDiffColors;
}

/** The CSS variable each color sets on the diff. */
export const DIFF_COLOR_VARIABLES: Readonly<Record<keyof ThemeDiffColors, string>> = {
  removedLine: '--diffwise-removed-line',
  removedHighlight: '--diffwise-removed-highlight',
  removedAccent: '--diffwise-removed-accent',
  addedLine: '--diffwise-added-line',
  addedHighlight: '--diffwise-added-highlight',
  addedAccent: '--diffwise-added-accent',
};
