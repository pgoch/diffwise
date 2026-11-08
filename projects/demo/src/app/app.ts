import { ChangeDetectionStrategy, Component, resource, signal } from '@angular/core';
import { DiffwiseHtmlDiff } from 'ngx-diffwise';

type Language = 'en' | 'pl';
type Size = 'short' | 'medium' | 'long';

@Component({
  selector: 'demo-root',
  imports: [DiffwiseHtmlDiff],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly languages: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'pl', label: 'Polski' },
  ];
  protected readonly sizes: { value: Size; label: string }[] = [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' },
  ];

  protected readonly language = signal<Language>('en');
  protected readonly size = signal<Size>('short');

  /** The selected pair of sample documents from `test-data/`. */
  protected readonly sample = resource({
    params: () => ({ language: this.language(), size: this.size() }),
    loader: async ({ params, abortSignal }) => {
      const folder = `test-data/${params.language}/${params.size}`;
      const [oldHtml, newHtml] = await Promise.all(
        ['before', 'after'].map(async (name) => {
          const response = await fetch(`${folder}/${name}.html`, { signal: abortSignal });

          if (!response.ok) {
            throw new Error(`Could not load ${response.url} (${response.status})`);
          }

          return response.text();
        }),
      );

      return { oldHtml, newHtml };
    },
  });

  protected selectLanguage(event: Event): void {
    this.language.set((event.target as HTMLSelectElement).value as Language);
  }

  protected selectSize(event: Event): void {
    this.size.set((event.target as HTMLSelectElement).value as Size);
  }
}
