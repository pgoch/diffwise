# Diffwise

Side-by-side diffs of rendered HTML for Angular. Diffwise is a free, standalone component that shows two versions of a document side by side, the way a reader sees them: what changed in the text, not in the markup.

> **Status: version 0.4, an early preview.** It is not on npm yet; the first release is planned after version 0.5, with the interface in 12 languages. The API may change before 1.0.

## Why Diffwise?

Comparing two versions of a rich-text document is a common need: contracts, policies, articles, knowledge bases, CMS content. The existing options fall short:

- Text and code diff viewers compare the HTML source, so readers see tags instead of changes.
- HTML diff libraries merge both versions into a single document, without a side-by-side view, line numbers or table-aware comparison.
- No existing tool combines a modern design, high configurability and on-demand comparison of any two versions.

Diffwise fills that gap:

- You can use it anywhere you have access to the HTML of both versions, whatever editor or system produced it.
- It is designed to be highly configurable, so you can adapt it to your own needs: colors, marking styles, layout, line numbers and the controls your users see.

## What 0.4 does

- Shows two versions side by side, one row per paragraph, heading, list item or table row, with line numbers.
- Shows a single column in a narrow diff, or always: each changed line merged into one, optionally with the removed text struck through, or the old line above the new one.
- Tints changed lines and marks the changed words, also inside bold text, links and other formatting.
- Marks changes of formatting, links and images in text that stayed: italic → bold, another color or heading level, another link address, an added link, an image with another file, size or alternative text.
- Marks changes of list markers and task lists: bullets that became numbers, another numbering style, number or level, a checkbox checked or cleared.
- Shows the rows of a table as one table, with its columns matched between the versions: an added column or row is marked whole, and a changed cell only where it changed.
- Shows what changed in a tooltip, from an icon between the versions or on the marked text, such as the old and the new address with the changed part highlighted.
- Shows an added or a removed paragraph, list item or table row on one side, with an empty place on the other.
- Hides unchanged lines far from changes behind a bar, which shows them on a click.
- A toolbar that stays on top while the page scrolls, with arrows between the changes and the numbers of added, removed and changed lines.
- View settings for the users of your app: layout, theme and hidden lines. Their choices can be remembered in the browser, or exported to your app and imported back.
- Cleans both versions with DOMPurify, so HTML from users or other systems is safe to show.
- Light, dark and automatic color modes, following the system or the dark mode of your app.
- Interface in English and Polish, or with your own texts.
- Many options for the look: marking styles, color intensity, contrast, line numbers, the column between the versions, icons, tooltips, fonts and your own colors.
- Options to ignore whitespace, letter case, formatting or link changes.
- Configuration on three levels: global defaults, changes while the app runs, and inputs of each diff.

A code block is still one line. The [roadmap](docs/roadmap.md) shows what comes next: more languages, a colorblind-friendly palette and diffs of plain text.

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

The diff tells your app what it found. After each comparison, `(diffStatsComputed)` emits the numbers of changed lines, and `hasChanges` is `false` when the versions are the same:

```ts
import { Component, signal } from '@angular/core';
import { type DiffwiseDiffStats, DiffwiseHtmlDiff } from 'ngx-diffwise';

@Component({
  selector: 'app-policy-history',
  imports: [DiffwiseHtmlDiff],
  template: `
    <diffwise-html-diff [oldHtml]="previous" [newHtml]="current" (diffStatsComputed)="stats.set($event)" />
    @if (stats()?.hasChanges === false) {
      <p>This version changed nothing.</p>
    }
  `,
})
export class PolicyHistory {
  protected readonly previous = '<p>You can return a product within 14 days.</p>';
  protected readonly current = '<p>You can return a product within 30 days.</p>';
  protected readonly stats = signal<DiffwiseDiffStats | null>(null);
}
```

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
