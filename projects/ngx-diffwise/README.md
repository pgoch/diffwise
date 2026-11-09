# ngx-diffwise

Side-by-side diffs of rendered HTML for Angular. Diffwise shows two versions of a document side by side, the way a reader sees them, with the changed lines and words marked.

> Version 0.1, an early preview. The API may change before 1.0.

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

Every option, the `Diffwise` service and styling with CSS are described in the [configuration guide](https://github.com/pgoch/diffwise/blob/master/docs/configuration.md). Goals, the roadmap and a demo are in the [project README](https://github.com/pgoch/diffwise#readme).

## License

MIT © 2026 Patryk Goch
