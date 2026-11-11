# Configuration

This page describes version 0.3. Diffwise works without any setup: every option has a default, and you set only what you want to change.

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
| `highlightChangedLines` | `true`, `false` | `true` | Gives changed lines a light background. A table row gets none, so its cells keep their colors |
| `highlightWholeLines` | `true`, `false` | `false` | Works only when `highlightChangedLines` is `false`. Then `true` marks an added or a removed line as a whole, like changed words, and `false` leaves the change to its number. In a list, it marks the item alone, so its marker and indentation stay. The cells of an added or a removed table row are marked with either value |

### Layout

| Option | Values | Default | What it does |
|---|---|---|---|
| `dividerStyle` | `DiffwiseDividerStyle.Column`, `Line` | `Column` | A gray column or a thin line between the versions |
| `gapStyle` | `DiffwiseGapStyle.Stripes`, `Gray`, `Empty` | `Stripes` | What fills the place opposite an added or a removed line: diagonal stripes, a gray background, or an empty line |
| `versionHeaders` | `DiffwiseVersionHeaders.Default`, `Icons`, `None`, or `{ old, new }` | `Default` | Headers above the versions: "Previous version" and "New version", icons named by these texts, no headers, or your own texts, such as `{ old: 'Version 3 · 12.10.2026', new: 'Version 4 · 05.11.2026' }` |
| `versionHeaderAlignment` | `DiffwiseAlignment.Start`, `Center`, `End` | `Center` | Where the headers sit in their columns. Start and end follow the direction of the text |

### Change details

Changes besides the text, such as italic → bold, another link address, another image, bullets that became numbers or a checked checkbox, have details: a tooltip says what changed. See [How it works](how-it-works.md#5-mark-and-display) for what each change shows.

| Option | Values | Default | What it does |
|---|---|---|---|
| `changeDetails` | `DiffwiseChangeDetails.Hover`, `Icon`, `Both` | `Both` | Where the details show: in a tooltip of the marked text, from an icon in the column between the versions, or both |
| `changeDetailsIconStyle` | `DiffwiseChangeDetailsIconStyle.Plain`, `Gradient`, `Filled` | `Gradient` | The look of the icons: a gray frame, a frame with a gradient from the color of the earlier version to the color of the later one, or a background with that gradient |
| `tooltipColorMode` | `DiffwiseTooltipColorMode.Component`, `Reversed` | `Component` | The colors of the tooltips: those of the diff, or those of the opposite theme, such as dark tooltips on a light diff |
| `highlightTooltipChanges` | `true`, `false` | `true` | Highlights the part of a value that changed, such as `2025` → `2026` in a link address, a file name or an alternative text. With `false`, the tooltip shows whole values |
| `tooltipTitleAlignment` | `DiffwiseAlignment.Start`, `Center`, `End` | `Start` | Where the titles of the tooltips sit. Start and end follow the direction of the text |

A tooltip shows on hover, and when its icon or marked change gets the focus from the keyboard. The pointer can move onto it, and Escape hides it. The icons are in the tab order; with `Hover`, there are no icons, so the marked changes of the later version take the focus instead. An icon is named by the title of its tooltip, and the lines under the title describe it for screen readers.

### Fonts

| Option | Values | Default | What it does |
|---|---|---|---|
| `fontFamily` | `DiffwiseFontFamily.Inherit`, `Builtin`, or a font name | `Inherit` | The font of the element around the diff, the font of the system, or a font your app loads, such as `'Inter'`. The built-in font is used while yours is missing |
| `versionHeaderFontSize` | `0.5` to `10`, in rem | `0.75` | Font size of the headers |
| `lineNumberFontSize` | `0.5` to `10`, in rem | `0.75` | Font size of the line numbers. Their column and the column between the versions, with its icons, grow with it |
| `tooltipFontSize` | `0.5` to `10`, in rem | `0.8` | Font size of the tooltips |

The content keeps the font size of your app. The tooltips have the font of the diff.

### Comparison

| Option | Values | Default | What it does |
|---|---|---|---|
| `ignoreWhitespace` | `true`, `false` | `false` | Ignores differences in whitespace |
| `ignoreCase` | `true`, `false` | `false` | Ignores differences in letter case |
| `ignoreFormatting` | `true`, `false` | `false` | Ignores changes of formatting alone, such as italic → bold, another color or another heading level. It also ignores the look of list markers: bullets that became numbers, another bullet or numbering style, another level of an item, and a paragraph that became a list item or the other way around. Another item number still counts, as readers cite it, as in "see step 6" |
| `ignoreLinkChanges` | `true`, `false` | `false` | Ignores links added, removed or pointing elsewhere around the same text |

Only these options compare the versions again; the other options change only the look. Changes of images and checkboxes always count. [How it works](how-it-works.md#2-read-the-text-and-its-format) describes what counts as formatting.

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

### Texts of the tooltips

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `formattingChangeLabel` | Formatting change | Zmiana formatowania | The title of a tooltip about formatting, and the name of its icon |
| `linkChangeLabel` | Link address changed | Zmieniony adres linku | The title of a tooltip about another address of a link around the same text |
| `addedLinkLabel` | Link added | Dodany link | The title of a tooltip about a link added around unchanged text |
| `removedLinkLabel` | Link removed | Usunięty link | The title of a tooltip about a link removed from unchanged text |
| `imageChangeLabel` | Image changed | Zmieniony obrazek | The title of a tooltip about an image with another file, size or alternative text |
| `listMarkerChangeLabel` | List marker changed | Zmiana punktora | The title of a tooltip about the marker of a list item, such as bullets that became numbers, and the name of its icon |
| `checkedCheckboxLabel` | Checkbox checked | Zaznaczone pole wyboru | The title of a tooltip about a checkbox of a list item that was checked, and the name of its icon |
| `uncheckedCheckboxLabel` | Checkbox cleared | Odznaczone pole wyboru | The same for a checkbox that was cleared |
| `multipleChangesLabel` | Formatting changes: {count} | Zmiany formatowania: {count} | The title of a tooltip about several changes in one line; `{count}` stands for their number |
| `oldValueLabel`, `newValueLabel` | Before, After | Było, Jest | The labels of the old and the new value, such as an address |
| `imageFileLabel` | file | plik | Heads the old and the new file of an image when more of the image changed |
| `imageSizeLabel` | size | rozmiar | Before the old and the new size of an image: "size: 480 × 270 → 640 × 360 px" |
| `imageAltTextLabel` | alternative text | tekst alternatywny | Heads the old and the new alternative text of an image |

### Names of formatting

A tooltip names formatting in three forms: the name, used with an arrow, as in "italic → bold"; the form for formatting added to unchanged text, as in "bold added"; and the form for formatting removed from it. Each form has its own text, since some languages need other word forms, such as Polish "dodane pogrubienie" and "dodana kursywa". The texts follow one pattern: `boldLabel`, `addedBoldLabel`, `removedBoldLabel`.

| Formatting | Texts | English | Polish |
|---|---|---|---|
| Bold | `boldLabel`, `addedBoldLabel`, `removedBoldLabel` | bold, bold added, bold removed | pogrubienie, dodane pogrubienie, usunięte pogrubienie |
| Italic | `italicLabel`, `addedItalicLabel`, `removedItalicLabel` | italic, italic added, italic removed | kursywa, dodana kursywa, usunięta kursywa |
| Underline | `underlineLabel`, `addedUnderlineLabel`, `removedUnderlineLabel` | underline, underline added, underline removed | podkreślenie, dodane podkreślenie, usunięte podkreślenie |
| Strikethrough | `strikethroughLabel`, `addedStrikethroughLabel`, `removedStrikethroughLabel` | strikethrough, strikethrough added, strikethrough removed | przekreślenie, dodane przekreślenie, usunięte przekreślenie |
| Superscript | `superscriptLabel`, `addedSuperscriptLabel`, `removedSuperscriptLabel` | superscript, superscript added, superscript removed | indeks górny, dodany indeks górny, usunięty indeks górny |
| Subscript | `subscriptLabel`, `addedSubscriptLabel`, `removedSubscriptLabel` | subscript, subscript added, subscript removed | indeks dolny, dodany indeks dolny, usunięty indeks dolny |
| Code font | `codeLabel`, `addedCodeLabel`, `removedCodeLabel` | code font, code font added, code font removed | czcionka kodu, dodana czcionka kodu, usunięta czcionka kodu |
| Highlight (`<mark>`) | `textHighlightLabel`, `addedTextHighlightLabel`, `removedTextHighlightLabel` | highlight, highlight added, highlight removed | zakreślenie, dodane zakreślenie, usunięte zakreślenie |
| Smaller font (`<small>`) | `smallTextLabel`, `addedSmallTextLabel`, `removedSmallTextLabel` | smaller font, smaller font added, smaller font removed | mniejsza czcionka, dodana mniejsza czcionka, usunięta mniejsza czcionka |
| Upper case | `uppercaseLabel`, `addedUppercaseLabel`, `removedUppercaseLabel` | uppercase, uppercase added, uppercase removed | wielkie litery, dodane wielkie litery, usunięte wielkie litery |
| Lower case | `lowercaseLabel`, `addedLowercaseLabel`, `removedLowercaseLabel` | lowercase, lowercase added, lowercase removed | małe litery, dodane małe litery, usunięte małe litery |
| Capitalized | `capitalizedLabel`, `addedCapitalizedLabel`, `removedCapitalizedLabel` | capitalized, capitalization added, capitalization removed | wielkie pierwsze litery, dodane wielkie pierwsze litery, usunięte wielkie pierwsze litery |
| Text color | `textColorLabel`, `addedTextColorLabel`, `removedTextColorLabel` | text color, text color added, text color removed | kolor tekstu, dodany kolor tekstu, usunięty kolor tekstu |
| Background color | `backgroundColorLabel`, `addedBackgroundColorLabel`, `removedBackgroundColorLabel` | background color, background color added, background color removed | kolor tła, dodany kolor tła, usunięty kolor tła |
| Font | `fontFamilyLabel`, `addedFontFamilyLabel`, `removedFontFamilyLabel` | font, font added, font removed | czcionka, dodana czcionka, usunięta czcionka |
| Font size | `fontSizeLabel`, `addedFontSizeLabel`, `removedFontSizeLabel` | font size, font size added, font size removed | rozmiar tekstu, dodany rozmiar tekstu, usunięty rozmiar tekstu |
| Alignment | `textAlignmentLabel`, `addedTextAlignmentLabel`, `removedTextAlignmentLabel` | alignment, alignment added, alignment removed | wyrównanie, dodane wyrównanie, usunięte wyrównanie |

A color, a font, a size or an alignment is shown with its value, as in "text color: ■ #c0392b → ■ #1e7d4f" or "font size added: 18px". A few more texts complete the names:

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `headingLabel` | heading {level} | nagłówek {level} | A heading level, as in "heading 3 → heading 2"; `{level}` stands for the level |
| `paragraphLabel` | paragraph | akapit | Text that is not a heading, as in "paragraph → heading 2", or a line that is not a list item, as in "paragraph → bulleted list" |
| `alignLeftLabel`, `alignCenterLabel`, `alignRightLabel`, `alignJustifyLabel` | left, center, right, justified | do lewej, do środka, do prawej, do obu krawędzi | Values of the alignment; rare values, such as `start`, show as CSS writes them |

### Names of list markers

A tooltip about a list marker has a line for each part that changed, in this order: the list type, the style, the number and the level, as in "bulleted list → numbered list" or "number 5 → number 6".

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `bulletedListLabel`, `numberedListLabel` | bulleted list, numbered list | lista punktowana, lista numerowana | The list type, as in "bulleted list → numbered list" |
| `itemNumberLabel` | number {number} | numer {number} | The number of an item, as in "number 5 → number 6"; `{number}` stands for it |
| `listLevelLabel` | level {level} | poziom {level} | How deep an item is nested, as in "level 1 → level 2"; `{level}` stands for it |
| `decimalNumberingLabel` | numbers | cyfry | Numbering with digits: 1, 2, 3 |
| `lowerAlphaNumberingLabel`, `upperAlphaNumberingLabel` | lowercase letters, uppercase letters | małe litery, wielkie litery | Numbering with letters: a, b, c or A, B, C |
| `lowerRomanNumberingLabel`, `upperRomanNumberingLabel` | lowercase Roman numerals, uppercase Roman numerals | małe cyfry rzymskie, wielkie cyfry rzymskie | Numbering with Roman numerals: i, ii, iii or I, II, III |
| `discBulletsLabel`, `circleBulletsLabel`, `squareBulletsLabel` | dots, circles, squares | kropki, kółka, kwadraty | Bullets: filled circles, hollow circles or filled squares |

Rare styles, such as `lower-greek`, show as CSS writes them, as in "numbers → lower-greek".

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
| `--diffwise-tooltip-background`, `--diffwise-tooltip-text`, `--diffwise-tooltip-border` | Background, text and frame of the tooltips |
| `--diffwise-tooltip-shadow` | Shadow of the tooltips |
| `--diffwise-tooltip-removed-highlight`, `--diffwise-tooltip-added-highlight` | Backgrounds of the changed parts of the old and the new value in a tooltip |
| `--diffwise-tooltip-font-size` | Font size of the tooltips |
| `--diffwise-focus` | The outline of an icon or a marked change with the focus |

The options `diffColors`, `lineNumberFontSize`, `versionHeaderFontSize` and `tooltipFontSize` set their variables on the component element. An option your app sets wins over a variable in your CSS; the variable applies while the option has its default.

The tooltip shows in the top layer of the page, so no `overflow` of your app cuts it, but it stays inside the component element, and the variables reach it. `tooltipColorMode: 'reversed'` changes the tooltip variables, as the dark theme does. To change the reversed colors, use its class:

```css
diffwise-html-diff.diffwise-html-diff--tooltip-color-mode-reversed {
  --diffwise-tooltip-background: #0b1f3a;
}
```

### Modifier classes

The component element shows the options in its classes:

- An option with a value other than its default adds a class with its name and value, such as `diffwise-html-diff--gap-style-gray` or `diffwise-html-diff--highlight-style-underline`.
- The levels always have a class, such as `diffwise-html-diff--diff-intensity-3` and `diffwise-html-diff--ui-contrast-3`. In a theme with your own colors, there is no class of the intensity.
- `diffwise-html-diff--no-line-numbers`, `--no-changed-line-highlight`, `--highlight-whole-lines` and `--no-tooltip-change-highlight` turn parts of the diff off or on.
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
| `diffwise-html-diff__highlight`, with `--removed` or `--added` | Changed words, and text with changed formatting or a changed link: `<del>` in the earlier version, `<ins>` in the later one |
| `diffwise-html-diff__highlight--image` | A marker around a changed, added or removed image, together with `--removed` or `--added`: a frame instead of a background |
| `diffwise-html-diff__highlight--list-marker` | A changed list marker that Diffwise draws in place of the browser's, together with `--removed` or `--added`: an empty `<del>` or `<ins>` at the start of the item, which shows the marker |
| `diffwise-html-diff__highlight--checkbox` | A marker around a checked or cleared checkbox of a list item, together with `--removed` or `--added`: a frame instead of a background |
| `diffwise-html-diff__highlight--cell` | A whole cell of an added or removed row or column, together with `diffwise-html-diff__highlight` and `--removed` or `--added`. The classes stand on the cell (`td` or `th`) itself |
| `diffwise-html-diff__change-details-icon`, with `--formatting`, `--link`, `--image`, `--list-marker`, `--checkbox` or `--multiple` | The icon of a row with changes besides the text, in the column between the versions |
| `diffwise-html-diff__change-details-count` | The number of changes on the icon of several changes |
| `diffwise-html-diff__tooltip` | The tooltip; one for each diff |
| `diffwise-html-diff__tooltip-title` | The title of the tooltip, such as "Link address changed" |
| `diffwise-html-diff__tooltip-item` | One of several changes in the tooltip, under a line |
| `diffwise-html-diff__tooltip-subtitle` | The title of one of several changes, or of a part of an image, such as "alternative text" |
| `diffwise-html-diff__tooltip-description` | A line that describes a change, such as "italic → bold" |
| `diffwise-html-diff__tooltip-row` | A row with a label and a value, such as the old address |
| `diffwise-html-diff__tooltip-label`, `diffwise-html-diff__tooltip-value` | The label and the value of that row |
| `diffwise-html-diff__tooltip-highlight`, with `--removed` or `--added` | The changed part of a value |
| `diffwise-html-diff__tooltip-color` | A swatch before a color |
