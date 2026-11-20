import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

import type { DiffwiseLanguagePack } from '../i18n/texts';

const LANGUAGES_TOKEN_DESCRIPTION = 'Diffwise languages of the interface';

/** The languages given to `provideDiffwiseLanguages()`, one entry for each language. */
export const DIFFWISE_LANGUAGES = new InjectionToken<readonly DiffwiseLanguagePack[]>(
  LANGUAGES_TOKEN_DESCRIPTION,
);

/**
 * Adds texts of the interface in the languages, such as
 * `provideDiffwiseLanguages(diffwisePolish, diffwiseGerman)`; English is always there. The
 * languages an app does not give stay out of it when it builds. Call it in the providers of the
 * app.
 */
export function provideDiffwiseLanguages(
  ...languages: readonly DiffwiseLanguagePack[]
): EnvironmentProviders {
  return makeEnvironmentProviders(
    languages.map((language) => ({ provide: DIFFWISE_LANGUAGES, useValue: language, multi: true })),
  );
}
