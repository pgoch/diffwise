import { DiffwiseLanguage } from '../config/option-values';
import { ENGLISH_TEXTS } from './en';
import { POLISH_TEXTS } from './pl';
import type { UiTexts } from './texts';

/** A language the interface has texts in. */
export type UiLanguage = Exclude<DiffwiseLanguage, typeof DiffwiseLanguage.Auto>;

/** Texts of the interface in each of its languages. */
export const LANGUAGE_TEXTS: Readonly<Record<UiLanguage, UiTexts>> = {
  [DiffwiseLanguage.EN]: ENGLISH_TEXTS,
  [DiffwiseLanguage.PL]: POLISH_TEXTS,
};

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
