# Changelog

The changes of the `ngx-diffwise` package, newest first. Versions 0.1 to 0.8 were not released on npm; the [roadmap](docs/roadmap.md) shows what each of them added.

## 0.9.0

The first release on npm.

### What the package does

- Compares two versions of rendered HTML with `<diffwise-html>`, or of plain text with `<diffwise-text>`, in Angular 20 and later, and shows them side by side or in a single column.
- Shows changes of text, formatting, links, images, list markers, checkboxes and tables. Tooltips describe the changes besides the text.
- Has a toolbar with arrows between the changes, the numbers of changed lines, and view settings in which the user chooses the theme, the colors of changes, the layout and hidden unchanged lines.
- Has its interface in 12 languages. It works with the keyboard, screen readers and the high contrast mode of Windows, and has colorblind-friendly and high contrast palettes.
- Draws long documents in parts and the rows of very large ones on request. The diffs of a page take turns, the visible ones first.
- Cleans both versions of an HTML document with DOMPurify.

See the [overview](docs/overview.md), [configuration](docs/configuration.md) and [accessibility](docs/accessibility.md).

### Since version 0.8

- An element with an `is` attribute keeps its text in changed lines and in tables.
- Every caption of a table is a line.
- Removed text stays out of added text in merged lines.
- Both checkboxes of a merged line have names for screen readers.
- The view settings close when the focus moves on, and show the chosen values in the high contrast mode.
- The toolbar scrolls with the diff in a low window, such as at a zoom of 400%.
- The panel of a large document says "The document is too large to load without confirmation." above its button. The text `documentLinesLabel` and the class `diffwise-diff__large-document-lines` are gone.
- Small diffs on a page with many diffs take their turns in growing groups, so the last of them shows sooner.
