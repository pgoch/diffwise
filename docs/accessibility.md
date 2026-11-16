# Accessibility

This page describes version 0.5. Diffwise aims at level AA of WCAG 2.2: readers who use the keyboard, a screen reader, a high contrast mode or a strong zoom should learn from the diff what everyone else does.

Version 0.5 was checked in Chrome: its accessibility tree, which screen readers read, real key presses, the emulated high contrast mode, a 320 px wide window, wider text spacing, and contrast measured in the page. It has not been tested with a screen reader such as NVDA, JAWS or VoiceOver yet.

## Keyboard

- `Tab` goes through the toolbar first, then through the content in the order of the document: the icons of changes, the links of the documents, the bars of hidden lines and wide tables.
- Every element with the focus has a visible outline in `--diffwise-focus`. An element that takes the focus scrolls into view below the sticky toolbar, not under it.
- The arrows of the toolbar step between the blocks of changes and keep the focus.
- The button of the view settings opens them; Escape closes them and puts the focus back on the button.
- A tooltip shows when its icon gets the focus, or its marked change with `changeDetails: 'hover'`. Escape hides it.
- A table wider than its column has one stop for `Tab`, its last row, from which the arrow keys scroll it.
- Side by side, the old copy of an unchanged line is not in the order of `Tab`, so each link of the documents is one stop. A click on its links still works.

## Screen readers

- The diff is a region named "Comparison of document versions" (`diffLabel`); `aria-labelledby` on the element names it with a heading of your page instead.
- Before each removed, added or changed line, a screen reader hears a description that does not show on the screen, such as "Removed line 6", "Added line 6", or "Changed line 2, before" and "Changed line 2, after" side by side. A merged line of the single column is "Changed line 2". The line numbers themselves are skipped.
- Side by side, an unchanged line is read once: screen readers skip its old copy, so each heading and link of the documents is there once.
- Removed and added words are `<del>` and `<ins>`, which some screen readers announce as a deletion and an insertion.
- The rows of a table are read as lines of the diff, cell by cell, not as tables of one row each.
- Each icon of changes is named by the title of its tooltip, such as "Link address changed", and the lines under the title describe it.
- After a step of the navigation, screen readers hear "Change 2 of 3". The numbers of changed lines are named, such as "Added lines: 3".
- The view settings are a dialog named "View settings", with a named group for each option; the chosen value is a pressed button.
- The texts of the interface carry the tag of their language in `lang`, so they are pronounced in that language on a page in another one. The documents keep the language of your page.

The descriptions are texts of the interface, so they come in each of its languages and can be changed with `customTexts`; see [Texts for screen readers](configuration.md#texts-for-screen-readers).

## Colors and contrast

- With the built-in palettes, text keeps a contrast of at least 4.5:1, and bars, frames and the outline of the focus at least 3:1. This was measured in both themes, with the standard and the colorblind-friendly palettes, at levels 1, 3 and 5 of `diffIntensity` and `uiContrast`.
- A link in a changed part has the color of the text, with its underline, so it stays readable on the background of the change.
- The colorblind-friendly palette shows removed changes in orange and added ones in blue, which readers with red-green colorblindness tell apart. The outline of the focus is teal, so it stands apart from the blue.
- The high contrast palette has no colored backgrounds: a changed part stands in a frame, solid and blue when added, dashed, orange and struck through when removed, and a changed line has a bar at its number. Its colors have a contrast of at least 4.5:1 in both themes.
- The user can choose either palette in the view settings, under "Colors of changes"; see [Settings for the user](configuration.md#settings-for-the-user).

Side by side, the place of a change tells removed from added, and the bars at the numbers show which lines changed. In the single column, a removed and an added part differ only by their colors in the standard and the colorblind-friendly palettes; `inlineDiffStyle: 'strikethrough'` or the high contrast palette adds a shape.

## High contrast mode of Windows

In the high contrast mode of Windows (forced colors), the browser replaces the colors of the page with a few colors of the system and drops backgrounds. Diffwise keeps the changes visible by their shapes:

- a changed part in a frame: solid when added, dashed and struck through when removed, in orange and blue that stay apart from the colors of the system;
- a changed image or checkbox in the same frames;
- a bar at the number of a changed line, from orange to blue in a merged line of the single column;
- diagonal stripes opposite an added or a removed line;
- frames around the changed parts of the values in a tooltip.

The text of the documents keeps the colors of the system.

## Motion

The navigation scrolls smoothly over a short distance and jumps over a long one; it always jumps when the system asks for less motion (`prefers-reduced-motion`). Diffwise has no other animations.

## Zoom and narrow screens

In a window 320 px wide, as at a zoom of 400%, the automatic layout shows a single column, and only code blocks and wide tables scroll sideways. Wider spacing of letters, words and lines cuts nothing off, also in the toolbar and the view settings.

## Known limits

- Table cells are read without their headers: a screen reader does not hear which header belongs to a cell.
- In the single column, see above: removed and added parts differ only by color in two of the palettes.
- The documents are shown as they are. Their own accessibility, such as alternative texts of images, the order of headings and headers of tables, comes from whoever wrote them.

## What your app does

- Set `lang` on your page, or on an element around the diff, in the language of the documents, so screen readers pronounce them right.
- Keep the contrast when you change colors: with `diffColors`, at least 4.5:1 for the text on the backgrounds of changes and for the accents, which also color the numbers of changed lines; with CSS variables, the same for the colors you set. See [Your own colors](configuration.md#your-own-colors).
- Leave `DiffwiseUserSetting.DiffPalette` in `allowedUserSettings`, so readers can choose the colorblind-friendly or the high contrast palette themselves.
- If your page has a sticky header, put its height into `--diffwise-toolbar-top`, so the toolbar and the element with the focus stay below it.
- Give the diff a name that fits your page, with `diffLabel` or `aria-labelledby`.
- The translations other than English and Polish have not been reviewed by native speakers yet. Check the texts in the languages of your users, and correct them with `customTexts`.
