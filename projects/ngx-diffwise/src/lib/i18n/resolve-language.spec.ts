import { DiffwiseLanguage } from '../config/option-values';
import { resolveLanguage } from './resolve-language';

const ENGLISH_LOCALE = 'en-US';

describe('resolveLanguage', () => {
  it('keeps the language set by the app', () => {
    expect(resolveLanguage(DiffwiseLanguage.PL, ENGLISH_LOCALE)).toBe(DiffwiseLanguage.PL);
  });

  it('takes the language of the app in automatic mode, with or without its region', () => {
    for (const localeId of ['pl', 'pl-PL', 'pl_PL', 'PL']) {
      expect(resolveLanguage(DiffwiseLanguage.Auto, localeId)).toBe(DiffwiseLanguage.PL);
    }

    expect(resolveLanguage(DiffwiseLanguage.Auto, 'en-GB')).toBe(DiffwiseLanguage.EN);
  });

  it('falls back to English when the interface has no texts in the language of the app', () => {
    expect(resolveLanguage(DiffwiseLanguage.Auto, 'nl-NL')).toBe(DiffwiseLanguage.EN);
    expect(resolveLanguage(DiffwiseLanguage.Auto, 'plt')).toBe(DiffwiseLanguage.EN);
  });
});
