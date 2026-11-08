import type { DiffwiseCustomTexts } from '../i18n/texts';
import { normalizeConfig } from './normalize-config';
import {
  DiffwiseColorMode,
  DiffwiseLanguage,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
} from './option-values';

/** Options of Diffwise. An option left out keeps its value from the level below, or its default. */
export interface DiffwiseConfigOptions {
  /** Light, dark, or automatic: as the system or the app. Default: `DiffwiseColorMode.Auto`. */
  readonly colorMode?: DiffwiseColorMode;
  /**
   * In automatic mode, the dark mode marker of the app, such as `.dark` on `<html>`; `null`
   * follows the system. Default: `null`.
   */
  readonly darkModeSelector?: string | null;
  /** Shows the number of each line. Default: `true`. */
  readonly showLineNumbers?: boolean;
  /** Headers above the two versions, or texts of the app. Default: `DiffwiseVersionHeaders.Default`. */
  readonly versionHeaders?: DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts;
  /** Ignores differences in whitespace. Default: `false`. */
  readonly ignoreWhitespace?: boolean;
  /** Ignores differences in letter case. Default: `false`. */
  readonly ignoreCase?: boolean;
  /** Language of the interface; `auto` takes the one of the app. Default: `DiffwiseLanguage.Auto`. */
  readonly language?: DiffwiseLanguage;
  /**
   * Texts shown instead of texts of the interface. Each level of the configuration changes only
   * the texts it sets. Default: none.
   */
  readonly customTexts?: DiffwiseCustomTexts;
}

/** Custom texts of a config that sets none. */
const NO_CUSTOM_TEXTS: DiffwiseCustomTexts = Object.freeze({});

/**
 * Options of Diffwise with their defaults. A config changes only the options given to it,
 * so the config of one diff keeps the other options of the global configuration.
 */
export class DiffwiseConfig implements Required<DiffwiseConfigOptions> {
  /** Light, dark, or automatic: as the system or the app. */
  readonly colorMode: DiffwiseColorMode = DiffwiseColorMode.Auto;

  /** In automatic mode, the dark mode marker of the app, such as `.dark`; `null` follows the system. */
  readonly darkModeSelector: string | null = null;

  /** Shows the number of each line. */
  readonly showLineNumbers: boolean = true;

  /** Headers above the two versions, or texts of the app. */
  readonly versionHeaders: DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts =
    DiffwiseVersionHeaders.Default;

  /** Ignores differences in whitespace. */
  readonly ignoreWhitespace: boolean = false;

  /** Ignores differences in letter case. */
  readonly ignoreCase: boolean = false;

  /** Language of the interface; `auto` takes the one of the app. */
  readonly language: DiffwiseLanguage = DiffwiseLanguage.Auto;

  /** Texts shown instead of texts of the interface. */
  readonly customTexts: DiffwiseCustomTexts = NO_CUSTOM_TEXTS;

  /** Valid options given to the constructor, without the defaults. */
  readonly #givenOptions: DiffwiseConfigOptions;

  /** Takes only the options to change; an invalid value keeps the default. */
  constructor(options: DiffwiseConfig | DiffwiseConfigOptions = {}) {
    this.#givenOptions = DiffwiseConfig.#validOptionsOf(options);
    Object.assign(this, this.#givenOptions);
    Object.freeze(this);
  }

  /** A copy with the given options changed; an invalid value keeps the current one. */
  with(changes: DiffwiseConfig | DiffwiseConfigOptions): DiffwiseConfig {
    const validChanges = DiffwiseConfig.#validOptionsOf(changes);
    return new DiffwiseConfig(withChanges(this.#givenOptions, validChanges));
  }

  /** Valid options of a plain object, or only the options given to a config. */
  static #validOptionsOf(options: DiffwiseConfig | DiffwiseConfigOptions): DiffwiseConfigOptions {
    return options instanceof DiffwiseConfig ? options.#givenOptions : normalizeConfig(options);
  }
}

/** The options with the changes; custom texts change one by one, so the texts left out stay. */
function withChanges(
  options: DiffwiseConfigOptions,
  changes: DiffwiseConfigOptions,
): DiffwiseConfigOptions {
  const customTexts = { ...options.customTexts, ...changes.customTexts };
  return { ...options, ...changes, customTexts };
}
