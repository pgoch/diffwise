import type { DiffwiseConfigOptions } from '../config/diffwise-config';
import { normalizeConfig } from '../config/normalize-config';
import type { DiffwiseUserSetting } from '../config/option-values';

/** Options the user has chosen in the view settings, under the names of the options. */
export type UserChoices = Pick<DiffwiseConfigOptions, DiffwiseUserSetting>;

/** Choices before the user makes any. */
export const NO_USER_CHOICES: UserChoices = Object.freeze({});

/** Number of the format of the choices; a later format gets a higher number. */
const USER_SETTINGS_VERSION = 1;

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
