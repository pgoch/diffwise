import { Injectable, inject, signal } from '@angular/core';

import { ColorScheme, isDarkColorMode } from './color-scheme';
import { DiffwiseConfig, type DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseColorMode } from './config/option-values';
import { DIFFWISE_CONFIG } from './config/provide-diffwise';

/** Reads and changes the global configuration of Diffwise while the app runs. */
@Injectable({ providedIn: 'root' })
export class Diffwise {
  private readonly colorScheme = inject(ColorScheme);
  private readonly globalConfig = signal(
    inject(DIFFWISE_CONFIG, { optional: true }) ?? new DiffwiseConfig(),
  );

  /** The global configuration: from `provideDiffwise()`, with the changes made since. */
  readonly config = this.globalConfig.asReadonly();

  /** Changes the given options of the global configuration; diffs follow at once. */
  updateConfig(changes: DiffwiseConfig | DiffwiseConfigOptions): void {
    this.globalConfig.update((config) => config.with(changes));
  }

  /** Shows the diffs in the dark theme, except a diff that sets its own color mode. */
  switchToDarkMode(): void {
    this.updateConfig({ colorMode: DiffwiseColorMode.Dark });
  }

  /** Shows the diffs in the light theme, except a diff that sets its own color mode. */
  switchToLightMode(): void {
    this.updateConfig({ colorMode: DiffwiseColorMode.Light });
  }

  /** Lets the system, or the dark mode marker of the app, choose the theme again. */
  switchToAutoMode(): void {
    this.updateConfig({ colorMode: DiffwiseColorMode.Auto });
  }

  /** Switches to the light theme when the diffs are dark now, and to the dark one otherwise. */
  toggleDarkMode(): void {
    if (this.isDarkNow()) {
      this.switchToLightMode();
    } else {
      this.switchToDarkMode();
    }
  }

  /** True when the global configuration shows the dark theme now. */
  private isDarkNow(): boolean {
    const { colorMode, darkModeSelector } = this.config();
    return isDarkColorMode(colorMode, () => this.colorScheme.autoModeIsDark(darkModeSelector));
  }
}
