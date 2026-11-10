# How it works

This page describes version 0.2. Diffwise compares two HTML documents in five steps.

## 1. Clean and parse

Each version is cleaned with [DOMPurify](https://github.com/cure53/DOMPurify) and then parsed by the browser's `DOMParser`, which builds an inert document: no script runs and no image loads. This makes HTML from users or other systems safe to compare.

- **Removed:** scripts, event handlers such as `onclick`, `javascript:` links, `<style>` elements, and attributes that take focus or open popovers. Forms and dialogs are removed, but their content stays. Comments and hidden elements are left out, and so are attributes that start with `data-diffwise-`, so the content cannot pose as details of a change.
- **Kept**, so the content looks as it did in its editor: classes, inline styles that change only the look (such as color, font, alignment, spacing and borders, but no positioning and no `url()`), and checkboxes, which become read-only.
- **Links** that open a new tab get `rel="noopener noreferrer"`.
- **Ids** get a prefix of their own in each diff and each version, and in-page links follow them. Footnotes work within each version, and the ids never clash with the ones of your app.

## 2. Read the text and its format

Diffwise compares the text a reader sees, not the markup. A run of whitespace, including non-breaking spaces, counts as one space, except in `<pre>` and `<textarea>`. Blocks, images and line breaks separate words, and an image is one character of the text, so it is compared like a word. With `ignoreWhitespace`, all whitespace is ignored, and with `ignoreCase`, letter case.

Each piece of text also keeps its format: its formatting and the address of the link around it. Formatting is what the HTML says, not how a tag looks by default, since Diffwise cannot know how your app styles a heading or a class. So `<h2><b>Pricing</b></h2>` and `<h2>Pricing</h2>` differ in bold.

- **Formatting** comes from tags (bold, italic, underline, strikethrough, superscript, subscript, code, `<mark>` and `<small>`), from the heading level, and from the `style` attribute: text and background color, font, font size, weight, italic, underline and strikethrough, letter case, and the alignment of a block. The old `<font color face size>`, `align` and `<center>`, still found in emails, count too. Spacing, borders and dimensions do not, and neither do `class`, `title`, `datetime` or `id`.
- **The same look written another way is no change:** `<b>` and `<strong>`, `<i>` and `<em>`, or a color written as `#c0392b` and as `rgb(192, 57, 43)`. As in CSS, the nearest element decides the weight, the italic and the letter case, so `<b style="font-weight: normal">`, which Google Docs puts around pasted text, is not bold. Underline and strikethrough add up. A transparent background is no background.
- **Links** are compared by their address (`href`) as written. `target`, `rel` and `title` do not count. In-page links, such as footnotes, are compared without the prefix of their version.
- **Images** are compared by their file (`src`), their size and their alternative text. The size comes from `style`, or else from the `width` and `height` attributes, as in CSS, so `width="480"` and `style="width: 480px"` are the same. In the alternative text, single spaces count, as a screen reader reads it, and `ignoreCase` and `ignoreWhitespace` apply; a missing `alt` and an empty one differ. `srcset`, `class` and `title` do not count. Changes of other elements without text inside a line, such as `<svg>`, `<video>` or form fields, are not detected.

## 3. Split into lines

HTML has no real lines, so Diffwise uses blocks instead. A paragraph or a heading is one line, also inside a quote or a `<div>`, which are split into the blocks they hold. In 0.2, a list, a table, a code block, a definition list, a `<details>` element and a figure are one line each; lists and tables will be split into lines in 0.3. A line a reader would not see, such as an empty paragraph, is left out. The lines of each version are numbered from 1.

## 4. Compare

- **Lines.** The lines of both versions are matched with the Myers algorithm, the one git uses by default. Two lines are equal when they have the same structure, text, formatting, links and images. A heading counts as a paragraph here, as its level is formatting, so a heading that becomes a paragraph is a changed line. The formatting of whitespace does not count, such as bold that also covers the space after a word.
- **Changed lines.** Where the versions differ, a removed and an added line are paired as one changed line when they share at least half of their words. An image counts as two words: one that all images share and one for its file, so a paragraph whose image was replaced stays one changed line. Of the possible pairings, the one with the highest total similarity wins, and the order of both versions stays. The other lines are removed or added. A moved paragraph shows as a removal and an addition.
- **Words.** In a changed line, the text is compared word by word, again with the Myers algorithm. Words come from the browser's `Intl.Segmenter`, so languages written without spaces, such as Chinese and Japanese, are compared correctly. Each punctuation mark is compared on its own, and images are compared with the words, by their file.
- **Formatting and links.** In a changed line, the words that stayed are compared by their format. Each change gets a description: the styles before and after, a changed value such as a color, a heading level, or the old and the new address of a link. Neighboring words with the same change are one change. New text is a change of the text, so its formatting gets no description of its own.
- **Images.** An image removed and an image added between the same unchanged words are one changed image, described by what changed: its file, its size or its alternative text. An image without a pair is added or removed, like a word.

`ignoreFormatting` leaves out formatting and heading levels, and `ignoreLinkChanges` leaves out links added, removed or pointing elsewhere. Changes of images always count.

## 5. Mark and display

- Removed words are wrapped in `<del>` and added words in `<ins>`, inside the formatting, so a bold word or a link keeps its look. Text with changed formatting or a changed link gets the same markers, in both versions. Each line is cleaned again after marking.
- A changed image gets a frame instead of a background, and the frame follows the marking style. An added or a removed image is framed only in its version.
- A row with changes besides the text gets an icon in the column between the versions: formatting, link, image, or several changes with their number. Changed text and changed formatting in one line are two markers, and the icon is about the formatting only.
- A tooltip on the icon and on the marked text says what changed, in the language of the interface: "italic → bold", "text color: ■ #c0392b → ■ #1e7d4f", "heading 3 → heading 2", "size: 480 × 270 → 640 × 360 px", or the old and the new address with the changed part highlighted. A file shows by its name, or by its whole address when both names are the same, and a long `data:` address is shortened.
- There is one tooltip for each diff, in the top layer of the page (the Popover API), so no `overflow` of your app cuts it. It stands under its icon or text, or above it when there is no room below. It shows on hover and on focus from the keyboard; the pointer can move onto it, and Escape or scrolling the page hides it.
- Each row of the view is a CSS grid: the number and the content of the earlier line, the column between the versions, and the number and the content of the later line. Matching lines stay level even when one of them is taller, and both versions scroll together. Opposite an added or a removed line stays an empty place.
- The content of a line stays inside its cell, even an element that a class of your app gives a fixed position.
- Colors and sizes come from CSS variables, and the options add modifier classes to the component, so you can adjust the look in your CSS; see [Styling with CSS](configuration.md#styling-with-css).

## Architecture

The diff engine is plain TypeScript with no dependency on Angular, and DOMPurify is its only dependency. It uses the DOM of the browser, so Diffwise does not support server-side rendering yet. The Angular package wraps the engine in the `DiffwiseHtmlDiff` component, `provideDiffwise()` and the `Diffwise` service. The engine describes changes with data, such as the styles before and after, and the component turns the data into the texts of the tooltips, so the engine knows no languages. This keeps the engine easy to test and leaves the door open for other frameworks later.
