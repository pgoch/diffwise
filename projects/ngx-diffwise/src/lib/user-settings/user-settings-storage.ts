import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import {
  NO_USER_CHOICES,
  type UserChoices,
  choicesOfUserSettings,
  userSettingsOf,
} from './user-settings';

/** Start of the name of each localStorage entry, which ends with the key of the choices. */
const ENTRY_NAME_START = 'diffwise:user-settings:';

/**
 * The choices of the user in localStorage of the browser, under the key of the choices. Without
 * localStorage, such as on the server or when the browser blocks it, nothing is kept, and the
 * diffs work as usual.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsStorage {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The choices saved under the key; none when nothing valid is saved there. */
  read(key: string): UserChoices {
    const text = this.withStorage((storage) => storage.getItem(entryNameOf(key)));

    if (text === undefined || text === null) {
      return NO_USER_CHOICES;
    }

    return choicesOfUserSettings(parsedJson(text)) ?? NO_USER_CHOICES;
  }

  /** Saves the choices under the key, in place of those saved before. */
  write(key: string, choices: UserChoices): void {
    const text = JSON.stringify(userSettingsOf(choices));
    this.withStorage((storage) => storage.setItem(entryNameOf(key), text));
  }

  /** Removes the choices saved under the key. */
  remove(key: string): void {
    this.withStorage((storage) => storage.removeItem(entryNameOf(key)));
  }

  /**
   * Gives localStorage to the task. `undefined` without localStorage, or when the task fails,
   * such as when the storage is full.
   */
  private withStorage<T>(task: (storage: Storage) => T): T | undefined {
    if (!this.isBrowser) {
      return undefined;
    }

    try {
      const storage = this.document.defaultView?.localStorage;
      return storage === undefined ? undefined : task(storage);
    } catch {
      return undefined;
    }
  }
}

/** Name of the localStorage entry with the choices under the key. */
function entryNameOf(key: string): string {
  return ENTRY_NAME_START + key;
}

/** The value written in the JSON text; `undefined` when the text is not JSON. */
function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
