/*
 * Public API of ngx-diffwise
 */

export type { DiffwiseDiffColors } from './lib/config/diff-colors';
export * from './lib/config/diffwise-config';
export * from './lib/config/option-values';
export type { DiffwiseDiffStats } from './lib/diff-stats';
export { provideDiffwise } from './lib/config/provide-diffwise';
export * from './lib/diffwise';
export * from './lib/diffwise-html';
export * from './lib/diffwise-text';
export type { DiffwiseCustomTexts } from './lib/i18n/texts';
export type { DiffwiseUserSettings } from './lib/user-settings/user-settings';
