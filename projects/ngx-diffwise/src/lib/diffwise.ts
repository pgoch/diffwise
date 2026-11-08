import { Injectable, inject, signal } from '@angular/core';

import { DiffwiseConfig, type DiffwiseConfigOptions } from './config/diffwise-config';
import { DIFFWISE_CONFIG } from './config/provide-diffwise';

/** Reads and changes the global configuration of Diffwise while the app runs. */
@Injectable({ providedIn: 'root' })
export class Diffwise {
  private readonly globalConfig = signal(
    inject(DIFFWISE_CONFIG, { optional: true }) ?? new DiffwiseConfig(),
  );

  /** The global configuration: from `provideDiffwise()`, with the changes made since. */
  readonly config = this.globalConfig.asReadonly();

  /** Changes the given options of the global configuration; diffs follow at once. */
  updateConfig(changes: DiffwiseConfig | DiffwiseConfigOptions): void {
    this.globalConfig.update((config) => config.with(changes));
  }
}
