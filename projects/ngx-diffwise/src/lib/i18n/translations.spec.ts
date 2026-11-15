import { DiffwiseLanguage } from '../config/option-values';
import { LANGUAGE_TEXTS, type UiLanguage, languageTag } from './resolve-language';
import type { UiTexts } from './texts';

/** A place for a number in a text, such as `{count}`. */
const PLACEHOLDER = /\{[a-z]+\}/g;

const ENGLISH_TEXTS = LANGUAGE_TEXTS[DiffwiseLanguage.EN];
const TEXT_NAMES = Object.keys(ENGLISH_TEXTS) as (keyof UiTexts)[];
const LANGUAGES = Object.keys(LANGUAGE_TEXTS) as UiLanguage[];

/** The places for numbers in a text, in alphabetical order. */
function placeholdersOf(text: string): string[] {
  return (text.match(PLACEHOLDER) ?? []).sort();
}

describe('Translations of the interface', () => {
  it('cover the interface in English, Polish and ten more languages', () => {
    expect(LANGUAGES).toEqual([
      DiffwiseLanguage.EN,
      DiffwiseLanguage.PL,
      DiffwiseLanguage.ZH,
      DiffwiseLanguage.ES,
      DiffwiseLanguage.HI,
      DiffwiseLanguage.FR,
      DiffwiseLanguage.RU,
      DiffwiseLanguage.PT,
      DiffwiseLanguage.IT,
      DiffwiseLanguage.JA,
      DiffwiseLanguage.DE,
      DiffwiseLanguage.KO,
    ]);
  });

  for (const language of LANGUAGES) {
    describe(`in the language "${language}"`, () => {
      const texts = LANGUAGE_TEXTS[language];

      it('have every text of the English interface, and no other', () => {
        expect(Object.keys(texts).sort()).toEqual([...TEXT_NAMES].sort());
      });

      it('keep the places for numbers of the English texts', () => {
        for (const name of TEXT_NAMES) {
          expect(placeholdersOf(texts[name]), name).toEqual(placeholdersOf(ENGLISH_TEXTS[name]));
        }
      });

      it('have no empty text, and no space at the start or the end of a text', () => {
        for (const name of TEXT_NAMES) {
          expect(texts[name].trim(), name).toBe(texts[name]);
          expect(texts[name], name).not.toBe('');
        }
      });

      it('name the language for the lang attribute', () => {
        expect(languageTag(language).startsWith(language)).toBe(true);
      });
    });
  }

  it('name Chinese by its simplified characters', () => {
    expect(languageTag(DiffwiseLanguage.ZH)).toBe('zh-Hans');
  });
});
