# How it works

> This page describes the planned design. Details may change during implementation.

Diffwise compares two HTML documents in five steps.

## 1. Parse and sanitize

Both documents are parsed into a DOM tree in the browser. Unsafe content such as scripts, event handlers and `javascript:` links is removed before anything is displayed, so HTML from untrusted sources can be compared safely.

## 2. Normalize

Differences a reader cannot see are removed: extra whitespace, non-breaking spaces, empty formatting elements and attribute order. If configured, differences in whitespace, letter case or formatting can be ignored entirely.

## 3. Split into lines

HTML has no real lines, so Diffwise uses blocks instead. A paragraph, a heading, a list item, a table row or an image is one "line". Lines are numbered separately on each side.

## 4. Compare

- **Lines.** The lines of both versions are matched with the Myers algorithm, the same one git uses by default. Unmatched lines that are similar enough are paired as "changed"; the rest are "added" or "removed".
- **Words.** Inside each changed pair, the text is compared word by word. Words are found with the browser's `Intl.Segmenter`, so languages written without spaces, such as Chinese and Japanese, are compared correctly.
- **Everything else.** Each word remembers its formatting and its link, so a change of formatting or of a link address is detected even when the text stays the same. Images are compared by address. List markers and table structure (rows and columns) are compared separately.

## 5. Display

Both versions are rendered in one CSS grid, one grid row per line. Matching lines stay level even when an image or a long paragraph makes one side taller, and both sides scroll together. Colors, spacing and marking styles come from CSS custom properties, so they can be adjusted without changing the library.

## Architecture

The diff engine is plain TypeScript with no dependency on Angular. The Angular package wraps it in a component, configuration providers and a settings service. This keeps the engine easy to test and leaves the door open for other frameworks later.
