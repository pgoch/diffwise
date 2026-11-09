# Configuration

This page describes version 0.1. Diffwise works without any setup: every option has a default, and you set only what you want to change.

## Where to set options

Options come from three levels. For each option, the most specific level that sets it wins.

1. **One diff.** Each option is also an input of the component. The `config` input takes several options at once; a single input wins over the same option in `config`.

   ```html
   <diffwise-html-diff [oldHtml]="previous" [newHtml]="current" [showLineNumbers]="false" />
   <diffwise-html-diff [oldHtml]="previous" [newHtml]="current" [config]="compactView" />
   ```

2. **All diffs, while the app runs.** `updateConfig()` of the `Diffwise` service changes the global configuration, and the diffs follow at once.

   ```ts
   private readonly diffwise = inject(Diffwise);

   showCompactView(): void {
     this.diffwise.updateConfig({ showLineNumbers: false, gapStyle: DiffwiseGapStyle.Gray });
   }
   ```

3. **All diffs, from the start.** `provideDiffwise()` in the providers of your app sets the starting global configuration.

   ```ts
   export const appConfig: ApplicationConfig = {
     providers: [provideDiffwise({ darkModeSelector: '.dark', uiContrast: 4 })],
   };
   ```

An option that no level sets keeps its default. Each level changes only the options it sets, so a diff with its own `showLineNumbers` still follows the global `colorMode`.

### Values

An option with a fixed set of values has a constant, such as `DiffwiseGapStyle.Gray`. The constants give you autocompletion and catch typos. Plain strings, such as `'gray'`, work too, for example in a configuration loaded from JSON.

### Invalid values

A value an option does not take, such as a wrong type or a number out of range, is ignored: the option keeps its value from the level below, or its default. An unknown option name is ignored too. In development mode, the console shows a warning for each.

### `DiffwiseConfig`

A configuration can also be a `DiffwiseConfig` object. It holds every option with its default, cannot be changed, and `with()` returns a changed copy.

```ts
const compactView = new DiffwiseConfig({ showLineNumbers: false });
const darkCompactView = compactView.with({ colorMode: DiffwiseColorMode.Dark });
```

`provideDiffwise()`, `updateConfig()` and the `config` input take a `DiffwiseConfig` or a plain object. A `DiffwiseConfig` changes only the options given to it, so passing one to a diff keeps the other options of the global configuration.

## Options

### Colors

| Option | Values | Default | What it does |
|---|---|---|---|
| `colorMode` | `DiffwiseColorMode.Auto`, `Light`, `Dark` | `Auto` | Light or dark theme. `Auto` follows the system, or your app with `darkModeSelector` |
| `darkModeSelector` | a CSS selector, such as `'.dark'`, or `null` | `null` | In `Auto` mode, the diff is dark while it is inside an element that matches the selector, such as `<html class="dark">`, and switches as soon as the class changes. `null` follows the system |
| `highlightStyle` | `DiffwiseHighlightStyle.Outline`, `Background`, `Underline`, `TopBottom` | `Outline` | How changed words are marked. All styles share the same background and differ only in the lines drawn over it, so switching styles never moves the text |
| `diffIntensity` | `1` to `5` | `3` | Strength of the change colors. The backgrounds of changed lines and of changed words change together |
| `uiContrast` | `1` to `5` | `3` | How much everything besides the content stands out: the headers, the line numbers and the column between the versions |
| `diffColors` | `DiffwiseDiffColors`, or `null` | none | Your own colors of changes; see [Your own colors](#your-own-colors) |

### Lines

| Option | Values | Default | What it does |
|---|---|---|---|
| `showLineNumbers` | `true`, `false` | `true` | Shows the number of each line. Each version is numbered from 1 |
| `lineNumberStyle` | `DiffwiseLineNumberStyle.Bar`, `Background` | `Bar` | What the number of a changed line gets: a colored number with a bar, or a colored background |
| `lineNumberAlignment` | `DiffwiseVerticalAlignment.Top`, `Middle`, `Bottom` | `Top` | Where a number sits next to a line of several rows of text: at its first row, in the middle or at its last row |
| `highlightChangedLines` | `true`, `false` | `true` | Gives changed lines a light background |
| `highlightWholeLines` | `true`, `false` | `false` | Works only when `highlightChangedLines` is `false`. Then `true` marks an added or a removed line as a whole, like changed words, and `false` leaves the change to its number |

### Layout

| Option | Values | Default | What it does |
|---|---|---|---|
| `dividerStyle` | `DiffwiseDividerStyle.Column`, `Line` | `Column` | A gray column or a thin line between the versions |
| `gapStyle` | `DiffwiseGapStyle.Stripes`, `Gray`, `Empty` | `Stripes` | What fills the place opposite an added or a removed line: diagonal stripes, a gray background, or an empty line |
| `versionHeaders` | `DiffwiseVersionHeaders.Default`, `Icons`, `None`, or `{ old, new }` | `Default` | Headers above the versions: "Previous version" and "New version", icons named by these texts, no headers, or your own texts, such as `{ old: 'Version 3 · 12.10.2026', new: 'Version 4 · 05.11.2026' }` |
| `versionHeaderAlignment` | `DiffwiseAlignment.Start`, `Center`, `End` | `Center` | Where the headers sit in their columns. Start and end follow the direction of the text |

### Fonts

| Option | Values | Default | What it does |
|---|---|---|---|
| `fontFamily` | `DiffwiseFontFamily.Inherit`, `Builtin`, or a font name | `Inherit` | The font of the element around the diff, the font of the system, or a font your app loads, such as `'Inter'`. The built-in font is used while yours is missing |
| `versionHeaderFontSize` | `0.5` to `10`, in rem | `0.75` | Font size of the headers |
| `lineNumberFontSize` | `0.5` to `10`, in rem | `0.75` | Font size of the line numbers. Their column and the column between the versions grow with it |

The content keeps the font size of your app.

### Comparison

| Option | Values | Default | What it does |
|---|---|---|---|
| `ignoreWhitespace` | `true`, `false` | `false` | Ignores differences in whitespace |
| `ignoreCase` | `true`, `false` | `false` | Ignores differences in letter case |

### Language

| Option | Values | Default | What it does |
|---|---|---|---|
| `language` | `DiffwiseLanguage.Auto`, `EN`, `PL` | `Auto` | Language of the interface. `Auto` takes the language of your app from `LOCALE_ID`, without the region, so `pl-PL` gives Polish. A language the interface has no texts in gives English |
| `customTexts` | `DiffwiseCustomTexts`, or `null` | none | Your own texts of the interface; see [Your own texts](#your-own-texts) |

## Your own colors

`diffColors` takes colors of changes for the light and the dark theme. Any CSS color works, and a color you leave out comes from the built-in palette.

```ts
provideDiffwise({
  diffColors: {
    light: { removedAccent: '#a21caf', addedAccent: '#0f766e' },
    dark: { removedAccent: '#f0abfc', addedAccent: '#5eead4' },
  },
});
```

| Color | What it colors |
|---|---|
| `removedLine`, `addedLine` | The background of a changed line in the earlier and in the later version |
| `removedHighlight`, `addedHighlight` | The background of removed and of added words |
| `removedAccent`, `addedAccent` | The lines of the marking style, and the bar and the number of a changed line |

In a theme with your colors, `diffIntensity` does not apply. Each level of the configuration changes only the colors it sets. `null` takes away the colors of the levels below, for example `updateConfig({ diffColors: null })` returns all diffs to the built-in palette.

## Your own texts

`customTexts` replaces texts of the interface. A text you leave out stays in the language of the interface, and all of them together add a language.

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `oldVersionLabel` | Previous version | Poprzednia wersja | The header of the earlier version, or the name and the tooltip of its icon |
| `newVersionLabel` | New version | Nowa wersja | The same for the later version |
| `diffLabel` | Comparison of document versions | Porównanie wersji dokumentu | The name of the diff for screen readers; it does not show on the screen |

```ts
provideDiffwise({ customTexts: { oldVersionLabel: 'Draft', newVersionLabel: 'Published' } });
```

Each level of the configuration changes only the texts it sets. `null` takes away the texts of the levels below. The component element has the `region` role, named by `diffLabel`; to name it with a heading of your page instead, set `aria-labelledby` on the element.

## The `Diffwise` service

| Member | What it does |
|---|---|
| `config` | The global configuration, as a signal |
| `updateConfig(changes)` | Changes the given options of the global configuration; the diffs follow at once |
| `switchToDarkMode()`, `switchToLightMode()`, `switchToAutoMode()` | Set `colorMode` of the global configuration |
| `toggleDarkMode()` | Switches to the theme opposite to the one the diffs show now |

A diff that sets an option through an input or `config` keeps its value when the global configuration changes.

## Styling with CSS

The component has no view encapsulation. Its classes start with `diffwise-html-diff` and follow BEM.

### Variables

Override the variables on the component element, with any selector. A value set higher up, such as on `<body>`, does not reach the diff, which has its own defaults.

```css
diffwise-html-diff {
  --diffwise-link: #0b57d0;
}

diffwise-html-diff.diffwise-html-diff--dark-theme {
  --diffwise-link: #8ab4f8;
}
```

| Variable | What it is |
|---|---|
| `--diffwise-background`, `--diffwise-text` | Background and text |
| `--diffwise-ink` | The color mixed into the background for the grays: line numbers, the column between the versions, the stripes |
| `--diffwise-muted`, `--diffwise-border`, `--diffwise-link` | Text of the headers, lines, links in the content |
| `--diffwise-removed-base`, `--diffwise-added-base` | Base colors of changes, mixed with the background |
| `--diffwise-removed-accent`, `--diffwise-added-accent` | Accents: lines of the marking style, bars and numbers of changed lines |
| `--diffwise-removed-line`, `--diffwise-added-line` | Backgrounds of changed lines |
| `--diffwise-removed-highlight`, `--diffwise-added-highlight` | Backgrounds of changed words |
| `--diffwise-removed-line-number`, `--diffwise-added-line-number` | Colored backgrounds of numbers with `lineNumberStyle: 'background'` |
| `--diffwise-line-share`, `--diffwise-highlight-share`, `--diffwise-line-number-share` | How much of the base colors the backgrounds take; set by `diffIntensity` |
| `--diffwise-contrast`, `--diffwise-line-number-text-share` | How much ink the grays take, and how strong the digits are; set by `uiContrast` |
| `--diffwise-gap-gray` | The background of the gap with `gapStyle: 'gray'` |
| `--diffwise-line-number-font-size`, `--diffwise-version-header-font-size` | Font sizes |
| `--diffwise-line-number-digits` | Digits of the highest line number, which set the width of the numbers; the component sets it |

The options `diffColors`, `lineNumberFontSize` and `versionHeaderFontSize` set their variables on the component element. An option your app sets wins over a variable in your CSS; the variable applies while the option has its default.

### Modifier classes

The component element shows the options in its classes:

- An option with a value other than its default adds a class with its name and value, such as `diffwise-html-diff--gap-style-gray` or `diffwise-html-diff--highlight-style-underline`.
- The levels always have a class, such as `diffwise-html-diff--diff-intensity-3` and `diffwise-html-diff--ui-contrast-3`. In a theme with your own colors, there is no class of the intensity.
- `diffwise-html-diff--no-line-numbers`, `--no-changed-line-highlight` and `--highlight-whole-lines` turn parts of the lines off or on.
- `diffwise-html-diff--dark-theme` shows the dark theme.

### Parts of the view

| Class | What it is |
|---|---|
| `diffwise-html-diff__version-headers` | The row of the headers |
| `diffwise-html-diff__version-header`, with `--old` or `--new` | The header of one version |
| `diffwise-html-diff__version-header-icon` | An icon in place of a header text |
| `diffwise-html-diff__row`, with `--unchanged`, `--changed`, `--added` or `--removed` | One row of the view |
| `diffwise-html-diff__line-number`, with `--old` or `--new` | The cell of a line number |
| `diffwise-html-diff__line-number-value` | The number in that cell |
| `diffwise-html-diff__content`, with `--old` or `--new` | The content of a line |
| `diffwise-html-diff__divider` | The column between the versions |
| `diffwise-html-diff__gap` | The empty place opposite an added or a removed line |
| `diffwise-html-diff__highlight`, with `--removed` or `--added` | Changed words: `<del>` in the earlier version, `<ins>` in the later one |
