import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { Injectable, type WritableSignal, inject, signal, untracked } from '@angular/core';

import type { DiffwiseUserSetting } from '../config/option-values';
import { NO_USER_CHOICES, type UserChoices } from './user-settings';
import { UserSettingsStorage } from './user-settings-storage';

/** Choices while they are put together, before they are frozen. */
type ChangingChoices = { -readonly [Setting in keyof UserChoices]: UserChoices[Setting] };

/** Base path of an app without one. */
const ROOT_PATH = '/';

/**
 * The choices of the user for each key, while the app runs. Diffs with the same key share them, so
 * a choice in one diff changes the others too, as the theme of the app does. Diffs that remember
 * the choices keep them in localStorage too.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsStore {
  private readonly storage = inject(UserSettingsStorage);
  private readonly appBaseHref = inject(APP_BASE_HREF, { optional: true });
  private readonly platformLocation = inject(PlatformLocation);

  /** Choices changed while the app runs, by key; `undefined` before the first change. */
  private readonly changedChoicesByKey = new Map<string, WritableSignal<UserChoices | undefined>>();

  /** Choices read from localStorage, by key, so that each key is read once. */
  private readonly savedChoicesByKey = new Map<string, UserChoices>();

  /** The key of the choices: the given one, or the base path of the app, such as `/admin/`. */
  keyOf(userSettingsKey: string | null): string {
    return userSettingsKey ?? this.basePath();
  }

  /**
   * The choices under the key; in a reactive context, follows each later change. Until the first
   * change while the app runs, a diff that remembers the choices gets those from localStorage.
   */
  choicesOf(key: string, remembers: boolean): UserChoices {
    const changedChoices = this.changedChoices(key)();

    if (changedChoices !== undefined) {
      return changedChoices;
    }

    return remembers ? this.savedChoices(key) : NO_USER_CHOICES;
  }

  /**
   * Adds the changes to the choices under the key, and saves them when the choices are
   * remembered. A later choice of an option replaces the earlier one.
   */
  choose(key: string, changes: UserChoices, remembers: boolean): void {
    const choices = untracked(() => this.choicesOf(key, remembers));
    this.replace(key, Object.freeze({ ...choices, ...changes }), remembers);
  }

  /**
   * Takes back the choice of one option under the key, so the option of the app applies again, and
   * saves the other choices when they are remembered.
   */
  withdraw(key: string, setting: DiffwiseUserSetting, remembers: boolean): void {
    const choices: ChangingChoices = { ...untracked(() => this.choicesOf(key, remembers)) };

    delete choices[setting];
    this.replace(key, Object.freeze(choices), remembers);
  }

  /** Puts the choices in place of those under the key, and saves them when they are remembered. */
  replace(key: string, choices: UserChoices, remembers: boolean): void {
    this.changedChoices(key).set(choices);

    if (remembers) {
      this.save(key, choices);
    }
  }

  /** Saves the choices changed under the key, such as before remembering them was turned on. */
  saveChanged(key: string): void {
    const changedChoices = untracked(this.changedChoices(key));

    if (changedChoices !== undefined) {
      this.save(key, changedChoices);
    }
  }

  /**
   * Takes back every choice under the key, also from localStorage, so the options of the app apply
   * again.
   */
  reset(key: string): void {
    this.changedChoices(key).set(NO_USER_CHOICES);
    this.savedChoicesByKey.delete(key);
    this.storage.remove(key);
  }

  /** The signal of the choices changed under the key, made on first use. */
  private changedChoices(key: string): WritableSignal<UserChoices | undefined> {
    let choices = this.changedChoicesByKey.get(key);

    if (choices === undefined) {
      choices = signal<UserChoices | undefined>(undefined);
      this.changedChoicesByKey.set(key, choices);
    }

    return choices;
  }

  /** The choices saved under the key, read from localStorage on first use. */
  private savedChoices(key: string): UserChoices {
    let choices = this.savedChoicesByKey.get(key);

    if (choices === undefined) {
      choices = this.storage.read(key);
      this.savedChoicesByKey.set(key, choices);
    }

    return choices;
  }

  /** Keeps the choices as saved under the key, and writes them to localStorage. */
  private save(key: string, choices: UserChoices): void {
    this.savedChoicesByKey.set(key, choices);
    this.storage.write(key, choices);
  }

  /** Base path of the app: from `APP_BASE_HREF`, from `<base href>` of the page, or the root. */
  private basePath(): string {
    const basePath = this.appBaseHref ?? this.platformLocation.getBaseHrefFromDOM() ?? ROOT_PATH;
    return basePath.length === 0 ? ROOT_PATH : basePath;
  }
}
