/**
 * Texts an app shows instead of texts of the interface, such as `{ oldVersionLabel: 'Draft' }`.
 * All of them together add a language; a text left out stays in the language of the diff.
 */
export interface DiffwiseCustomTexts {
  /** Names the earlier version: its header, and the icon shown in its place. */
  readonly oldVersionLabel?: string;
  /** Names the later version: its header, and the icon shown in its place. */
  readonly newVersionLabel?: string;
  /** Names the whole diff for screen readers. */
  readonly diffLabel?: string;
}

/** Every text of the interface in one language. */
export type UiTexts = Required<DiffwiseCustomTexts>;
