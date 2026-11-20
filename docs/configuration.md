# Configuration

This page describes version 0.8. Diffwise works without any setup: every option has a default, and you set only what you want to change. The configurator of the [demo app](../README.md#demo) leads you through the options step by step, with a live preview, and gives you the configuration of your choices, ready to copy.

## Two diffs

Diffwise has two components with the same view:

- `<diffwise-html>` (`DiffwiseHtml`) compares two HTML documents, given in `oldHtml` and `newHtml`.
- `<diffwise-text>` (`DiffwiseText`) compares two plain texts line by line, given in `oldText` and `newText`.

```html
<diffwise-text [oldText]="previousSettings" [newText]="currentSettings" />
```

Both take the same options, emit the same events, have the same methods, and share the global configuration and the choices of the user. The examples on this page use `DiffwiseHtml`; `DiffwiseText` works the same way.

Plain text has no formatting, links or images, so a few options do nothing in the text diff: `changeDetails`, `changeDetailsIconStyle`, `tooltipColorMode`, `highlightTooltipChanges`, `tooltipTitleAlignment`, `tooltipFontSize`, `ignoreFormatting` and `ignoreLinkChanges`. Four options belong to the text diff alone: `wrapLines` and `showAllWhitespace` (see [Lines](#lines)), `textFont` (see [Fonts](#fonts)) and `ignoreBlankLines` (see [Comparison](#comparison)). [How it works](how-it-works.md#plain-text) describes how plain text is compared.

## Where to set options

Options come from three levels of your app. For each option, the most specific level that sets it wins. Above them all stand the choices of the user in the view settings of the toolbar; see [Settings for the user](#settings-for-the-user).

1. **One diff.** Each option is also an input of the component. The `config` input takes several options at once; a single input wins over the same option in `config`.

   ```html
   <diffwise-html [oldHtml]="previous" [newHtml]="current" [showLineNumbers]="false" />
   <diffwise-html [oldHtml]="previous" [newHtml]="current" [config]="compactView" />
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

In short, from the strongest: a choice of the user in the view settings, a single input of the diff, the `config` input, the global configuration, the default.

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
| `diffPalette` | `DiffwisePalette.Default`, `Colorblind`, `HighContrast` | `Default` | Colors of changes: red for removed and green for added; orange and blue, which colorblind readers tell apart; or high contrast, with no colored backgrounds. The user can choose another palette in the view settings |
| `highlightStyle` | `DiffwiseHighlightStyle.Outline`, `Background`, `Underline`, `TopBottom` | `Outline` | How changed words are marked. All styles share the same background and differ only in the lines drawn over it, so switching styles never moves the text |
| `diffIntensity` | `1` to `5` | `3` | Strength of the change colors. The backgrounds of changed lines and of changed words change together |
| `uiContrast` | `1` to `5` | `3` | How much everything besides the content stands out: the headers, the line numbers and the column between the versions |
| `diffColors` | `DiffwiseDiffColors`, or `null` | none | Your own colors of changes; see [Your own colors](#your-own-colors) |

**Palettes.** The colorblind-friendly palette changes only the colors: removed changes are orange and added ones blue, in both themes, and the outline of the focus is teal, so it stands apart from the blue. The high contrast palette has no colored backgrounds. A changed part stands in a frame in every marking style: solid and blue when added, dashed, orange and struck through when removed. A changed line has a bar at its number, also with `lineNumberStyle: 'background'`, and the same bar at its start when the line numbers are hidden. Its colors are dark in the light theme and light in the dark one, and `diffIntensity` has no backgrounds to change. [Accessibility](accessibility.md) describes the contrast of the palettes and the high contrast mode of Windows.

### Lines

| Option | Values | Default | What it does |
|---|---|---|---|
| `showLineNumbers` | `true`, `false` | `true` | Shows the number of each line. Each version is numbered from 1 |
| `lineNumberStyle` | `DiffwiseLineNumberStyle.Bar`, `Background` | `Bar` | What the number of a changed line gets: a colored number with a bar, or a colored background |
| `lineNumberAlignment` | `DiffwiseVerticalAlignment.Top`, `Middle`, `Bottom` | `Top` | Where a number sits next to a line of several rows of text: at its first row, in the middle or at its last row |
| `highlightChangedLines` | `true`, `false` | `true` | Gives changed lines a light background. A table row gets none, so its cells keep their colors |
| `highlightWholeLines` | `true`, `false` | `false` | Works only when `highlightChangedLines` is `false`. Then `true` marks an added or a removed line as a whole, like changed words, and `false` leaves the change to its number. In a list, it marks the item alone, so its marker and indentation stay. The cells of an added or a removed table row are marked with either value |
| `hideUnchangedLines` | `true`, `false` | `false` | Hides unchanged lines far from changes behind a bar, such as "Show hidden lines: 12". A click on the bar shows them. Changed, added and removed lines always show |
| `contextLines` | `1` to `100` | `3` | With `hideUnchangedLines`, the unchanged lines that stay shown above and below each change |
| `wrapLines` | `true`, `false` | `true` | Only in the text diff: breaks a long line into several rows of text. With `false`, each line stays in one row, and the lines of both versions scroll sideways together: by the scrollbars under the versions, which stay at the bottom of the window while the diff is in view, or with `Shift` and the wheel, or a touchpad, over a line. The line numbers stay in place. The user can switch it in the view settings |
| `showAllWhitespace` | `true`, `false` | `false` | Only in the text diff: shows each space as `·` and each tab as `→` in every line, lighter outside changed text. With `false`, only changed spaces and tabs show them. The user can switch it in the view settings |
| `largeDocumentLines` | a whole number from `0` | `20000` | From this number of lines of the longer version, the diff shows a panel with a button in place of the rows, and draws the rows when the user asks for them. `0` turns it off |

Hidden lines are not rendered at all, so a long document with few changes opens faster. A single unchanged line is never hidden, as its bar would take as much room. Lines the user has shown stay shown until the versions or the options of the comparison change, or until `hideUnchangedLines` or `contextLines` changes. With `dividerStyle: 'line'`, the bar is a small button on the line between the versions, "Hidden lines: 12".

**Large documents.** Drawing tens of thousands of lines takes seconds. From `largeDocumentLines` lines of the longer version, the diff still compares the versions at once, so the toolbar shows the numbers of changes and `(diffStatsComputed)` emits them, but in place of the rows it shows the sentence "The document is too large to load without confirmation." and the button "Show the comparison", where the version headers stand: in the middle, unless `versionHeaderAlignment` says otherwise. The button draws the rows in parts, as after each comparison, and the focus moves to the diff, since the button goes. A step of the navigation draws them too. New versions show the panel again; other options keep the rows. Until the rows show, the find of the browser does not see them, and printing prints the panel.

### Layout

| Option | Values | Default | What it does |
|---|---|---|---|
| `layout` | `DiffwiseLayout.Auto`, `SideBySide`, `Inline` | `Auto` | The versions side by side, or a single column. `Auto` shows a single column while the diff is narrower than `layoutBreakpoint`, and switches as its width changes |
| `layoutBreakpoint` | a number above `0`, in pixels | `768` | The width of the diff under which `Auto` shows a single column. It is the width of the component, not of the window, so a diff in a narrow panel of a wide page shows a single column too |
| `inlineDiffStyle` | `DiffwiseInlineDiffStyle.Merged`, `Strikethrough`, `Stacked` | `Merged` | How the single column shows a changed line: one line with the removed text right before the added text that replaced it, the same with the removed text struck through, or the old line above the new one |
| `dividerStyle` | `DiffwiseDividerStyle.Column`, `Line` | `Column` | A gray column or a thin line between the versions |
| `gapStyle` | `DiffwiseGapStyle.Stripes`, `Gray`, `Empty` | `Stripes` | What fills the place opposite an added or a removed line: diagonal stripes, a gray background, or an empty line |
| `showVersionHeaders` | `true`, `false` | `true` | Shows the headers above the versions. With `false`, the options of the headers change nothing |
| `versionHeaders` | `DiffwiseVersionHeaders.Default`, `Icons`, or `{ old, new }` | `Default` | What the headers show: "Previous version" and "New version", icons named by these texts, or your own texts, such as `{ old: 'Version 3 · 12.10.2026', new: 'Version 4 · 05.11.2026' }` |
| `versionHeaderAlignment` | `DiffwiseAlignment.Start`, `Center`, `End` | `Center` | Where the headers sit in their columns. Start and end follow the direction of the text |

Until the diff knows its width, `Auto` shows the versions side by side. The single column shows each line once: an unchanged line in its new version, under the numbers of both versions; a removed line under its old number; an added line under its new one. Two columns of numbers stand before the content, with "before" and "after" icons above them, named by `oldVersionLabel` and `newVersionLabel`. With `versionHeaders: 'default'`, the header above the content says "Content after changes"; with your own texts, it shows both, as in "Version 3 → Version 4". The icons of changes stand in a narrow column next to the content.

A merged line keeps the formatting of both versions: the removed text in its own formatting, where it stood in the old line. A changed image shows as the old and the new image with an arrow between them, and a changed list marker or checkbox shows its old version before the new one. A row of a table merges into one row with the columns of both versions. A pair of lines that cannot merge into valid HTML stays as the old line above the new one.

### Change details

Changes besides the text, such as italic → bold, another link address or another image, have details: a tooltip says what changed. Changes of list markers and checkboxes, such as bullets that became numbers or a checked checkbox, are marked without details, as both versions show them. See [How it works](how-it-works.md#5-mark-and-display) for what each change shows.

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
| `textFont` | `DiffwiseTextFont.Monospace`, `Proportional` | `Monospace` | Only in the text diff: the font of its lines. A font of fixed width, from `--diffwise-text-font-family`, keeps indentation and columns in line; `Proportional` takes the font of the diff, as `fontFamily` sets it. The user can switch it in the view settings |
| `versionHeaderFontSize` | `0.5` to `10`, in rem | `0.9` | Font size of the headers |
| `lineNumberFontSize` | `0.5` to `10`, in rem | `0.75` | Font size of the line numbers. Their column and the column between the versions, with its icons, grow with it |
| `tooltipFontSize` | `0.5` to `10`, in rem | `0.8` | Font size of the tooltips |
| `toolbarFontSize` | `0.5` to `10`, in rem | `0.8` | Font size of the toolbar and the view settings |

The content keeps the font size of your app. The tooltips, the toolbar and the view settings have the font of the diff.

The lines of the text diff keep the spaces, tabs and indentation of the text, and long lines wrap. In the font of fixed width, they are a little smaller, 90% of the size of your app, as such fonts look larger, and stand closer together than the paragraphs of the HTML diff. A tab is as wide as 4 characters; `--diffwise-tab-size` changes it.

### Toolbar

A toolbar stands above the diff and stays at the top of the nearest scrolling area while the page scrolls. In a window lower than 30em, such as at a zoom of 400%, it scrolls with the diff instead, so the rows get the whole window. It has arrows between the changes with a counter, the numbers of changed lines, and at its end the button of the view settings. In a narrow diff, its parts wrap to a second line.

| Option | Values | Default | What it does |
|---|---|---|---|
| `showToolbar` | `true`, `false` | `true` | Shows the toolbar. With `false`, the arrows, the numbers and the view settings are hidden, whatever their own options |
| `showNavigationToolbar` | `true`, `false` | `true` | Shows the arrows to the previous and the next block of changes, and the counter between them, such as "2 / 3" |
| `activeChangeStyle` | `DiffwiseActiveChangeStyle.Outline`, `Indicator` | `Outline` | How the block the navigation has stepped to shows: a frame around it, or an arrow at the number of its first line |
| `showDiffStats` | `true`, `false` | `true` | Shows the numbers of added, removed and changed lines, such as "+3 −1 ~10" |
| `noChangesView` | `DiffwiseNoChangesView.Message`, `Document`, `Diff` | `Message` | When the versions are the same, the toolbar says "No changes", and this option sets what stands under it: nothing, the document once, or both versions as usual |

The view settings have options of their own; see [Settings for the user](#settings-for-the-user). Without the arrows, the numbers and the view settings, or with `showToolbar: false`, there is no toolbar, except the one that says "No changes".

**Navigation.** A step leads to a block of adjacent changed lines, so a passage rewritten across several lines is one step. The first step down goes to the first block, and the first step up to the last one; after the last block comes the first again. The block scrolls to the middle of the window, or to its top when it is taller than the window, and the toolbar never covers it. The scroll is smooth over a short distance and a jump over a long one, and always a jump when the system asks for less motion. The focus stays on the arrow, and screen readers hear "Change 2 of 3". Before the first step, the counter shows "– / 3". When the versions or the options of the comparison change, the navigation starts again before the first step.

**Numbers.** They count lines, as the line numbers do: an added line, a removed line, and a changed pair as one changed line. Each number has a tooltip, such as "Added lines: 3", which also names it for screen readers.

### Comparison

| Option | Values | Default | What it does |
|---|---|---|---|
| `ignoreWhitespace` | `true`, `false` | `false` | Ignores differences in whitespace |
| `ignoreBlankLines` | `true`, `false` | `false` | Only in the text diff: a blank line added or removed, empty or of spaces and tabs alone, is not a change, as with `git diff --ignore-blank-lines`. It shows in its version without the colors of a change, with the empty place opposite, as an added or a removed line has. HTML documents have no blank lines, as an empty paragraph is no line |
| `ignoreCase` | `true`, `false` | `false` | Ignores differences in letter case |
| `ignoreFormatting` | `true`, `false` | `false` | Ignores changes of formatting alone, such as italic → bold, another color or another heading level. It also ignores the look of list markers: bullets that became numbers, another bullet or numbering style, another level of an item, and a paragraph that became a list item or the other way around. Another item number still counts, as readers cite it, as in "see step 6" |
| `ignoreLinkChanges` | `true`, `false` | `false` | Ignores links added, removed or pointing elsewhere around the same text |

Only these options, and `showAllWhitespace`, which puts the signs into the lines, compare the versions again; the other options change only the look. Changes of images and checkboxes always count. [How it works](how-it-works.md#2-read-the-text-and-its-format) describes what counts as formatting.

### Language

| Option | Values | Default | What it does |
|---|---|---|---|
| `language` | `DiffwiseLanguage.Auto`, or one of the languages below | `Auto` | Language of the interface. `Auto` takes the language of your app from `LOCALE_ID`. A language besides English needs its texts from `provideDiffwiseLanguages()` |
| `customTexts` | `DiffwiseCustomTexts`, or `null` | none | Your own texts of the interface; see [Your own texts](#your-own-texts) |

The interface comes in twelve languages. English is always in your app. Each other language is a constant of its own, which you give to `provideDiffwiseLanguages()` next to `provideDiffwise()`, the way `registerLocaleData()` of Angular adds the data of a locale. The languages you leave out stay out of your app when it builds, about 13 kB after compression for all eleven:

```ts
import { ApplicationConfig } from '@angular/core';
import { diffwiseGerman, diffwisePolish, provideDiffwise, provideDiffwiseLanguages } from 'ngx-diffwise';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDiffwise({ language: 'auto' }),
    provideDiffwiseLanguages(diffwisePolish, diffwiseGerman),
  ],
};
```

| Language | Constant of the option | Value | Texts for `provideDiffwiseLanguages()` |
|---|---|---|---|
| English | `DiffwiseLanguage.EN` | `'en'` | always in the app |
| Polish | `DiffwiseLanguage.PL` | `'pl'` | `diffwisePolish` |
| Chinese, in simplified characters | `DiffwiseLanguage.ZH` | `'zh'` | `diffwiseChinese` |
| Spanish | `DiffwiseLanguage.ES` | `'es'` | `diffwiseSpanish` |
| Hindi | `DiffwiseLanguage.HI` | `'hi'` | `diffwiseHindi` |
| French | `DiffwiseLanguage.FR` | `'fr'` | `diffwiseFrench` |
| Russian | `DiffwiseLanguage.RU` | `'ru'` | `diffwiseRussian` |
| Portuguese, in the words and spelling of Portugal | `DiffwiseLanguage.PT` | `'pt'` | `diffwisePortuguese` |
| Italian | `DiffwiseLanguage.IT` | `'it'` | `diffwiseItalian` |
| Japanese | `DiffwiseLanguage.JA` | `'ja'` | `diffwiseJapanese` |
| German | `DiffwiseLanguage.DE` | `'de'` | `diffwiseGerman` |
| Korean | `DiffwiseLanguage.KO` | `'ko'` | `diffwiseKorean` |

Call `provideDiffwiseLanguages()` in the providers of your app; more calls there add their languages too. Each constant has the type `DiffwiseLanguagePack`.

**`Auto`** takes the language of `LOCALE_ID` with or without its region or script, so `pl-PL` gives Polish and `de-AT` German. Every Chinese locale, such as `zh-CN` or `zh-TW`, gives Chinese in simplified characters. Portuguese goes only to `pt` and `pt-PT`, also with a script, such as `pt-Latn-PT`; Portuguese of another region gives English. A language the interface has no texts in gives English too.

**A language your app does not provide**, set in `language` or taken by `Auto` from `LOCALE_ID`, gives English, and in development mode a warning in the console names it.

The texts of the interface carry the tag of their language in `lang`, so screen readers pronounce them in that language also on a page in another one; Chinese is `zh-Hans`. The documents keep the language of your page.

The translations other than English and Polish have not been reviewed by native speakers yet. To correct a text, or to add a language, use `customTexts`.

### View settings

| Option | Values | Default | What it does |
|---|---|---|---|
| `allowedUserSettings` | a list of `DiffwiseUserSetting.ColorMode`, `DiffPalette`, `TextFont`, `Layout`, `InlineDiffStyle`, `HideUnchangedLines`, `WrapLines`, `ShowAllWhitespace` | all eight | The options the user can change in the view settings. An empty list hides their button. `TextFont`, `WrapLines` and `ShowAllWhitespace` show only in the text diff |
| `rememberUserSettings` | `true`, `false` | `false` | Keeps the choices of the user in `localStorage`, so they stay after a reload |
| `userSettingsKey` | a name, or `null` | `null` | The name under which diffs keep the choices of the user. `null` takes the base path of your app, such as `/` or `/admin/` |

## Settings for the user

The button with a window and a gear at the end of the toolbar opens the view settings. In them, the user chooses the theme, the colors of changes, the layout, the look of changed lines in the single column, and whether to hide unchanged lines; "Restore defaults" takes the choices back. The text diff also has the font of its lines, "Fixed width" or "Regular", between the colors of changes and the layout, and two checkboxes under the one of hidden lines: "Wrap lines" and "Show all spaces and tabs"; the HTML diff never shows them. While the diff shows two columns, the look of the single column is disabled. The view settings open under their button, in the top layer of the page. Escape closes them and puts the focus back on the button; a click elsewhere closes them too, and so does the focus when it moves on to another element of the page.

**A choice of the user wins** over every level of your app, also over a change your app makes later. "Restore defaults" brings the options of your app back. If your app has its own theme switch, take `colorMode` out of `allowedUserSettings`, so the two do not compete:

```ts
provideDiffwise({
  allowedUserSettings: [
    DiffwiseUserSetting.Layout,
    DiffwiseUserSetting.InlineDiffStyle,
    DiffwiseUserSetting.HideUnchangedLines,
  ],
});
```

Only the allowed options show in the view settings, and a choice of another option does nothing, also one remembered from before. The values are the names of the options, so `['layout', 'colorMode']` works too. When the versions are the same, the toolbar shows only "No changes", without the button.

**Colors of changes** has four buttons in two rows: "Standard" and "Colorblind-friendly", then "High contrast" and "Custom". "Custom" stands for the colors of your app, from `diffColors`:

- It is chosen while your colors are in effect, and disabled when your app gives no colors for the theme the diff shows, such as dark colors alone in the light theme.
- A palette the user chooses takes the place of your colors, until the user chooses "Custom" again. That takes back the choice of the palette, so your colors apply again, over the `diffPalette` of your app, and `(userSettingsChange)` emits the choices without `diffPalette`.
- If `allowedUserSettings` leaves out `DiffwiseUserSetting.DiffPalette`, your colors always apply.

**Diffs share the choices** under the same `userSettingsKey`. By default, all diffs of your app have the same key, its base path, so a choice in one diff changes the others too, as a theme of the app does. To keep the choices of a diff apart, give it a key of its own, such as `[userSettingsKey]="'contract-history'"`.

**Remembered choices.** With `rememberUserSettings`, the choices are saved in `localStorage` after each change, and read when the first diff with their key starts, also after a reload. Choices made before remembering was turned on are saved at once. Only the choices go there, never the documents, under the entry `diffwise:user-settings:` followed by the key, such as `diffwise:user-settings:/`, as JSON in the same format as `DiffwiseUserSettings`. The key keeps apart the choices of apps on one domain. Without `localStorage`, such as when the browser blocks it or it is full, diffs work as usual and keep the choices until a reload. Saved choices in a format this version of Diffwise cannot read are ignored, with a warning in development mode. Diffs with one key should have the same `rememberUserSettings`, so set it in the global configuration.

**Choices in your app.** To keep the choices elsewhere, such as in the account of the user, take them from the `(userSettingsChange)` event, and give them back with `importUserSettings()` of the `Diffwise` service:

```ts
@Component({
  selector: 'app-contract-history',
  imports: [DiffwiseHtml],
  template: `
    <diffwise-html
      [oldHtml]="previous()"
      [newHtml]="current()"
      (userSettingsChange)="account.saveDiffSettings($event)"
    />
  `,
})
export class ContractHistory {
  readonly previous = input.required<string>();
  readonly current = input.required<string>();
  private readonly diffwise = inject(Diffwise);
  protected readonly account = inject(AccountSettings);

  constructor() {
    const saved = this.account.diffSettings();

    if (saved) {
      this.diffwise.importUserSettings(saved);
    }
  }
}
```

`DiffwiseUserSettings` is a plain object with the number of its format and the chosen options under their names, such as `{ version: 1, settings: { layout: 'inline', colorMode: 'dark' } }`. Options the user has not chosen are left out.

## Your own colors

`diffColors` takes colors of changes for the light and the dark theme. Any CSS color works, and a color you leave out comes from the palette of `diffPalette`.

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

In a theme with your colors, `diffIntensity` does not apply. Each level of the configuration changes only the colors it sets. `null` takes away the colors of the levels below, for example `updateConfig({ diffColors: null })` returns all diffs to the palette of `diffPalette`.

A palette the user chooses in the view settings takes the place of your colors, and "Custom" brings them back; see [Settings for the user](#settings-for-the-user). Choose colors that keep the contrast of the built-in palettes: at least 4.5:1 for the text on the backgrounds of changed lines and words, and for the accents against the background, as they also color the numbers of changed lines.

## Your own texts

`customTexts` replaces texts of the interface. A text you leave out stays in the language of the interface, and all of them together add a language.

The tables below show the texts in English and Polish; the texts of the other languages are in [the source](../projects/ngx-diffwise/src/lib/i18n).

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `oldVersionLabel` | Previous version | Poprzednia wersja | The header of the earlier version, or the name and the tooltip of its icon |
| `newVersionLabel` | New version | Nowa wersja | The same for the later version |
| `diffLabel` | Comparison of document versions | Porównanie wersji dokumentu | The name of the diff for screen readers; it does not show on the screen |

```ts
provideDiffwise({ customTexts: { oldVersionLabel: 'Draft', newVersionLabel: 'Published' } });
```

Each level of the configuration changes only the texts it sets. `null` takes away the texts of the levels below. The component element has the `region` role, named by `diffLabel`; to name it with a heading of your page instead, set `aria-labelledby` on the element.

### Texts for screen readers

A screen reader hears a short description before each removed, added or changed line, in place of its line number. These texts do not show on the screen; `{number}` stands for the number of the line.

| Text | English | Polish | Where it is heard |
|---|---|---|---|
| `removedLineLabel` | Removed line {number} | Usunięta linia {number} | Before a removed line |
| `addedLineLabel` | Added line {number} | Dodana linia {number} | Before an added line |
| `changedLineBeforeLabel`, `changedLineAfterLabel` | Changed line {number}, before; Changed line {number}, after | Zmieniona linia {number}, przed; Zmieniona linia {number}, po | Before the old and the new version of a changed line, side by side |
| `changedLineLabel` | Changed line {number} | Zmieniona linia {number} | Before a merged line of the single column |
| `wideTableLabel` | Wide table, scroll sideways | Szeroka tabela, przewiń w bok | The name of a table wider than its column, which takes the focus to scroll |
| `longLinesLabel` | Long lines, scroll sideways | Długie linie, przewiń w bok | The name of the scrollbar of lines of the text diff that do not wrap, which takes the focus to scroll while a line is wider than its column |

### Texts of the tooltips

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `formattingChangeLabel` | Formatting change | Zmiana formatowania | The title of a tooltip about formatting, and the name of its icon |
| `linkChangeLabel` | Link address changed | Zmieniony adres linku | The title of a tooltip about another address of a link around the same text |
| `addedLinkLabel` | Link added | Dodany link | The title of a tooltip about a link added around unchanged text |
| `removedLinkLabel` | Link removed | Usunięty link | The title of a tooltip about a link removed from unchanged text |
| `imageChangeLabel` | Image changed | Zmieniony obrazek | The title of a tooltip about an image with another file, size or alternative text |
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
| `paragraphLabel` | paragraph | akapit | Text that is not a heading, as in "paragraph → heading 2" |
| `alignLeftLabel`, `alignCenterLabel`, `alignRightLabel`, `alignJustifyLabel` | left, center, right, justified | do lewej, do środka, do prawej, do obu krawędzi | Values of the alignment; rare values, such as `start`, show as CSS writes them |

### Texts of the single column and hidden lines

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `inlineContentLabel` | Content after changes | Treść po zmianach | The header above the content of the single column |
| `showHiddenLinesLabel` | Show hidden lines: {count} | Pokaż ukryte linie: {count} | The bar in place of hidden lines; `{count}` stands for their number |
| `hiddenLinesLabel` | Hidden lines: {count} | Ukryte linie: {count} | The same bar as a button on the line between the versions, with `dividerStyle: 'line'` |

### Texts of a large document

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `largeDocumentLabel` | The document is too large to load without confirmation. | Dokument jest zbyt duży, żeby go wczytać bez potwierdzenia. | The sentence of the panel in place of the rows, from `largeDocumentLines` lines |
| `showComparisonLabel` | Show the comparison | Pokaż porównanie | The button of the panel, which draws the rows |

### Texts of the toolbar

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `addedLinesLabel`, `removedLinesLabel`, `changedLinesLabel` | Added lines: {count}, Removed lines: {count}, Changed lines: {count} | Dodane linie: {count}, Usunięte linie: {count}, Zmienione linie: {count} | The tooltips and the names of the numbers, such as "+3" |
| `noChangesLabel` | No changes | Brak zmian | The only text of the toolbar when the versions are the same |
| `previousChangeLabel`, `nextChangeLabel` | Previous change, Next change | Poprzednia zmiana, Następna zmiana | The names and the tooltips of the arrows |
| `currentChangeLabel` | Change {current} of {total} | Zmiana {current} z {total} | The tooltip of the counter, such as "2 / 3", and what screen readers hear after each step |
| `changeCountLabel` | Changes: {count} | Zmiany: {count} | The tooltip of the counter before the first step, "– / 3" |

### Texts of the view settings

| Text | English | Polish | Where it shows |
|---|---|---|---|
| `viewButtonLabel` | View | Widok | The name and the tooltip of the button that opens the view settings |
| `viewSettingsLabel` | View settings | Ustawienia widoku | The name of the view settings for screen readers |
| `layoutLabel` | Layout | Układ | The name of the layout |
| `autoLayoutLabel`, `sideBySideLayoutLabel`, `inlineLayoutLabel` | Auto, Side by side, Single column | Auto, Obok siebie, Jedna kolumna | Its values |
| `inlineDiffStyleLabel` | Changes in a single column | Zmiany w jednej kolumnie | The name of the look of changed lines in the single column |
| `mergedInlineDiffLabel`, `strikethroughInlineDiffLabel`, `stackedInlineDiffLabel` | Merged, Struck through, Stacked | Scalone, Przekreślone, Jedna pod drugą | Its values |
| `colorModeLabel` | Theme | Motyw | The name of the theme |
| `autoColorModeLabel`, `lightColorModeLabel`, `darkColorModeLabel` | Auto, Light, Dark | Auto, Jasny, Ciemny | Its values |
| `diffPaletteLabel` | Colors of changes | Kolory zmian | The name of the colors of changes |
| `defaultDiffPaletteLabel`, `colorblindDiffPaletteLabel`, `highContrastDiffPaletteLabel`, `customDiffPaletteLabel` | Standard, Colorblind-friendly, High contrast, Custom | Standardowe, Dla daltonistów, Wysoki kontrast, Własne | Its values; "Custom" stands for the colors of your app |
| `textFontLabel` | Text font | Czcionka tekstu | The name of the font of the text diff |
| `monospaceTextFontLabel`, `proportionalTextFontLabel` | Fixed width, Regular | Stała szerokość, Zwykła | Its values |
| `hideUnchangedLinesLabel` | Hide unchanged lines | Ukryj niezmienione linie | The checkbox of hidden lines |
| `wrapLinesLabel` | Wrap lines | Zawijaj wiersze | The checkbox of wrapped lines of the text diff |
| `showAllWhitespaceLabel` | Show all spaces and tabs | Pokaż wszystkie spacje i tabulatory | The checkbox of the signs of all spaces and tabs of the text diff |
| `resetUserSettingsLabel` | Restore defaults | Przywróć domyślne | The button that takes the choices back |

## Events and methods of the diff

| Member | What it does |
|---|---|
| `(diffStatsComputed)` | Emits `DiffwiseDiffStats` after each comparison: when the versions or the options of the comparison change. Options of the look do not compare the versions again, so they emit nothing. A large document emits them before its rows show |
| `(userSettingsChange)` | Emits `DiffwiseUserSettings` after each choice of the user in the view settings of this diff, also "Custom", and after "Restore defaults", with all choices under its key. Changes made by your app emit nothing |
| `goToNextChange()`, `goToPreviousChange()` | Step to the next or the previous block of changes and scroll it into view, as the arrows do, also when the arrows are hidden |

`DiffwiseDiffStats` has the numbers of the toolbar, `addedLines`, `removedLines` and `changedLines`, and `hasChanges`, which is `false` when the versions are the same. It tells your app whether there is anything to show:

```ts
@Component({
  selector: 'app-policy-history',
  imports: [DiffwiseHtml],
  template: `
    @if (stats(); as stats) {
      <p>{{ stats.hasChanges ? stats.changedLines + ' changed lines' : 'Nothing changed' }}</p>
    }
    <diffwise-html [oldHtml]="previous()" [newHtml]="current()" (diffStatsComputed)="stats.set($event)" />
  `,
})
export class PolicyHistory {
  readonly previous = input.required<string>();
  readonly current = input.required<string>();
  protected readonly stats = signal<DiffwiseDiffStats | null>(null);
}
```

To call the methods, take the diff with `viewChild(DiffwiseHtml)` or `viewChild(DiffwiseText)`.

## The `Diffwise` service

| Member | What it does |
|---|---|
| `config` | The global configuration, as a signal |
| `updateConfig(changes)` | Changes the given options of the global configuration; the diffs follow at once |
| `switchToDarkMode()`, `switchToLightMode()`, `switchToAutoMode()` | Set `colorMode` of the global configuration |
| `toggleDarkMode()` | Switches to the theme opposite to the one the diffs show now |
| `exportUserSettings(key?)` | The choices of the user under the key, as `DiffwiseUserSettings`: the same object as from `(userSettingsChange)` |
| `importUserSettings(settings, key?)` | Gives the user the choices your app has kept, in place of the current ones; the diffs follow at once. It leaves out invalid values and options that `allowedUserSettings` of the global configuration does not allow, and ignores choices in a format of an unknown version. With `rememberUserSettings` in the global configuration, it saves them in `localStorage` too |
| `resetUserSettings(key?)` | Takes back the choices of the user under the key, also from `localStorage` |

Without `key`, the methods take `userSettingsKey` of the global configuration, or the base path of your app. A diff that sets an option through an input or `config` keeps its value when the global configuration changes.

## Styling with CSS

The components have no view encapsulation. Their classes start with `diffwise-diff`, follow BEM, and are the same in both diffs.

### Variables

Override the variables on the component element, `diffwise-html` or `diffwise-text`, with any selector. A value set higher up, such as on `<body>`, does not reach the diff, which has its own defaults.

```css
diffwise-html {
  --diffwise-link: #0b57d0;
}

diffwise-html.diffwise-diff--dark-theme {
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
| `--diffwise-tooltip-removed-highlight`, `--diffwise-tooltip-added-highlight` | Backgrounds of the changed parts of the old and the new value in a tooltip; their frames in the high contrast palette |
| `--diffwise-tooltip-font-size` | Font size of the tooltips |
| `--diffwise-focus` | The outline of an icon or a marked change with the focus, and the frame or the arrow of the block the navigation has stepped to: blue, and teal in the colorblind-friendly and the high contrast palettes |
| `--diffwise-toolbar-font-size` | Font size of the toolbar and the view settings |
| `--diffwise-toolbar-top` | How far from the top of the scrolling area the toolbar sticks; `0px` by default. An app with its own sticky header puts the height of the header here, so the toolbar stays under it, and so does an element that takes the focus. Give it a unit, such as `64px` |
| `--diffwise-text-font-family` | The font of fixed width of the text diff: by default the monospace font of the system, such as Cascadia Mono, Consolas or Menlo |
| `--diffwise-tab-size` | The width of a tab in the text diff, in characters; `4` by default |

Version 0.5 changed a few defaults for contrast: `--diffwise-muted` is `#626975` in the light theme, `--diffwise-link` is `#93b9ff` in the dark theme, and the removed accent of the colorblind-friendly palette is `#ab4f09` in the light theme. A link in a changed part has the color of the text, with its underline, so it stays readable on the background of the change. If your CSS sets these colors, keep their contrast.

The options `diffColors`, `lineNumberFontSize`, `versionHeaderFontSize`, `tooltipFontSize` and `toolbarFontSize` set their variables on the component element. An option your app sets wins over a variable in your CSS; the variable applies while the option has its default.

The component element has `position: relative`, so the descriptions of lines it keeps for screen readers stay inside it, also in a scrolling box of your app; any `position` your app gives the element wins. The tooltip and the view settings show in the top layer of the page, so no `overflow` of your app cuts them, but they stay inside the component element, and the variables reach them. `tooltipColorMode: 'reversed'` changes the tooltip variables, as the dark theme does. To change the reversed colors, use its class:

```css
diffwise-html.diffwise-diff--tooltip-color-mode-reversed {
  --diffwise-tooltip-background: #0b1f3a;
}
```

### Modifier classes

The component element shows the options in its classes:

- An option with a value other than its default adds a class with its name and value, such as `diffwise-diff--gap-style-gray`, `diffwise-diff--highlight-style-underline`, `diffwise-diff--diff-palette-colorblind` or `diffwise-diff--text-font-proportional`. A value the user has chosen in the view settings counts too.
- The levels always have a class, such as `diffwise-diff--diff-intensity-3` and `diffwise-diff--ui-contrast-3`. In a theme with your own colors, there is no class of the intensity.
- `diffwise-diff--no-line-numbers`, `--no-changed-line-highlight`, `--highlight-whole-lines`, `--no-tooltip-change-highlight` and `--no-wrap-lines` turn parts of the diff off or on.
- `diffwise-diff--dark-theme` shows the dark theme.
- `diffwise-diff--layout-inline` shows the single column, also when `Auto` has chosen it, so the class follows the layout on the screen, not the value of the option.
- `diffwise-diff--no-changes` says that the versions are the same, so your CSS can hide or restyle the diff then. It is a state, not an option.

Options that only show or hide a part, such as `hideUnchangedLines`, `showNavigationToolbar` and `showDiffStats`, add no class, and neither do the options of the comparison and of the settings for the user.

### Parts of the view

| Class | What it is |
|---|---|
| `diffwise-diff__version-headers` | The row of the headers |
| `diffwise-diff__version-header`, with `--old` or `--new` | The header of one version; in the single column, the icon above its numbers |
| `diffwise-diff__version-header--inline` | The header above the content of the single column |
| `diffwise-diff__version-header-icon` | An icon in place of a header text |
| `diffwise-diff__row`, with `--unchanged`, `--changed`, `--added` or `--removed` | One row of the view |
| `diffwise-diff__row--active`, with `--active-first` and `--active-last` | The rows of the block the navigation has stepped to, and its first and its last row |
| `diffwise-diff__line-number`, with `--old` or `--new` | The cell of a line number |
| `diffwise-diff__line-number-value` | The number in that cell |
| `diffwise-diff__content`, with `--old` or `--new` | The content of a line |
| `diffwise-diff__content--merged` | The content of a merged line of the single column, with removed and added text at once |
| `diffwise-diff__image-change-arrow` | The arrow between the old and the new image of a changed image in a merged line |
| `diffwise-diff__divider` | The column between the versions |
| `diffwise-diff__change-details-cell` | The narrow column of the icons of changes next to the content of the single column |
| `diffwise-diff__gap` | The empty place opposite an added or a removed line, or opposite a blank line that `ignoreBlankLines` leaves out of the changes |
| `diffwise-diff__gap--cell` | An empty cell of a merged table row, in a column that the version of the row does not have; the classes stand on the cell |
| `diffwise-diff__collapsed-lines` | The bar in place of hidden lines; the whole bar is a button |
| `diffwise-diff__large-document` | The panel in place of the rows of a large document |
| `diffwise-diff__large-document-title` | Its sentence, "The document is too large to load without confirmation." |
| `diffwise-diff__large-document-button` | The button "Show the comparison" |
| `diffwise-diff__toolbar` | The toolbar above the diff |
| `diffwise-diff__navigation` | The arrows with the counter |
| `diffwise-diff__navigation-button`, with `--previous` or `--next` | An arrow |
| `diffwise-diff__change-counter` | The counter, such as "2 / 3" |
| `diffwise-diff__diff-stats` | The numbers of changed lines |
| `diffwise-diff__diff-stat`, with `--added`, `--removed` or `--changed` | One number, such as "+3" |
| `diffwise-diff__no-changes` | The text "No changes" in the toolbar |
| `diffwise-diff__view-button` | The button that opens the view settings |
| `diffwise-diff__view-settings` | The view settings, in the top layer of the page |
| `diffwise-diff__view-settings-group` | One option with a choice of values: its name and its buttons |
| `diffwise-diff__view-settings-group--pairs` | A group with its buttons in two columns, such as the colors of changes |
| `diffwise-diff__view-settings-label` | The name of an option, such as "Layout" |
| `diffwise-diff__view-settings-choice` | The button of one value; the chosen one has `aria-pressed="true"` |
| `diffwise-diff__view-settings-checkbox` | The option with a checkbox |
| `diffwise-diff__view-settings-reset` | The button "Restore defaults" |
| `diffwise-diff__highlight`, with `--removed` or `--added` | Changed words, and text with changed formatting or a changed link: `<del>` in the earlier version, `<ins>` in the later one |
| `diffwise-diff__highlight--image` | A marker around a changed, added or removed image, together with `--removed` or `--added`: a frame instead of a background |
| `diffwise-diff__highlight--list-marker` | A changed list marker that Diffwise draws in place of the browser's, together with `--removed` or `--added`: an empty `<del>` or `<ins>` at the start of the item, which shows the marker |
| `diffwise-diff__highlight--checkbox` | A marker around a checked or cleared checkbox of a list item, together with `--removed` or `--added`: a frame instead of a background. A merged line of the single column has two: the old checkbox, then the new one |
| `diffwise-diff__whitespace`, with `--space` or `--tab` | A space or a tab of the text diff inside a marker, or anywhere with `showAllWhitespace`, which shows `·` or `→` over itself |
| `diffwise-diff__line-scrollbars` | The scrollbars of lines of the text diff that do not wrap, at the bottom of the diff |
| `diffwise-diff__line-scrollbar`, with `--old` or `--new` | The scrollbar under the content of one version; the single column shows only the one of the new version |
| `diffwise-diff__highlight--cell` | A whole cell of an added or removed row or column, together with `diffwise-diff__highlight` and `--removed` or `--added`. The classes stand on the cell (`td` or `th`) itself |
| `diffwise-diff__change-details-icon`, with `--formatting`, `--link`, `--image` or `--multiple` | The icon of a row with changes besides the text, in the column between the versions |
| `diffwise-diff__change-details-count` | The number of changes on the icon of several changes |
| `diffwise-diff__tooltip` | The tooltip; one for each diff |
| `diffwise-diff__tooltip-title` | The title of the tooltip, such as "Link address changed" |
| `diffwise-diff__tooltip-item` | One of several changes in the tooltip, under a line |
| `diffwise-diff__tooltip-subtitle` | The title of one of several changes, or of a part of an image, such as "alternative text" |
| `diffwise-diff__tooltip-description` | A line that describes a change, such as "italic → bold" |
| `diffwise-diff__tooltip-row` | A row with a label and a value, such as the old address |
| `diffwise-diff__tooltip-label`, `diffwise-diff__tooltip-value` | The label and the value of that row |
| `diffwise-diff__tooltip-highlight`, with `--removed` or `--added` | The changed part of a value |
| `diffwise-diff__tooltip-color` | A swatch before a color |
