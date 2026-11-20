import { GERMAN_TEXTS } from './de';
import { SPANISH_TEXTS } from './es';
import { FRENCH_TEXTS } from './fr';
import { HINDI_TEXTS } from './hi';
import { ITALIAN_TEXTS } from './it';
import { JAPANESE_TEXTS } from './ja';
import { KOREAN_TEXTS } from './ko';
import { POLISH_TEXTS } from './pl';
import { PORTUGUESE_TEXTS } from './pt';
import { RUSSIAN_TEXTS } from './ru';
import type { DiffwiseLanguagePack } from './texts';
import { CHINESE_TEXTS } from './zh';

/*
 * Each language is a constant of its own, so that the bundler of an app leaves out the languages
 * the app does not give to `provideDiffwiseLanguages()`. Their codes stand as plain values, not as
 * `DiffwiseLanguage.PL`: a bundler keeps a constant that reads a property, since reading it could
 * run code, and the texts of every language would stay in every app.
 */

/** The interface in Polish, for `provideDiffwiseLanguages()`. */
export const diffwisePolish: DiffwiseLanguagePack = {
  language: 'pl',
  texts: POLISH_TEXTS,
};

/** The interface in Chinese, in simplified characters, for `provideDiffwiseLanguages()`. */
export const diffwiseChinese: DiffwiseLanguagePack = {
  language: 'zh',
  texts: CHINESE_TEXTS,
};

/** The interface in Spanish, for `provideDiffwiseLanguages()`. */
export const diffwiseSpanish: DiffwiseLanguagePack = {
  language: 'es',
  texts: SPANISH_TEXTS,
};

/** The interface in Hindi, for `provideDiffwiseLanguages()`. */
export const diffwiseHindi: DiffwiseLanguagePack = {
  language: 'hi',
  texts: HINDI_TEXTS,
};

/** The interface in French, for `provideDiffwiseLanguages()`. */
export const diffwiseFrench: DiffwiseLanguagePack = {
  language: 'fr',
  texts: FRENCH_TEXTS,
};

/** The interface in Russian, for `provideDiffwiseLanguages()`. */
export const diffwiseRussian: DiffwiseLanguagePack = {
  language: 'ru',
  texts: RUSSIAN_TEXTS,
};

/**
 * The interface in Portuguese, in the words and spelling of Portugal, for
 * `provideDiffwiseLanguages()`.
 */
export const diffwisePortuguese: DiffwiseLanguagePack = {
  language: 'pt',
  texts: PORTUGUESE_TEXTS,
};

/** The interface in Italian, for `provideDiffwiseLanguages()`. */
export const diffwiseItalian: DiffwiseLanguagePack = {
  language: 'it',
  texts: ITALIAN_TEXTS,
};

/** The interface in Japanese, for `provideDiffwiseLanguages()`. */
export const diffwiseJapanese: DiffwiseLanguagePack = {
  language: 'ja',
  texts: JAPANESE_TEXTS,
};

/** The interface in German, for `provideDiffwiseLanguages()`. */
export const diffwiseGerman: DiffwiseLanguagePack = {
  language: 'de',
  texts: GERMAN_TEXTS,
};

/** The interface in Korean, for `provideDiffwiseLanguages()`. */
export const diffwiseKorean: DiffwiseLanguagePack = {
  language: 'ko',
  texts: KOREAN_TEXTS,
};

/**
 * Every language of the interface besides English, in the order of `DiffwiseLanguage`, for tests.
 * The library itself never reads it, so that the languages an app leaves out stay out of the app.
 */
export const LANGUAGE_PACKS: readonly DiffwiseLanguagePack[] = [
  diffwisePolish,
  diffwiseChinese,
  diffwiseSpanish,
  diffwiseHindi,
  diffwiseFrench,
  diffwiseRussian,
  diffwisePortuguese,
  diffwiseItalian,
  diffwiseJapanese,
  diffwiseGerman,
  diffwiseKorean,
];
