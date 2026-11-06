# Diffwise

Side-by-side diffs of rendered HTML for Angular. Diffwise is a free, standalone component that shows two versions of a document side by side, the way a reader sees them: what actually changed in text, formatting, links, images, lists and tables — not in the markup.

> **Status: design phase.** There is nothing to install yet. Watch the repository to hear about the first release.

## Why Diffwise?

Comparing two versions of a rich-text document is a common need: contracts, policies, articles, knowledge bases, CMS content. The existing options fall short:

- Text and code diff viewers compare the HTML source, so readers see tags instead of changes.
- HTML diff libraries merge both versions into a single document, without a side-by-side view, line numbers or table-aware comparison.
- No existing tool combines a modern design, high configurability and on-demand comparison of any two versions.

Diffwise fills that gap:

- You can use it anywhere you have access to the HTML of both versions, whatever editor or system produced it.
- It is designed to be highly configurable, so you can adapt it to your own needs: colors, marking styles, layout, line numbers and the controls your users see.

## Planned features

- Side-by-side and single-column layouts, with automatic switching on narrow screens
- Changed lines softly tinted, changed words clearly marked
- Changes in formatting, links, images, lists and tables, each shown in a way that fits the content
- Light, dark and automatic color modes, plus a colorblind-friendly palette
- Optional line numbers, collapsing of unchanged lines and navigation between changes
- Configuration on three levels: global defaults, runtime changes and per-component overrides
- Interface in 12 languages

See the [documentation](docs/README.md) for details.

## License

[MIT](LICENSE) © 2026 Patryk Goch
