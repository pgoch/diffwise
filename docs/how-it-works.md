# How it works

This page describes version 0.1. Diffwise compares two HTML documents in five steps.

## 1. Clean and parse

Each version is cleaned with [DOMPurify](https://github.com/cure53/DOMPurify) and then parsed by the browser's `DOMParser`, which builds an inert document: no script runs and no image loads. This makes HTML from users or other systems safe to compare.

- **Removed:** scripts, event handlers such as `onclick`, `javascript:` links, `<style>` elements, and attributes that take focus or open popovers. Forms and dialogs are removed, but their content stays. Comments and hidden elements are left out.
- **Kept**, so the content looks as it did in its editor: classes, inline styles that change only the look (such as color, font, alignment, spacing and borders, but no positioning and no `url()`), and checkboxes, which become read-only.
- **Links** that open a new tab get `rel="noopener noreferrer"`.
- **Ids** get a prefix of their own in each diff and each version, and in-page links follow them. Footnotes work within each version, and the ids never clash with the ones of your app.

## 2. Read the text

Diffwise compares the text a reader sees, not the markup. A run of whitespace, including non-breaking spaces, counts as one space, except in `<pre>` and `<textarea>`. Blocks, images and line breaks separate words. With `ignoreWhitespace`, all whitespace is ignored, and with `ignoreCase`, letter case.

## 3. Split into lines

HTML has no real lines, so Diffwise uses blocks instead. A paragraph or a heading is one line, also inside a quote or a `<div>`, which are split into the blocks they hold. In 0.1, a list, a table, a code block, a definition list, a `<details>` element and a figure are one line each; lists and tables will be split into lines in 0.3. A line a reader would not see, such as an empty paragraph, is left out. The lines of each version are numbered from 1.

## 4. Compare

- **Lines.** The lines of both versions are matched with the Myers algorithm, the one git uses by default. Two lines are equal when they have the same tag and the same text.
- **Changed lines.** Where the versions differ, a removed and an added line are paired as one changed line when they share at least half of their words. Of the possible pairings, the one with the highest total similarity wins, and the order of both versions stays. The other lines are removed or added. A moved paragraph shows as a removal and an addition.
- **Words.** In a changed line, the text is compared word by word, again with the Myers algorithm. Words come from the browser's `Intl.Segmenter`, so languages written without spaces, such as Chinese and Japanese, are compared correctly. Each punctuation mark is compared on its own.

In 0.1, only the text is compared. Changes of formatting, link addresses and images come in 0.2.

## 5. Mark and display

- Removed words are wrapped in `<del>` and added words in `<ins>`, inside the formatting, so a bold word or a link keeps its look. Each line is cleaned again after marking.
- Each row of the view is a CSS grid: the number and the content of the earlier line, the column between the versions, and the number and the content of the later line. Matching lines stay level even when one of them is taller, and both versions scroll together. Opposite an added or a removed line stays an empty place.
- The content of a line stays inside its cell, even an element that a class of your app gives a fixed position.
- Colors and sizes come from CSS variables, and the options add modifier classes to the component, so you can adjust the look in your CSS; see [Styling with CSS](configuration.md#styling-with-css).

## Architecture

The diff engine is plain TypeScript with no dependency on Angular, and DOMPurify is its only dependency. It uses the DOM of the browser, so Diffwise does not support server-side rendering yet. The Angular package wraps the engine in the `DiffwiseHtmlDiff` component, `provideDiffwise()` and the `Diffwise` service. This keeps the engine easy to test and leaves the door open for other frameworks later.
