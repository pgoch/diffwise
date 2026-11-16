# Test data

Sample documents for trying out Diffwise and checking it by eye. All samples were auto-generated. Each HTML sample is a pair, `before.html` and `after.html`. Both are HTML fragments, the way an editor or a CMS stores content, not full pages. Samples of plain text are described in [Plain text samples](#plain-text-samples).

| Sample | Content |
|---|---|
| Short | An announcement: a heading and a few paragraphs |
| Medium | A help article: headings, paragraphs, lists, links, a quote and an image |
| Long | A user guide with every kind of content an editor can produce |

Each sample comes in the twelve languages of the interface, in a folder named by the code of the language:

| Language | Short | Medium | Long |
|---|---|---|---|
| English | [en/short](en/short) | [en/medium](en/medium) | [en/long](en/long) |
| Polish | [pl/short](pl/short) | [pl/medium](pl/medium) | [pl/long](pl/long) |
| Chinese (simplified characters) | [zh/short](zh/short) | [zh/medium](zh/medium) | [zh/long](zh/long) |
| Spanish | [es/short](es/short) | [es/medium](es/medium) | [es/long](es/long) |
| Hindi | [hi/short](hi/short) | [hi/medium](hi/medium) | [hi/long](hi/long) |
| French | [fr/short](fr/short) | [fr/medium](fr/medium) | [fr/long](fr/long) |
| Russian | [ru/short](ru/short) | [ru/medium](ru/medium) | [ru/long](ru/long) |
| Portuguese (Portugal) | [pt/short](pt/short) | [pt/medium](pt/medium) | [pt/long](pt/long) |
| Italian | [it/short](it/short) | [it/medium](it/medium) | [it/long](it/long) |
| Japanese | [ja/short](ja/short) | [ja/medium](ja/medium) | [ja/long](ja/long) |
| German | [de/short](de/short) | [de/medium](de/medium) | [de/long](de/long) |
| Korean | [ko/short](ko/short) | [ko/medium](ko/medium) | [ko/long](ko/long) |

The translations have the same structure and the same changes as the English samples, so the diff shows the same rows in every language; the engine tests check it. Only the words follow each language, such as dates, units and quotation marks. Translations other than English and Polish have not been reviewed by native speakers.

Images are simple drawings in [images](images). Paths in the samples are relative to this folder, for example `images/logo-2025.svg`.

## Changes in each sample

### Short

- Words changed inside bold text: the day and date of the maintenance.
- A time changed: 23:00 → 23:30.
- A clause added at the end of a paragraph.
- A paragraph with a link added.

### Medium

- Words changed in the introduction ("three" → "four", an item added to an enumeration).
- A word changed inside italic text.
- A section added: a heading and a paragraph ("Stacks").
- A sentence removed from a paragraph, a phrase changed in another one.
- A number changed (20 → 50).
- Bulleted list: an item removed, another added.
- Numbered list: a step added, another changed.
- Text changed inside a quote.
- Two questions with their answers swapped. Until moved paragraphs are detected, this shows as a removal and an addition.
- A link address changed; its text stayed the same.

### Long

Introduction and contents:

- The logo replaced with a different image; the caption changed.
- The date in `<time>` and the version number changed.
- A word added to the lead paragraph.
- An item added to the table of contents.

Plans and prices:

- A paragraph added above the first table, another one removed below it.
- A price changed; a value with `&nbsp;` changed.
- A row added to a table that uses `rowspan` and `colspan`.
- Text changed in a merged cell (`colspan`) and in the table footer.
- A column added to the second table, which has an image in one of its cells.

Getting started:

- A step added to a numbered list; text changed in another step.
- An item changed in a nested list.
- The `start` number of a continued list changed (5 → 6), and its last item became a paragraph after the list.
- An emoji added.
- A bulleted list changed to a numbered list.
- A checkbox in a checklist checked.

Sharing:

- An inline icon removed from a sentence.
- A list item changed and another added.
- A link address changed (`sharing-2025` → `sharing`), the text of another link changed, and a link added around existing text.
- Bold added to existing text.
- An image enlarged (480 × 270 → 640 × 360).
- Text changed inside a quote.

Formatting:

- Italic changed to bold (`<i>` → `<b>`).
- Text color changed in a `style` attribute.
- An extra space added. A reader cannot see it, so no change should be shown.
- Text changed inside `<ins>`: the content itself contains tracked changes from another editor.
- Two values changed in a code block, one of them next to `&lt;`.

Shortcuts and glossary:

- A heading level changed (h3 → h2).
- Cells changed in a table; a row removed.
- A definition changed; the `title` of an abbreviation changed, which is not visible in the text.

Privacy and contact:

- Text changed in paragraphs, inside `<details>`, in the address and in a footnote.
- An image added in a new paragraph.
- Only the `alt` text of an image changed.
- A horizontal rule removed.
- An image inside a link replaced.

The long sample also covers content without changes: headings h1–h4, `<sub>`, `<sup>`, `<mark>`, `<kbd>`, `<abbr>`, `<figure>`, `<dl>`, `<address>`, centered text, line breaks, links that open in a new tab, footnote anchors, and `id` attributes that appear in both versions.

## Not in the samples

Scripts, event handlers, `javascript:` links and embedded media (`<iframe>`, `<video>`) are left out, so the samples are safe to open. Automated tests cover them.

## Plain text samples

Samples for the plain text diff are in [text](text). Each is a pair, `before.txt` and `after.txt`, about the same fictional service as the HTML samples.

| Sample | Content |
|---|---|
| Short | A note: a short list of tasks |
| Medium | A README in Markdown, shown as plain text: headings, lists, code blocks and a table |
| Long | Operations notes with everything at once: indentation with spaces and tabs, columns aligned with spaces, empty lines, long lines, spaces at the end of lines, text that looks like HTML, emoji and Chinese |

| Language | Short | Medium | Long |
|---|---|---|---|
| English | [text/en/short](text/en/short) | [text/en/medium](text/en/medium) | [text/en/long](text/en/long) |
| Polish | [text/pl/short](text/pl/short) | [text/pl/medium](text/pl/medium) | [text/pl/long](text/pl/long) |

The Polish samples have the same structure and the same changes as the English ones, so the diff shows the same rows in both languages; the engine tests check it. The plain text diff splits words with the same code as the HTML diff, which the HTML samples check in all twelve languages.

### Changes in each plain text sample

#### Short

- A word changed in the title: Saturday → Sunday.
- A phrase added at the end of a line.
- A time changed: 23:00 → 23:30.
- Words changed: "one hour" → "two hours".
- A line added at the end.

#### Medium

- Words added to the introduction ("or plain text").
- A version number changed in a list (20 → 22).
- A section added: a heading and a code block ("Updating").
- A value changed in a command inside a code block (`./notes` → `./backup`).
- The end of a sentence removed.
- Table: a word changed in a row, a row added. The columns stay aligned with spaces.
- JSON in a code block: a value changed, a comma added and a line added.
- Bulleted list: numbers changed in two items, an item removed.
- A link address changed; its text stayed the same.

#### Long

Header and overview:

- The version and the date changed.
- Two spaces became one ("Owner:  platform team").
- A word changed in the middle of a long line, and an empty line added after it.
- An item added to an indented list of contents.

Plans and limits:

- A value changed in columns aligned with spaces, and a row added.
- One of two empty lines removed.
- Spaces at the end of a line removed.

Sync settings:

- Indentation changed: two spaces → four spaces in two lines, a tab → four spaces in another one. A line indented with four spaces stays unchanged.
- A value changed in an indented line.
- A value changed in a line with columns separated by tabs.

Release checklist:

- A step added to a numbered list, so the numbers of the next three steps changed.
- Numbers changed and an emoji added in a line that starts with an emoji.
- A word changed in another line that starts with an emoji.
- Spaces added at the end of a line.

Known issues:

- Text that looks like HTML changed: `<b>` → `<strong>`. It shows as plain characters, like the `<script>` next to it.
- A word changed next to `&amp;` and `&lt;`, which show as plain characters too.
- A line of four spaces became an empty line.
- An emoji changed (😀 → 🙂).
- An item added.

Notes for translators:

- Chinese text changed: a word added in one line, another word changed in the next one.

Contacts:

- A section added before the last line.

The long sample also has lines without changes: a title underlined with `=`, section titles underlined with `-`, a line indented with four spaces, a very long link and a line of Chinese text.

With `ignoreWhitespace`, the changes of whitespace above are not changes: indentation, two spaces → one, spaces at the end of lines and the line of four spaces, which then equals an empty line.

## Rules

- All content is made up and describes a fictional service. Do not add real documents, names or data.
- Use only `example.com` addresses.
- Keep `before` and `after` identical apart from the changes listed above, and update this list when you change a sample.
- Change a sample in every language at once, so that all of them keep the same structure and the same changes.
- Keep the tabs and the spaces at the end of lines in the plain text samples: they are part of the changes. `.editorconfig` tells editors to keep them; an editor that removes spaces at the end of lines anyway breaks the samples.
