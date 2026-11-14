import type { DiffwiseConfigOptions } from '../config/diffwise-config';
import { normalizeConfig } from '../config/normalize-config';
import type { DiffwiseUserSetting } from '../config/option-values';

/** Options the user has chosen in the view settings, under the names of the options. */
export type UserChoices = Pick<DiffwiseConfigOptions, DiffwiseUserSetting>;

/** Choices before the user makes any. */
export const NO_USER_CHOICES: UserChoices = Object.freeze({});

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
