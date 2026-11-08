import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

import { DiffwiseConfig, type DiffwiseConfigOptions } from './diffwise-config';

const CONFIG_TOKEN_DESCRIPTION = 'Diffwise global configuration';

/** The global configuration given to `provideDiffwise()`. */
export const DIFFWISE_CONFIG = new InjectionToken<DiffwiseConfig>(CONFIG_TOKEN_DESCRIPTION);

/**
 * Sets the global configuration: the options of every diff that does not set its own.
 * Call it once, in the providers of the app.
 */
export function provideDiffwise(
  config: DiffwiseConfig | DiffwiseConfigOptions,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: DIFFWISE_CONFIG, useValue: new DiffwiseConfig(config) },
  ]);
}
