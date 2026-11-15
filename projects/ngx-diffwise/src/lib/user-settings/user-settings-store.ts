import { Injectable, type Signal, type WritableSignal, signal } from '@angular/core';

import { NO_USER_CHOICES, type UserChoices } from './user-settings';

/** The key of the choices every diff of the app shares. */
export const SHARED_USER_SETTINGS_KEY = 'default';

/**
 * The choices of the user for each key, while the app runs. Diffs with the same key share them, so
 * a choice in one diff changes the others too, as the theme of the app does.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsStore {
  private readonly choicesByKey = new Map<string, WritableSignal<UserChoices>>();

  /** The choices under the key; the signal follows every later change. */
  choicesOf(key: string): Signal<UserChoices> {
    return this.choicesSignal(key).asReadonly();
  }

  /** Adds the changes to the choices under the key; a later choice of an option replaces it. */
  choose(key: string, changes: UserChoices): void {
    this.choicesSignal(key).update((choices) => Object.freeze({ ...choices, ...changes }));
  }

  /** Takes back every choice under the key, so the options of the app apply again. */
  reset(key: string): void {
    this.choicesSignal(key).set(NO_USER_CHOICES);
  }

  private choicesSignal(key: string): WritableSignal<UserChoices> {
    let choices = this.choicesByKey.get(key);

    if (choices === undefined) {
      choices = signal(NO_USER_CHOICES);
      this.choicesByKey.set(key, choices);
    }

    return choices;
  }
}
