import { DiffwiseLanguage } from '../config/option-values';
import { ENGLISH_TEXTS } from './en';
import {
  LANGUAGE_PACKS,
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
} from './languages';
import { languageTag } from './resolve-language';
import type { DiffwiseLanguagePack, UiTexts } from './texts';

/** A place for a number in a text, such as `{count}`. */
const PLACEHOLDER = /\{[a-z]+\}/g;

const TEXT_NAMES = Object.keys(ENGLISH_TEXTS) as (keyof UiTexts)[];

/** Every language of the interface with its texts, English first. */
const LANGUAGE_TEXTS: readonly DiffwiseLanguagePack[] = [
  { language: DiffwiseLanguage.EN, texts: ENGLISH_TEXTS },
  ...LANGUAGE_PACKS,
];

const LANGUAGES = LANGUAGE_TEXTS.map(({ language }) => language);

/** Each constant of a language that apps give to `provideDiffwiseLanguages()`, with its language. */
const NAMED_LANGUAGES: readonly [DiffwiseLanguagePack, DiffwiseLanguage][] = [
  [diffwisePolish, DiffwiseLanguage.PL],
  [diffwiseChinese, DiffwiseLanguage.ZH],
  [diffwiseSpanish, DiffwiseLanguage.ES],
  [diffwiseHindi, DiffwiseLanguage.HI],
  [diffwiseFrench, DiffwiseLanguage.FR],
  [diffwiseRussian, DiffwiseLanguage.RU],
  [diffwisePortuguese, DiffwiseLanguage.PT],
  [diffwiseItalian, DiffwiseLanguage.IT],
  [diffwiseJapanese, DiffwiseLanguage.JA],
  [diffwiseGerman, DiffwiseLanguage.DE],
  [diffwiseKorean, DiffwiseLanguage.KO],
];

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

  it('give each language besides English a constant of its own, named after the language', () => {
    for (const [pack, language] of NAMED_LANGUAGES) {
      expect(pack.language).toBe(language);
    }

    expect(NAMED_LANGUAGES.map(([pack]) => pack)).toEqual(LANGUAGE_PACKS);
  });

  for (const { language, texts } of LANGUAGE_TEXTS) {
    describe(`in the language "${language}"`, () => {
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
