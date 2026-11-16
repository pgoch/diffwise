# Roadmap

> Tentative. The order and scope may change. Versions 0.1 to 0.6 are complete; [Configuration](configuration.md) describes what they can do.

| Version | Scope |
|---|---|
| 0.1 | Diff engine; side-by-side view of paragraphs and headings; word-level changes; line numbers; light, dark and automatic color modes; appearance options; interface in English and Polish; global, runtime and per-component configuration |
| 0.2 | Changes in formatting, links and images; their details in icons between the versions and in tooltips; options to ignore changes of formatting or links |
| 0.3 | Lists and tables split into lines: list items, table rows and captions; changes of list markers and checkboxes; table columns matched between the versions, with changes compared cell by cell |
| 0.4 | Single-column layout with automatic switching, and merged lines; collapsing of unchanged lines; a toolbar with navigation between changes, statistics and view settings for end users, which can be remembered, exported and imported |
| 0.5 | Interface in 10 more languages, 12 in all, with sample documents in each; colorblind-friendly and high contrast palettes, which end users can also choose; accessibility: descriptions of changed lines for screen readers, keyboard access to wide tables, the high contrast mode of Windows, and contrast at every level of the scales |
| 0.6 | Plain text diffs: a second component that compares two versions of plain text line by line, with the same look and configuration as the HTML diff; spaces, tabs and indentation as in the text, changed whitespace shown as signs, and a font of fixed width that end users can switch |
| 0.7 | A configurator: a page that leads you step by step through the options, with a live preview of the diff, and gives you configuration ready to copy into your app, as a plain object or as a `DiffwiseConfig`; cleaner code and smaller improvements |
| 0.8 | Performance: a review of the whole code for faster comparison and display of long documents and texts, and a smaller bundle |
| 0.9 | Final tests in Chrome, Edge, Firefox and Safari and with screen readers, bug fixes, and the first release on npm |
| 1.0 | Stable API, complete documentation and a live demo with the configurator |

The first version on npm is planned at the end of 0.9. Later versions will be published as they are ready.

## Ideas after 1.0

- Diffs of source code, with syntax highlighting
- Packages for other frameworks, built on the same engine
- Detecting moved paragraphs
