# ngx-diffwise

[Website](https://pgoch.github.io/diffwise/) · [Configurator](https://pgoch.github.io/diffwise/#configurator) · [Demo](https://pgoch.github.io/diffwise/#demo)

Side-by-side diffs of rendered HTML and plain text for Angular. Diffwise shows two versions of a document side by side or in a single column, the way a reader sees them, with the changed lines, words, formatting, links, images, list markers and table cells marked. A second component compares plain text line by line, with spaces, tabs and indentation as in the text. A toolbar steps between the changes, counts them, and lets your users choose the layout, the theme and the colors of changes, such as a colorblind-friendly or a high contrast palette. The interface comes in 12 languages and works with screen readers and the keyboard.

> Version 0.9, an early preview. The API may change before 1.0.

## Installation

```bash
npm install ngx-diffwise
```

Diffwise needs Angular 20 or newer. It runs in the browser; server-side rendering is not supported yet.

## Usage

```ts
import { Component } from '@angular/core';
import { DiffwiseHtml } from 'ngx-diffwise';

@Component({
  selector: 'app-policy-history',
  imports: [DiffwiseHtml],
  template: `<diffwise-html [oldHtml]="previous" [newHtml]="current" />`,
})
export class PolicyHistory {
  protected readonly previous = '<h2>Returns</h2><p>You can return a product within 14 days.</p>';
  protected readonly current = '<h2>Returns</h2><p>You can return a product within 30 days.</p>';
}
```

Plain text goes to `<diffwise-text>` (`DiffwiseText`), which takes the same options:

```html
<diffwise-text [oldText]="previousSettings" [newText]="currentSettings" />
```

The interface is in English. Your app adds the other languages it uses, among eleven, in its providers, such as `provideDiffwiseLanguages(diffwisePolish, diffwiseGerman)`; the others stay out of its bundle.

After each comparison, `(diffStatsComputed)` emits the numbers of changed lines, and `hasChanges` is `false` when the versions are the same:

```html
<diffwise-html [oldHtml]="previous" [newHtml]="current" (diffStatsComputed)="stats.set($event)" />
```

Every option, the settings for the user, the events, the `Diffwise` service and styling with CSS are described in the [configuration guide](https://github.com/pgoch/diffwise/blob/master/docs/configuration.md). What the diff does for the keyboard, screen readers and contrast is in the [accessibility guide](https://github.com/pgoch/diffwise/blob/master/docs/accessibility.md). Goals, the roadmap, a demo and a configurator that builds your configuration step by step are in the [project README](https://github.com/pgoch/diffwise#readme).

## License

MIT © 2026 Patryk Goch
