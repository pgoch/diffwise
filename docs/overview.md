# Overview

## What Diffwise is

Diffwise is an Angular library that compares two versions of an HTML document and shows them side by side, rendered as a reader would see them. Changes are highlighted the way a code diff highlights them, but in the document itself rather than in its markup. A second component compares two versions of plain text line by line, with the same look and options.

## Who it is for

Applications that keep versions of rich text: content management systems, contract and policy tools, knowledge bases and editorial workflows. The text diff serves versions of plain text, such as notes, Markdown files or settings.

## What it will show

Version 0.8 shows changes of the text, the formatting, the links and the images in paragraphs, headings, list items and table rows, and changes of list markers and checkboxes, side by side or in a single column. It also compares plain text line by line. The rest comes with the releases in the [roadmap](roadmap.md).

| Change | How it is shown |
|---|---|
| Text | The changed line is tinted on both sides; the changed words are marked more strongly. In the high contrast palette, the changed words stand in frames instead |
| Formatting, e.g. italic → bold | Marked like a text change, with an icon between the two sides and a tooltip that describes what changed |
| Link address | The link is highlighted in the text; an icon between the two sides and a tooltip show the old and new address, with the changed part highlighted |
| Added or removed link | The text is highlighted; the tooltip shows the address |
| Image | The old image is framed in red, the new one in green, or in the colors of another palette, with an icon between the two sides and a tooltip that shows the changed file, size or alternative text; the frame follows the marking style |
| List markers, e.g. bullets → numbers | The line is tinted; the markers are marked like changed words, with no icon or tooltip, as both sides show them |
| Item number, e.g. 3. → 4. | The line is tinted; the numbers are marked like changed words, with no icon or tooltip, also when an added or removed item shifts them |
| Checkbox in a task list | Framed like an image when checked or cleared, with no icon or tooltip; the single column shows the old checkbox before the new one |
| Table | Each row is a line, and the rows look like one table. New rows and columns are marked whole; otherwise only the changed words in cells. Unchanged cells keep their colors |
| Added or removed paragraph, list item or table row | Shown on one side, with an empty space on the other |
| Plain text | Each line of the text is a line of the diff, with its spaces, tabs and indentation. Changed words are marked as in documents, and changed spaces and tabs show as `·` and `→`, or every space and tab, on request. Long lines wrap, or stay in one row and scroll sideways together. A blank line added or removed can be left out of the changes |

## Display and configuration

Version 0.1 has the side-by-side layout, the color modes, the intensity and contrast scales, the marking styles, the fonts, the line numbers and the three levels of configuration, with the interface in English and Polish. Version 0.2 adds the details of changes besides the text, with their icons and tooltips, version 0.3 adds lists and tables, version 0.4 adds the single column, hidden unchanged lines and the toolbar with navigation, statistics and settings for the user, version 0.5 adds the colorblind-friendly and the high contrast palettes, the interface in 12 languages and support for screen readers and the high contrast mode of Windows, version 0.6 adds the text diff, with a font of fixed width that users can switch, version 0.7 adds lines of plain text that scroll sideways, signs of all spaces and tabs, ignored blank lines, options to hide the whole toolbar and the headers, and a configurator in the demo app, and version 0.8 makes long documents and pages with many diffs open sooner, shows very large documents on request, and makes the bundle smaller; see [Configuration](configuration.md). The whole scope, with what is planned:

- **Layouts:** side by side, single column, or automatic, based on the component's width. The single column shows a merged line, optionally with deleted text struck through, or the old line above the new one; small "before" and "after" icons label its two line-number columns.
- **Colors:** light, dark and automatic color modes, a colorblind-friendly and a high contrast palette, which users can also choose themselves, and an intensity scale (1–5) for changed lines and changed words together. You can also supply your own colors.
- **Contrast:** one more scale (1–5) sets how much everything around the diff stands out: the toolbar, column headers, the line-number column and the column between the two sides. Each keeps its own shade — the line numbers darkest, the toolbar lightest — and the scale moves them together.
- **Marking styles:** several ways to mark changed words, such as an outline, a background or an underline. All styles share the same fill and differ only in the lines drawn over it, so switching styles never moves the text.
- **Change details:** for changes to links, images and formatting, a tooltip on the element, an icon between the two sides, or both. Tooltips use the component's colors or those of the opposite theme, and highlight the changed part of an address. Changes of formatting or links alone can be ignored.
- **Fonts:** the font is inherited from your application by default; you can switch to the built-in system font or name your own. Sizes of column headers, line numbers, tooltips and the toolbar are set in rem. The text diff shows its lines in a font of fixed width, or in the font of the diff.
- **Line numbers:** numbers of changed lines get a colored bar or a colored background. The column is only as wide as the largest number needs; numbers and icons can sit at the top, middle or bottom of a line.
- **Reading aids:** optional line numbers, collapsing of unchanged lines, navigation between groups of neighboring changes and change statistics. In plain text, long lines can scroll sideways instead of wrapping, and every space and tab can show its sign.
- **Long documents:** the first rows show soon and the rest draw in parts, and the diffs of a page draw one by one, the visible ones first. A document of many lines, 20 000 by default, shows its numbers of changes at once and its rows when the user asks for them.
- **Toolbar:** navigation between changes, change statistics and settings for end users, all shown by default. The application can hide any part of it, or the whole toolbar, and limit the settings users see.
- **Three levels of configuration:** global defaults, runtime changes (for example, switching to dark mode with a single call) and per-component overrides. A configurator in the demo app builds the global defaults step by step, with a live preview.
- **Languages:** interface texts in 12 languages: English, Polish, Chinese, Spanish, Hindi, French, Russian, Portuguese, Italian, Japanese, German and Korean, chosen by your app or taken from its locale. English is always there; your app adds the others it uses.

Other optional features are turned off by default.

## Not in scope

- Editing, or tracking changes while someone types. Diffwise compares two finished versions.
- Pixel-by-pixel comparison of screenshots.

## Requirements

Angular 20 or newer. Planned browser support: current versions of Chrome, Edge, Firefox and Safari. Diffwise runs in the browser; server-side rendering is not supported yet.

## License

MIT: free to use, modify and distribute, including commercially.
