import { Injectable, inject, signal } from '@angular/core';

import { ColorScheme, isDarkColorMode } from './color-scheme';
import { DiffwiseConfig, type DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseColorMode } from './config/option-values';
import { DIFFWISE_CONFIG } from './config/provide-diffwise';
import {
  type DiffwiseUserSettings,
  choicesOfUserSettings,
  userSettingsOf,
} from './user-settings/user-settings';
import { UserSettingsStore } from './user-settings/user-settings-store';

/**
 * Reads and changes the global configuration of Diffwise while the app runs, and the choices of
 * the user in the view settings.
 */
@Injectable({ providedIn: 'root' })
export class Diffwise {
  private readonly colorScheme = inject(ColorScheme);
  private readonly userSettings = inject(UserSettingsStore);
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

  /**
   * The choices of the user under the key, as a plain object the app can keep, such as in the
   * account of the user: the same object as from `(userSettingsChange)`. Without a key, those of
   * diffs without their own `userSettingsKey`.
   */
  exportUserSettings(key?: string): DiffwiseUserSettings {
    const { rememberUserSettings } = this.config();
    const choices = this.userSettings.choicesOf(this.userSettingsKeyOf(key), rememberUserSettings);

    return userSettingsOf(choices);
  }

  /**
   * Gives the user the choices the app has kept, in place of the current ones under the key; the
   * diffs follow at once. Leaves out invalid values and options that `allowedUserSettings` of the
   * global configuration does not allow, and ignores choices in a format of an unknown version.
   */
  importUserSettings(settings: DiffwiseUserSettings, key?: string): void {
    const { allowedUserSettings, rememberUserSettings } = this.config();
    const choices = choicesOfUserSettings(settings, allowedUserSettings);

    if (choices !== null) {
      this.userSettings.replace(this.userSettingsKeyOf(key), choices, rememberUserSettings);
    }
  }

  /**
   * Takes back every choice of the user under the key, also from localStorage, so the options of
   * the app apply again.
   */
  resetUserSettings(key?: string): void {
    this.userSettings.reset(this.userSettingsKeyOf(key));
  }

  /** The given key, or the one of diffs without their own `userSettingsKey`. */
  private userSettingsKeyOf(key: string | undefined): string {
    return this.userSettings.keyOf(key ?? this.config().userSettingsKey);
  }

  /** True when the global configuration shows the dark theme now. */
  private isDarkNow(): boolean {
    const { colorMode, darkModeSelector } = this.config();
    return isDarkColorMode(colorMode, () => this.colorScheme.autoModeIsDark(darkModeSelector));
  }
}
