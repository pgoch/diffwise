import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { DiffwiseConfig, DiffwiseVersionHeaders, provideDiffwise } from 'ngx-diffwise';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideDiffwise(new DiffwiseConfig({ versionHeaders: DiffwiseVersionHeaders.Default })),
  ],
};
