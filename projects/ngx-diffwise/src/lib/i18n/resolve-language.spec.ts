import { DiffwiseLanguage } from '../config/option-values';
import { resolveLanguage } from './resolve-language';

const ENGLISH_LOCALE = 'en-US';

/** Locales of apps with a region, and the language of the interface each one gets. */
const REGIONAL_LOCALES: readonly [string, DiffwiseLanguage][] = [
  ['de-AT', DiffwiseLanguage.DE],
  ['es-MX', DiffwiseLanguage.ES],
  ['fr-CA', DiffwiseLanguage.FR],
  ['it-CH', DiffwiseLanguage.IT],
  ['ja-JP', DiffwiseLanguage.JA],
  ['ko-KR', DiffwiseLanguage.KO],
  ['hi-IN', DiffwiseLanguage.HI],
  ['ru-RU', DiffwiseLanguage.RU],
  ['pl-PL', DiffwiseLanguage.PL],
  ['en-GB', DiffwiseLanguage.EN],
];

describe('resolveLanguage', () => {
  it('keeps the language set by the app', () => {
    expect(resolveLanguage(DiffwiseLanguage.PL, ENGLISH_LOCALE)).toBe(DiffwiseLanguage.PL);
    expect(resolveLanguage(DiffwiseLanguage.JA, ENGLISH_LOCALE)).toBe(DiffwiseLanguage.JA);
  });

  it('takes the language of the app in automatic mode, with or without its region', () => {
    for (const localeId of ['pl', 'pl-PL', 'pl_PL', 'PL']) {
      expect(resolveLanguage(DiffwiseLanguage.Auto, localeId)).toBe(DiffwiseLanguage.PL);
    }

    for (const [localeId, language] of REGIONAL_LOCALES) {
      expect(resolveLanguage(DiffwiseLanguage.Auto, localeId), localeId).toBe(language);
    }
  });

  it('gives Chinese in simplified characters to every Chinese locale', () => {
    for (const localeId of ['zh', 'zh-CN', 'zh-TW', 'zh-HK', 'zh_SG', 'zh-Hans', 'zh-Hant-TW']) {
      expect(resolveLanguage(DiffwiseLanguage.Auto, localeId), localeId).toBe(DiffwiseLanguage.ZH);
    }
  });

  it('gives Portuguese only without a region or for Portugal, and English for other regions', () => {
    for (const localeId of ['pt', 'pt-PT', 'pt_PT', 'PT-pt', 'pt-Latn-PT', 'pt-Latn']) {
      expect(resolveLanguage(DiffwiseLanguage.Auto, localeId), localeId).toBe(DiffwiseLanguage.PT);
    }

    for (const localeId of ['pt-AO', 'pt_MZ', 'pt-Latn-CV', 'pt-419']) {
      expect(resolveLanguage(DiffwiseLanguage.Auto, localeId), localeId).toBe(DiffwiseLanguage.EN);
    }
  });

  it('falls back to English when the interface has no texts in the language of the app', () => {
    expect(resolveLanguage(DiffwiseLanguage.Auto, 'nl-NL')).toBe(DiffwiseLanguage.EN);
    expect(resolveLanguage(DiffwiseLanguage.Auto, 'plt')).toBe(DiffwiseLanguage.EN);
  });
});
