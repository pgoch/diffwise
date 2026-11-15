# ngx-diffwise

Side-by-side diffs of rendered HTML for Angular. Diffwise shows two versions of a document side by side or in a single column, the way a reader sees them, with the changed lines, words, formatting, links, images, list markers and table cells marked. A toolbar steps between the changes, counts them, and lets your users choose the layout and the theme.

> Version 0.4, an early preview. The API may change before 1.0.

## Installation

```bash
npm install ngx-diffwise
```

Diffwise needs Angular 20 or newer. It runs in the browser; server-side rendering is not supported yet.

## Usage

```ts
import { Component } from '@angular/core';
import { DiffwiseHtmlDiff } from 'ngx-diffwise';

@Component({
  selector: 'app-policy-history',
  imports: [DiffwiseHtmlDiff],
  template: `<diffwise-html-diff [oldHtml]="previous" [newHtml]="current" />`,
})
export class PolicyHistory {
  protected readonly previous = '<h2>Returns</h2><p>You can return a product within 14 days.</p>';
  protected readonly current = '<h2>Returns</h2><p>You can return a product within 30 days.</p>';
}
```

After each comparison, `(diffStatsComputed)` emits the numbers of changed lines, and `hasChanges` is `false` when the versions are the same:

```html
<diffwise-html-diff [oldHtml]="previous" [newHtml]="current" (diffStatsComputed)="stats.set($event)" />
```

Every option, the settings for the user, the events, the `Diffwise` service and styling with CSS are described in the [configuration guide](https://github.com/pgoch/diffwise/blob/master/docs/configuration.md). Goals, the roadmap and a demo are in the [project README](https://github.com/pgoch/diffwise#readme).

## License

MIT © 2026 Patryk Goch
