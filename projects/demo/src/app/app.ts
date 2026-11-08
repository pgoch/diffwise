import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import {
  Diffwise,
  DiffwiseColorMode,
  DiffwiseHtmlDiff,
  DiffwiseVersionHeaders,
  type DiffwiseVersionHeaderTexts,
} from 'ngx-diffwise';

/** Languages of the sample documents; each one is a folder in `test-data/`. */
const SampleLanguage = {
  English: 'en',
  Polish: 'pl',
} as const;

type SampleLanguage = (typeof SampleLanguage)[keyof typeof SampleLanguage];

/** Sizes of the sample documents; each one is a folder in a language folder. */
const SampleSize = {
  Short: 'short',
  Medium: 'medium',
  Long: 'long',
} as const;

type SampleSize = (typeof SampleSize)[keyof typeof SampleSize];

/** File names of the earlier and the later version of a sample. */
const SAMPLE_FILES = ['before', 'after'];

const SAMPLES_FOLDER = 'test-data';
const PATH_SEPARATOR = '/';
const HTML_EXTENSION = '.html';
const LOAD_ERROR = 'Could not load a sample file.';

/** An option of a select in the demo header. */
interface Choice<T> {
  readonly value: T;
  readonly label: string;
}

const LANGUAGE_CHOICES: readonly Choice<SampleLanguage>[] = [
  { value: SampleLanguage.English, label: 'English' },
  { value: SampleLanguage.Polish, label: 'Polski' },
];

const SIZE_CHOICES: readonly Choice<SampleSize>[] = [
  { value: SampleSize.Short, label: 'Short' },
  { value: SampleSize.Medium, label: 'Medium' },
  { value: SampleSize.Long, label: 'Long' },
];

/** A value of the `versionHeaders` option. */
type VersionHeaders = DiffwiseVersionHeaders | DiffwiseVersionHeaderTexts;

/** Header choices; the custom texts show how an app can name its versions. */
const VERSION_HEADER_CHOICES: readonly Choice<VersionHeaders>[] = [
  { value: DiffwiseVersionHeaders.Default, label: 'Default' },
  { value: DiffwiseVersionHeaders.Icons, label: 'Icons' },
  {
    value: { old: 'Version 3 · 12.10.2026', new: 'Version 4 · 05.11.2026' },
    label: 'Custom texts',
  },
  { value: DiffwiseVersionHeaders.None, label: 'None' },
];

@Component({
  selector: 'demo-root',
  imports: [DiffwiseHtmlDiff],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly languages = LANGUAGE_CHOICES;
  protected readonly sizes = SIZE_CHOICES;
  protected readonly versionHeaderChoices = VERSION_HEADER_CHOICES;
  protected readonly colorModes = DiffwiseColorMode;

  /** Changes the global configuration; the theme buttons call its methods. */
  protected readonly diffwise = inject(Diffwise);

  protected readonly language = signal<SampleLanguage>(SampleLanguage.English);
  protected readonly size = signal<SampleSize>(SampleSize.Short);

  /** Index of the header choice; the first one is set in `app.config.ts`. */
  protected readonly versionHeaderChoice = signal(0);

  /** Line numbers of the diff, set through its input. */
  protected readonly showLineNumbers = signal(true);

  /** Color mode of the global configuration; its button is shown pressed. */
  protected readonly colorMode = computed(() => this.diffwise.config().colorMode);

  /** The selected pair of sample documents from `test-data/`. */
  protected readonly sample = resource({
    params: () => ({ language: this.language(), size: this.size() }),
    loader: async ({ params, abortSignal }) => {
      const paths = SAMPLE_FILES.map((file) => samplePath(params.language, params.size, file));
      const [oldHtml, newHtml] = await Promise.all(
        paths.map((path) => loadText(path, abortSignal)),
      );

      return { oldHtml, newHtml };
    },
  });

  protected selectLanguage(event: Event): void {
    this.language.set((event.target as HTMLSelectElement).value as SampleLanguage);
  }

  protected selectSize(event: Event): void {
    this.size.set((event.target as HTMLSelectElement).value as SampleSize);
  }

  /** Changes the headers in the global configuration, as an app can do while it runs. */
  protected selectVersionHeaders(event: Event): void {
    const index = Number((event.target as HTMLSelectElement).value);

    this.versionHeaderChoice.set(index);
    this.diffwise.updateConfig({ versionHeaders: VERSION_HEADER_CHOICES[index].value });
  }

  protected toggleLineNumbers(event: Event): void {
    this.showLineNumbers.set((event.target as HTMLInputElement).checked);
  }
}

/** Path of a sample file, such as `test-data/en/short/before.html`. */
function samplePath(language: SampleLanguage, size: SampleSize, file: string): string {
  return [SAMPLES_FOLDER, language, size, file + HTML_EXTENSION].join(PATH_SEPARATOR);
}

async function loadText(path: string, abortSignal: AbortSignal): Promise<string> {
  const response = await fetch(path, { signal: abortSignal });

  if (!response.ok) {
    throw new Error(LOAD_ERROR, { cause: response });
  }

  return response.text();
}
