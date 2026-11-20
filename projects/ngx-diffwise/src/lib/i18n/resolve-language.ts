import { warn } from '../config/normalize-config';
import { DiffwiseLanguage } from '../config/option-values';
import { ENGLISH_TEXTS } from './en';
import type { DiffwiseLanguagePack, UiLanguage } from './texts';

/** English, which the interface always has; the other languages come from the app. */
const ENGLISH: DiffwiseLanguagePack = { language: DiffwiseLanguage.EN, texts: ENGLISH_TEXTS };

/** Warns in development mode; the console puts the language at `%s`. */
const LANGUAGE_NOT_PROVIDED_WARNING =
  'Diffwise shows English in place of the language "%s": the app does not provide it with provideDiffwiseLanguages().';

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

/**
 * The language of the interface with its texts: the one of `resolveLanguage()` when it is English
 * or the app provides it with `provideDiffwiseLanguages()`, or else English. In development mode,
 * warns about a language that the app does not provide.
 */
export function interfaceLanguageOf(
  language: DiffwiseLanguage,
  localeId: string,
  providedLanguages: readonly DiffwiseLanguagePack[],
): DiffwiseLanguagePack {
  const resolved = resolveLanguage(language, localeId);

  if (resolved === DiffwiseLanguage.EN) {
    return ENGLISH;
  }

  const provided = providedLanguages.find((candidate) => candidate.language === resolved);

  if (provided === undefined) {
    warn(LANGUAGE_NOT_PROVIDED_WARNING, resolved);
  }

  return provided ?? ENGLISH;
}

/** True for the parts of a Portuguese locale after its language without a region, or for Portugal. */
function hasPortugueseRegion(subtags: readonly string[]): boolean {
  const region = regionOf(subtags);
  return region === null || region === PORTUGUESE_REGION;
}

/** The region among the parts of a locale after its language, after the script if there is one. */
function regionOf(subtags: readonly string[]): string | null {
  const [first, second] = subtags;
  const startsWithScript = first !== undefined && SCRIPT_SUBTAG.test(first);
  const candidate = startsWithScript ? second : first;
  const isRegion = candidate !== undefined && REGION_SUBTAG.test(candidate);

  return isRegion ? candidate : null;
}

/** True for a language that the interface has texts in. */
function isUiLanguage(language: string): language is UiLanguage {
  return Object.hasOwn(LANGUAGE_TAGS, language);
}
