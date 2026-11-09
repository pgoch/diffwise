# Diffwise

Side-by-side diffs of rendered HTML for Angular. Diffwise is a free, standalone component that shows two versions of a document side by side, the way a reader sees them: what changed in the text, not in the markup.

> **Status: version 0.1, an early preview.** It is not on npm yet; the first release will follow soon. The API may change before 1.0.

## Why Diffwise?

Comparing two versions of a rich-text document is a common need: contracts, policies, articles, knowledge bases, CMS content. The existing options fall short:

- Text and code diff viewers compare the HTML source, so readers see tags instead of changes.
- HTML diff libraries merge both versions into a single document, without a side-by-side view, line numbers or table-aware comparison.
- No existing tool combines a modern design, high configurability and on-demand comparison of any two versions.

Diffwise fills that gap:

- You can use it anywhere you have access to the HTML of both versions, whatever editor or system produced it.
- It is designed to be highly configurable, so you can adapt it to your own needs: colors, marking styles, layout, line numbers and the controls your users see.

## What 0.1 does

- Shows two versions side by side, one row per paragraph or heading, with line numbers.
- Tints changed lines and marks the changed words, also inside bold text, links and other formatting.
- Shows an added or a removed paragraph on one side, with an empty place on the other.
- Cleans both versions with DOMPurify, so HTML from users or other systems is safe to show.
- Light, dark and automatic color modes, following the system or the dark mode of your app.
- Interface in English and Polish, or with your own texts.
- Many options for the look: marking styles, color intensity, contrast, line numbers, the column between the versions, fonts and your own colors.
- Configuration on three levels: global defaults, changes while the app runs, and inputs of each diff.

In 0.1, a list, a table or a code block is one line, and changes of formatting, links and images are not marked yet. The [roadmap](docs/roadmap.md) shows when they come, along with a single-column layout, navigation between changes and more languages.

## Installation

```bash
npm install ngx-diffwise
```

Diffwise needs Angular 20 or newer. It runs in the browser; server-side rendering is not supported yet.

## Usage

Import the component and give it both versions of the document:

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

The component works without any setup. To change the defaults of all diffs, add `provideDiffwise()` to the providers of your app:

```ts
import { ApplicationConfig } from '@angular/core';
import { DiffwiseHighlightStyle, provideDiffwise } from 'ngx-diffwise';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDiffwise({
      darkModeSelector: '.dark',
      highlightStyle: DiffwiseHighlightStyle.Underline,
    }),
  ],
};
```

Each option is also an input of the component, such as `[showLineNumbers]="false"`, and the `Diffwise` service changes the options of all diffs while the app runs. [Configuration](docs/configuration.md) lists every option.

## Documentation

- [Overview](docs/overview.md): what Diffwise is, who it is for and what it will show
- [Configuration](docs/configuration.md): every option, the `Diffwise` service and styling with CSS
- [How it works](docs/how-it-works.md): how two HTML documents are compared and displayed
- [Roadmap](docs/roadmap.md): planned releases

## Demo

The demo compares sample documents in English and Polish, with a panel for every option. To run it, clone the repository and start it with a Node.js version that Angular 20 supports, such as 22 or 24:

```bash
git clone https://github.com/pgoch/diffwise.git
cd diffwise
npm install
npm start
```

Then open http://localhost:4200.

## License

[MIT](LICENSE) © 2026 Patryk Goch
