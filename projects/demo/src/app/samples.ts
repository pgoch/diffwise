import { type ResourceRef, type Signal, linkedSignal, resource } from '@angular/core';
import { DiffwiseLanguage } from 'ngx-diffwise';

import type { Choice } from './choice';

/**
 * Languages of the sample documents, the same as the languages of the diff interface; each one is
 * a folder in `test-data/`.
 */
export type SampleLanguage = Exclude<DiffwiseLanguage, typeof DiffwiseLanguage.Auto>;

/** Sizes of the sample documents; each one is a folder in a language folder. */
export const SampleSize = {
  Short: 'short',
  Medium: 'medium',
  Long: 'long',
} as const;

export type SampleSize = (typeof SampleSize)[keyof typeof SampleSize];

/** Kinds of diff; each compares its own samples. */
export const DiffKind = {
  Html: 'html',
  Text: 'text',
} as const;

export type DiffKind = (typeof DiffKind)[keyof typeof DiffKind];

/** Languages of the samples and of the diff interface, each named in itself. */
export const LANGUAGE_CHOICES: readonly Choice<SampleLanguage>[] = [
  { value: DiffwiseLanguage.EN, label: 'English' },
  { value: DiffwiseLanguage.PL, label: 'Polski' },
  { value: DiffwiseLanguage.ZH, label: '中文（简体）' },
  { value: DiffwiseLanguage.ES, label: 'Español' },
  { value: DiffwiseLanguage.HI, label: 'हिन्दी' },
  { value: DiffwiseLanguage.FR, label: 'Français' },
  { value: DiffwiseLanguage.RU, label: 'Русский' },
  { value: DiffwiseLanguage.PT, label: 'Português' },
  { value: DiffwiseLanguage.IT, label: 'Italiano' },
  { value: DiffwiseLanguage.JA, label: '日本語' },
  { value: DiffwiseLanguage.DE, label: 'Deutsch' },
  { value: DiffwiseLanguage.KO, label: '한국어' },
];

/** Languages of the plain text samples. */
export const TEXT_SAMPLE_LANGUAGES: readonly SampleLanguage[] = [
  DiffwiseLanguage.EN,
  DiffwiseLanguage.PL,
];

/** Languages of the plain text samples, each named in itself. */
export const TEXT_LANGUAGE_CHOICES = LANGUAGE_CHOICES.filter((choice) =>
  TEXT_SAMPLE_LANGUAGES.includes(choice.value),
);

/** Sizes of the samples, from the shortest. */
export const SIZE_CHOICES: readonly Choice<SampleSize>[] = [
  { value: SampleSize.Short, label: 'Short' },
  { value: SampleSize.Medium, label: 'Medium' },
  { value: SampleSize.Long, label: 'Long' },
];

/** What chooses a sample: the kind of diff, the language and the size. */
export interface SampleChoice {
  readonly kind: DiffKind;
  readonly language: SampleLanguage;
  readonly size: SampleSize;
}

/** The two versions of a sample, HTML documents or plain texts, with the kind of diff that shows them. */
export interface ShownSample {
  readonly kind: DiffKind;
  readonly oldVersion: string;
  readonly newVersion: string;
}

/** A sample as it loads, and the last loaded one. */
export interface LoadedSample {
  /** The chosen sample; its error tells when it could not be loaded. */
  readonly sample: ResourceRef<ShownSample | undefined>;

  /**
   * The last loaded sample. It stays while another one loads, so a diff stays on the page and gets
   * the new versions, as in an app that changes the documents of a diff.
   */
  readonly shownSample: Signal<ShownSample | undefined>;
}

/** File names of the earlier and the later version of a sample. */
const SAMPLE_FILES = ['before', 'after'];

const SAMPLES_FOLDER = 'test-data';

/** Folder of the plain text samples in `test-data/`. */
const TEXT_SAMPLES_FOLDER = 'text';

const PATH_SEPARATOR = '/';
const HTML_EXTENSION = '.html';
const TEXT_EXTENSION = '.txt';
const LOAD_ERROR = 'Could not load a sample file.';

/** Loads the sample of each choice from `test-data/`; call it where `inject()` works. */
export function loadedSample(choice: () => SampleChoice): LoadedSample {
  const sample = resource({
    params: choice,
    loader: async ({ params, abortSignal }) => {
      const paths = SAMPLE_FILES.map((file) => samplePath(params, file));
      const [oldVersion, newVersion] = await Promise.all(
        paths.map((path) => loadText(path, abortSignal)),
      );

      return { kind: params.kind, oldVersion, newVersion };
    },
  });
  const shownSample = linkedSignal<ShownSample | undefined, ShownSample | undefined>({
    source: () => (sample.hasValue() ? sample.value() : undefined),
    computation: (pair, previous) => pair ?? previous?.value,
  });

  return { sample, shownSample };
}

/**
 * Path of a sample file, such as `test-data/en/short/before.html`, or
 * `test-data/text/en/short/before.txt` for a plain text sample.
 */
function samplePath({ kind, language, size }: SampleChoice, file: string): string {
  const isText = kind === DiffKind.Text;
  const folders = isText ? [SAMPLES_FOLDER, TEXT_SAMPLES_FOLDER] : [SAMPLES_FOLDER];
  const extension = isText ? TEXT_EXTENSION : HTML_EXTENSION;

  return [...folders, language, size, file + extension].join(PATH_SEPARATOR);
}

/** The text of a file of the app. */
async function loadText(path: string, abortSignal: AbortSignal): Promise<string> {
  const response = await fetch(path, { signal: abortSignal });

  if (!response.ok) {
    throw new Error(LOAD_ERROR, { cause: response });
  }

  return response.text();
}
