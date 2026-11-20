import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  DiffwiseConfig,
  DiffwiseVersionHeaders,
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
  provideDiffwise,
  provideDiffwiseLanguages,
} from 'ngx-diffwise';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideDiffwise(new DiffwiseConfig({ versionHeaders: DiffwiseVersionHeaders.Default })),
    provideDiffwiseLanguages(
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
    ),
  ],
};
