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

/** Separates the language of a locale from its region, as in `pl-PL` or `pt_BR`. */
const LOCALE_SEPARATOR = /[-_]/;

/**
 * The language of the interface. `auto` takes the language of the app, such as `pl` of the
 * locale `pl-PL`, when the interface has texts in it, or else English.
 */
export function resolveLanguage(language: DiffwiseLanguage, localeId: string): UiLanguage {
  if (language !== DiffwiseLanguage.Auto) {
    return language;
  }

  const [appLanguage] = localeId.toLowerCase().split(LOCALE_SEPARATOR);

  return isUiLanguage(appLanguage) ? appLanguage : DiffwiseLanguage.EN;
}

function isUiLanguage(language: string): language is UiLanguage {
  return Object.hasOwn(LANGUAGE_TEXTS, language);
}
