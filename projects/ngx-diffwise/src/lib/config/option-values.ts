/** Headers above the two versions; an app can also give its own texts instead. */
export const DiffwiseVersionHeaders = {
  /** No headers. */
  None: 'none',
  /** "Previous version" and "New version". */
  Default: 'default',
  /** Icons for the earlier and the later version, named by the default texts. */
  Icons: 'icons',
} as const;

export type DiffwiseVersionHeaders =
  (typeof DiffwiseVersionHeaders)[keyof typeof DiffwiseVersionHeaders];

/** Headers an app gives to the two versions, such as a version number with a date. */
export interface DiffwiseVersionHeaderTexts {
  /** Header of the earlier version, such as `Version 3 · 12.10.2026`. */
  readonly old: string;
  /** Header of the later version. */
  readonly new: string;
}
