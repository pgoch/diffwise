import type { DiffwiseConfigOptions } from '../config/diffwise-config';
import { isObject, normalizeConfig, warn } from '../config/normalize-config';
import { DiffwiseUserSetting } from '../config/option-values';

/** Options the user has chosen in the view settings, under the names of the options. */
export type UserChoices = Pick<DiffwiseConfigOptions, DiffwiseUserSetting>;

/** Choices before the user makes any. */
export const NO_USER_CHOICES: UserChoices = Object.freeze({});

/** Number of the format of the choices; a later format gets a higher number. */
const USER_SETTINGS_VERSION = 1;

/** Every option the user can change. */
const EVERY_USER_SETTING: readonly DiffwiseUserSetting[] = Object.freeze(
  Object.values(DiffwiseUserSetting),
);

/** Warnings in development mode; the console puts a value at `%o`. */
const Warning = {
  NotUserSettings:
    'Diffwise ignores the user settings %o: they are not an object with "version" and "settings".',
  UnknownVersion: 'Diffwise ignores the user settings %o: their format version is unknown.',
} as const;

/**
 * The choices of the user in the view settings, as a plain object an app can keep, such as
 * `{ version: 1, settings: { layout: 'inline', colorMode: 'dark' } }`.
 */
export interface DiffwiseUserSettings {
  /** Number of the format, which tells later versions of Diffwise how to read the choices. */
  readonly version: number;
  /** Options the user has chosen, under the names of the options; the others are left out. */
  readonly settings: Pick<DiffwiseConfigOptions, DiffwiseUserSetting>;
}

/** The choices of the user in the current format. */
export function userSettingsOf(choices: UserChoices): DiffwiseUserSettings {
  return Object.freeze({ version: USER_SETTINGS_VERSION, settings: choices });
}

/**
 * The choices that apply to a diff: those of the allowed options, with valid values. The others
 * stay with the user, but do nothing.
 */
export function validUserChoices(
  choices: object,
  allowed: readonly DiffwiseUserSetting[],
): UserChoices {
  const allowedChoices = Object.entries(choices).filter(([setting]) =>
    allowed.some((allowedSetting) => allowedSetting === setting),
  );

  return normalizeConfig(Object.fromEntries(allowedChoices));
}

/**
 * The choices in user settings kept by an app or in localStorage: those of the allowed options,
 * with valid values. `null`, with a warning in development mode, for anything else than user
 * settings, or for a format of a version this Diffwise cannot read.
 */
export function choicesOfUserSettings(
  userSettings: unknown,
  allowed: readonly DiffwiseUserSetting[] = EVERY_USER_SETTING,
): UserChoices | null {
  if (!isUserSettings(userSettings)) {
    warn(Warning.NotUserSettings, userSettings);
    return null;
  }

  if (userSettings.version !== USER_SETTINGS_VERSION) {
    warn(Warning.UnknownVersion, userSettings);
    return null;
  }

  return Object.freeze(validUserChoices(userSettings.settings, allowed));
}

/** User settings in any format: an object with a version, which may be unknown. */
interface AnyUserSettings {
  readonly version?: unknown;
  readonly settings: object;
}

/** True for an object with settings in an object, in any format. */
function isUserSettings(value: unknown): value is AnyUserSettings {
  if (!isObject(value)) {
    return false;
  }

  const { settings } = value as Partial<Record<keyof AnyUserSettings, unknown>>;

  return isObject(settings);
}
