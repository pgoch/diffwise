# Roadmap

> Tentative. The order and scope may change. Versions 0.1 to 0.3 are complete; [Configuration](configuration.md) describes what they can do.

| Version | Scope |
|---|---|
| 0.1 | Diff engine; side-by-side view of paragraphs and headings; word-level changes; line numbers; light, dark and automatic color modes; appearance options; interface in English and Polish; global, runtime and per-component configuration |
| 0.2 | Changes in formatting, links and images; their details in icons between the versions and in tooltips; options to ignore changes of formatting or links |
| 0.3 | Lists and tables split into lines: list items, table rows and captions; changes of list markers and checkboxes; table columns matched between the versions, with changes compared cell by cell |
| 0.4 | Single-column layout with automatic switching; collapsing of unchanged lines; navigation between changes and statistics; optional toolbar with settings for end users |
| 0.5 | Interface in 10 more languages, 12 in all; colorblind-friendly palette; accessibility review |
| 0.6 | Plain text diffs: a second component that compares two versions of plain text line by line, with the same look and configuration as the HTML diff |
| 0.7+ | Further improvements based on feedback, as needed |
| 1.0 | Stable API, complete documentation, a live demo and a configurator page that turns your choices into ready-to-copy configuration |

The first version on npm is planned after 0.5, with the interface in 12 languages. Later versions before 1.0 will be published as they are ready.

## Ideas after 1.0

- Diffs of source code, with syntax highlighting
- Packages for other frameworks, built on the same engine
- Detecting moved paragraphs
