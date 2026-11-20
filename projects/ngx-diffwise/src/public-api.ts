/*
 * Public API of ngx-diffwise
 */

export type { DiffwiseDiffColors } from './lib/config/diff-colors';
export * from './lib/config/diffwise-config';
export * from './lib/config/option-values';
export type { DiffwiseDiffStats } from './lib/diff-stats';
export { provideDiffwise } from './lib/config/provide-diffwise';
export { provideDiffwiseLanguages } from './lib/config/provide-diffwise-languages';
export * from './lib/diffwise';
export * from './lib/diffwise-html';
export * from './lib/diffwise-text';
export {
  diffwiseChinese,
  diffwiseFrench,
  diffwiseGerman,
  diffwiseHindi,
  diffwiseItalian,
  diffwiseJapanese,
  diffwiseKorean,
  diffwisePolish,
  diffwisePortuguese,
  diffwiseRussian,
  diffwiseSpanish,
} from './lib/i18n/languages';
export type { DiffwiseCustomTexts, DiffwiseLanguagePack } from './lib/i18n/texts';
export type { DiffwiseUserSettings } from './lib/user-settings/user-settings';
