import { DiffwiseLanguage } from '../config/option-values';
import { GERMAN_TEXTS } from './de';
import { ENGLISH_TEXTS } from './en';
import { SPANISH_TEXTS } from './es';
import { FRENCH_TEXTS } from './fr';
import { HINDI_TEXTS } from './hi';
import { ITALIAN_TEXTS } from './it';
import { JAPANESE_TEXTS } from './ja';
import { KOREAN_TEXTS } from './ko';
import { POLISH_TEXTS } from './pl';
import { PORTUGUESE_TEXTS } from './pt';
import { RUSSIAN_TEXTS } from './ru';
import type { UiTexts } from './texts';
import { CHINESE_TEXTS } from './zh';

/** A language the interface has texts in. */
export type UiLanguage = Exclude<DiffwiseLanguage, typeof DiffwiseLanguage.Auto>;

/** Texts of the interface in each of its languages. */
export const LANGUAGE_TEXTS: Readonly<Record<UiLanguage, UiTexts>> = {
  [DiffwiseLanguage.EN]: ENGLISH_TEXTS,
  [DiffwiseLanguage.PL]: POLISH_TEXTS,
  [DiffwiseLanguage.ZH]: CHINESE_TEXTS,
  [DiffwiseLanguage.ES]: SPANISH_TEXTS,
  [DiffwiseLanguage.HI]: HINDI_TEXTS,
  [DiffwiseLanguage.FR]: FRENCH_TEXTS,
  [DiffwiseLanguage.RU]: RUSSIAN_TEXTS,
  [DiffwiseLanguage.PT]: PORTUGUESE_TEXTS,
  [DiffwiseLanguage.IT]: ITALIAN_TEXTS,
  [DiffwiseLanguage.JA]: JAPANESE_TEXTS,
  [DiffwiseLanguage.DE]: GERMAN_TEXTS,
  [DiffwiseLanguage.KO]: KOREAN_TEXTS,
};

/**
 * Language tags of the interface languages, for the `lang` attribute of the interface texts. Chinese
 * names its simplified characters, which a screen reader and the fonts of the system follow.
 */
const LANGUAGE_TAGS: Readonly<Record<UiLanguage, string>> = {
  [DiffwiseLanguage.EN]: 'en',
  [DiffwiseLanguage.PL]: 'pl',
  [DiffwiseLanguage.ZH]: 'zh-Hans',
  [DiffwiseLanguage.ES]: 'es',
  [DiffwiseLanguage.HI]: 'hi',
  [DiffwiseLanguage.FR]: 'fr',
  [DiffwiseLanguage.RU]: 'ru',
  [DiffwiseLanguage.PT]: 'pt',
  [DiffwiseLanguage.IT]: 'it',
  [DiffwiseLanguage.JA]: 'ja',
  [DiffwiseLanguage.DE]: 'de',
  [DiffwiseLanguage.KO]: 'ko',
};

/** The language tag of an interface language, which screen readers pronounce its texts by. */
export function languageTag(language: UiLanguage): string {
  return LANGUAGE_TAGS[language];
}

/** Separates the parts of a locale, as in `pl-PL`, `zh_CN` or `zh-Hant-TW`. */
const LOCALE_SEPARATOR = /[-_]/;

/** The script of a locale, such as `Hant`, which stands before its region. */
const SCRIPT_SUBTAG = /^[a-z]{4}$/;

/** The region of a locale: two letters, such as `AT`, or three digits, such as `419`. */
const REGION_SUBTAG = /^(?:[a-z]{2}|\d{3})$/;

/** The region whose Portuguese the interface has: Portugal. */
const PORTUGUESE_REGION = 'pt';

/**
 * The language of the interface. `auto` takes the language of the app, such as `de` of the
 * locale `de-AT`, when the interface has texts in it, or else English. Every Chinese locale gets
 * Chinese in simplified characters; a Portuguese locale gets Portuguese without a region or with
 * the region of Portugal, and English with another region.
 */
export function resolveLanguage(language: DiffwiseLanguage, localeId: string): UiLanguage {
  if (language !== DiffwiseLanguage.Auto) {
    return language;
  }

  const [appLanguage, ...subtags] = localeId.toLowerCase().split(LOCALE_SEPARATOR);

  if (!isUiLanguage(appLanguage)) {
    return DiffwiseLanguage.EN;
  }

  if (appLanguage === DiffwiseLanguage.PT && !hasPortugueseRegion(subtags)) {
    return DiffwiseLanguage.EN;
  }

  return appLanguage;
}

/** True for the parts of a Portuguese locale after its language without a region, or for Portugal. */
function hasPortugueseRegion(subtags: readonly string[]): boolean {
  const region = regionOf(subtags);
  return region === null || region === PORTUGUESE_REGION;
}

/** The region among the parts of a locale after its language, after the script if there is one. */
function regionOf(subtags: readonly string[]): string | null {
  const [first, second] = subtags;
  const candidate = first !== undefined && SCRIPT_SUBTAG.test(first) ? second : first;

  return candidate !== undefined && REGION_SUBTAG.test(candidate) ? candidate : null;
}

function isUiLanguage(language: string): language is UiLanguage {
  return Object.hasOwn(LANGUAGE_TEXTS, language);
}
