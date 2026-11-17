import { DiffwiseConfig, type DiffwiseConfigOptions } from 'ngx-diffwise';

/** Every option with its default, as a `DiffwiseConfig` without options holds them. */
export const DEFAULT_OPTIONS: DiffwiseConfigOptions = { ...new DiffwiseConfig() };

/**
 * Options of a diff that the demo must not change: every option, with its default unless given,
 * so the global configuration that the demo changes does not reach the diff. The key keeps the
 * choices made in the view settings of the diff apart from those of other diffs.
 */
export function ownOptions(
  userSettingsKey: string,
  options: DiffwiseConfigOptions = {},
): DiffwiseConfigOptions {
  return { ...DEFAULT_OPTIONS, ...options, userSettingsKey };
}
