import type { DiffwiseLanguage } from '../config/option-values';

/** Stands in a text for a number, such as the number of hidden lines. */
const COUNT_PLACEHOLDER = '{count}';

/** Stand in a text for the position of an item and the number of all items: "Change 2 of 3". */
const CURRENT_PLACEHOLDER = '{current}';
const TOTAL_PLACEHOLDER = '{total}';

/** Stands in a text for the number of a line: "Added line 6". */
const NUMBER_PLACEHOLDER = '{number}';

/**
 * Texts an app shows instead of texts of the interface, such as `{ oldVersionLabel: 'Draft' }`.
 * All of them together add a language; a text left out stays in the language of the diff.
 */
export interface DiffwiseCustomTexts {
  /** Names the earlier version: its header, and the icon shown in its place. */
  readonly oldVersionLabel?: string;
  /** Names the later version: its header, and the icon shown in its place. */
  readonly newVersionLabel?: string;
  /** Heads the content in the single column, which shows the lines of both versions. */
  readonly inlineContentLabel?: string;
  /** Names the whole diff for screen readers. */
  readonly diffLabel?: string;
  /** Tells screen readers that a line was removed; `{number}` stands for its number. */
  readonly removedLineLabel?: string;
  /** Tells screen readers that a line was added; `{number}` stands for its number. */
  readonly addedLineLabel?: string;
  /** Tells screen readers that the line is the old version of a changed line, with its number. */
  readonly changedLineBeforeLabel?: string;
  /** Tells screen readers that the line is the new version of a changed line, with its number. */
  readonly changedLineAfterLabel?: string;
  /** Tells screen readers that a merged line shows a changed line, with its number. */
  readonly changedLineLabel?: string;
  /** Names for screen readers a table wider than its column, which scrolls sideways. */
  readonly wideTableLabel?: string;
  /**
   * Names for screen readers the scrollbar of lines of the text diff that do not wrap, while lines
   * are wider than their column.
   */
  readonly longLinesLabel?: string;
  /**
   * Text of the bar in place of hidden unchanged lines, with a gray column between the versions;
   * `{count}` stands for their number.
   */
  readonly showHiddenLinesLabel?: string;
  /**
   * Text of the bar in place of hidden unchanged lines, with a line between the versions;
   * `{count}` stands for their number.
   */
  readonly hiddenLinesLabel?: string;
  /** Names the number of added lines in the toolbar and titles its tooltip; `{count}` is the number. */
  readonly addedLinesLabel?: string;
  /** Names the number of removed lines in the toolbar and titles its tooltip. */
  readonly removedLinesLabel?: string;
  /** Names the number of changed lines in the toolbar and titles its tooltip. */
  readonly changedLinesLabel?: string;
  /** The only text of the toolbar when the versions are the same. */
  readonly noChangesLabel?: string;
  /** Titles the panel in place of the rows of a large document, until the user asks for them. */
  readonly largeDocumentLabel?: string;
  /** Names the lines of the longer version in the panel of a large document; `{count}` is their number. */
  readonly documentLinesLabel?: string;
  /** The button of the panel of a large document, which shows the rows. */
  readonly showComparisonLabel?: string;
  /** Names the arrow to the previous block of changes and titles its tooltip. */
  readonly previousChangeLabel?: string;
  /** Names the arrow to the next block of changes and titles its tooltip. */
  readonly nextChangeLabel?: string;
  /**
   * Names the counter of the blocks of changes after a step, and tells screen readers where the
   * step led; `{current}` stands for the position of the block, `{total}` for the number of blocks.
   */
  readonly currentChangeLabel?: string;
  /** Names the counter before the first step; `{count}` stands for the number of blocks. */
  readonly changeCountLabel?: string;
  /** Names the button of the view settings in the toolbar and titles its tooltip. */
  readonly viewButtonLabel?: string;
  /** Names the view settings for screen readers. */
  readonly viewSettingsLabel?: string;
  /** Names the choice of the layout in the view settings. */
  readonly layoutLabel?: string;
  /** The automatic layout: a single column in a narrow diff. */
  readonly autoLayoutLabel?: string;
  /** The versions side by side. */
  readonly sideBySideLayoutLabel?: string;
  /** A single column. */
  readonly inlineLayoutLabel?: string;
  /** Names the choice of how the single column shows a changed line. */
  readonly inlineDiffStyleLabel?: string;
  /** A changed line merged into one line. */
  readonly mergedInlineDiffLabel?: string;
  /** A merged line with removed text struck through. */
  readonly strikethroughInlineDiffLabel?: string;
  /** The old line above the new one. */
  readonly stackedInlineDiffLabel?: string;
  /** Names the choice of the theme. */
  readonly colorModeLabel?: string;
  /** The theme of the system or of the app. */
  readonly autoColorModeLabel?: string;
  /** The light theme. */
  readonly lightColorModeLabel?: string;
  /** The dark theme. */
  readonly darkColorModeLabel?: string;
  /** Names the choice of the colors of changes. */
  readonly diffPaletteLabel?: string;
  /** The default colors of changes: red and green. */
  readonly defaultDiffPaletteLabel?: string;
  /** Colors of changes that colorblind readers tell apart: orange and blue. */
  readonly colorblindDiffPaletteLabel?: string;
  /** Changes in frames, without colored backgrounds. */
  readonly highContrastDiffPaletteLabel?: string;
  /** The colors of changes the app gives. */
  readonly customDiffPaletteLabel?: string;
  /** Names the choice of the font of the lines of the text diff. */
  readonly textFontLabel?: string;
  /** A font of fixed width, which keeps indentation and columns in line. */
  readonly monospaceTextFontLabel?: string;
  /** The font of the diff, with letters of their own widths. */
  readonly proportionalTextFontLabel?: string;
  /** Names the checkbox that hides unchanged lines far from changes. */
  readonly hideUnchangedLinesLabel?: string;
  /** Names the checkbox that breaks long lines of the text diff into rows of text. */
  readonly wrapLinesLabel?: string;
  /** Names the checkbox that shows each space and tab of the text diff as a sign. */
  readonly showAllWhitespaceLabel?: string;
  /** Names the button that takes back the choices of the user. */
  readonly resetUserSettingsLabel?: string;

  /** Titles a tooltip about changed formatting, such as italic → bold, and names its icon. */
  readonly formattingChangeLabel?: string;
  /** Titles a tooltip about another address of a link around the same text. */
  readonly linkChangeLabel?: string;
  /** Titles a tooltip about a link added around unchanged text. */
  readonly addedLinkLabel?: string;
  /** Titles a tooltip about a link removed from around unchanged text. */
  readonly removedLinkLabel?: string;
  /** Titles a tooltip about an image with another file, size or alternative text. */
  readonly imageChangeLabel?: string;
  /** Titles a tooltip about several changes in one line; `{count}` stands for their number. */
  readonly multipleChangesLabel?: string;

  /** Labels the old value in a tooltip, such as the old address of a link. */
  readonly oldValueLabel?: string;
  /** Labels the new value in a tooltip. */
  readonly newValueLabel?: string;
  /** Heads the old and new file of a changed image when more of the image changed. */
  readonly imageFileLabel?: string;
  /** Names the size of a changed image, before its old and new size. */
  readonly imageSizeLabel?: string;
  /** Heads the old and new alternative text of a changed image. */
  readonly imageAltTextLabel?: string;

  /** Bold text, as in "italic → bold". */
  readonly boldLabel?: string;
  /** Bold added to unchanged text. */
  readonly addedBoldLabel?: string;
  /** Bold removed from unchanged text. */
  readonly removedBoldLabel?: string;
  /** Italic text. */
  readonly italicLabel?: string;
  /** Italic added to unchanged text. */
  readonly addedItalicLabel?: string;
  /** Italic removed from unchanged text. */
  readonly removedItalicLabel?: string;
  /** Underlined text. */
  readonly underlineLabel?: string;
  /** Underline added to unchanged text. */
  readonly addedUnderlineLabel?: string;
  /** Underline removed from unchanged text. */
  readonly removedUnderlineLabel?: string;
  /** Struck-through text. */
  readonly strikethroughLabel?: string;
  /** Strikethrough added to unchanged text. */
  readonly addedStrikethroughLabel?: string;
  /** Strikethrough removed from unchanged text. */
  readonly removedStrikethroughLabel?: string;
  /** Superscript text. */
  readonly superscriptLabel?: string;
  /** Superscript added to unchanged text. */
  readonly addedSuperscriptLabel?: string;
  /** Superscript removed from unchanged text. */
  readonly removedSuperscriptLabel?: string;
  /** Subscript text. */
  readonly subscriptLabel?: string;
  /** Subscript added to unchanged text. */
  readonly addedSubscriptLabel?: string;
  /** Subscript removed from unchanged text. */
  readonly removedSubscriptLabel?: string;
  /** Text in a code font. */
  readonly codeLabel?: string;
  /** Code font added to unchanged text. */
  readonly addedCodeLabel?: string;
  /** Code font removed from unchanged text. */
  readonly removedCodeLabel?: string;
  /** Text marked as highlighted. */
  readonly textHighlightLabel?: string;
  /** Highlight added to unchanged text. */
  readonly addedTextHighlightLabel?: string;
  /** Highlight removed from unchanged text. */
  readonly removedTextHighlightLabel?: string;
  /** Text in a smaller font. */
  readonly smallTextLabel?: string;
  /** A smaller font added to unchanged text. */
  readonly addedSmallTextLabel?: string;
  /** A smaller font removed from unchanged text. */
  readonly removedSmallTextLabel?: string;
  /** Text in upper case. */
  readonly uppercaseLabel?: string;
  /** Upper case added to unchanged text. */
  readonly addedUppercaseLabel?: string;
  /** Upper case removed from unchanged text. */
  readonly removedUppercaseLabel?: string;
  /** Text in lower case. */
  readonly lowercaseLabel?: string;
  /** Lower case added to unchanged text. */
  readonly addedLowercaseLabel?: string;
  /** Lower case removed from unchanged text. */
  readonly removedLowercaseLabel?: string;
  /** The first letter of each word in upper case. */
  readonly capitalizedLabel?: string;
  /** Capitalization added to unchanged text. */
  readonly addedCapitalizedLabel?: string;
  /** Capitalization removed from unchanged text. */
  readonly removedCapitalizedLabel?: string;
  /** A heading; `{level}` stands for its level, as in "heading 3 → heading 2". */
  readonly headingLabel?: string;
  /** A paragraph, as in "paragraph → heading 2". */
  readonly paragraphLabel?: string;
  /** Names the text color, before its old and new value. */
  readonly textColorLabel?: string;
  /** A text color added to unchanged text, before the color. */
  readonly addedTextColorLabel?: string;
  /** A text color removed from unchanged text, before the color. */
  readonly removedTextColorLabel?: string;
  /** Names the background color, before its old and new value. */
  readonly backgroundColorLabel?: string;
  /** A background color added to unchanged text, before the color. */
  readonly addedBackgroundColorLabel?: string;
  /** A background color removed from unchanged text, before the color. */
  readonly removedBackgroundColorLabel?: string;
  /** Names the font, before its old and new name. */
  readonly fontFamilyLabel?: string;
  /** A font added to unchanged text, before its name. */
  readonly addedFontFamilyLabel?: string;
  /** A font removed from unchanged text, before its name. */
  readonly removedFontFamilyLabel?: string;
  /** Names the font size, before its old and new value. */
  readonly fontSizeLabel?: string;
  /** A font size added to unchanged text, before the size. */
  readonly addedFontSizeLabel?: string;
  /** A font size removed from unchanged text, before the size. */
  readonly removedFontSizeLabel?: string;
  /** Names the alignment of text, before its old and new value. */
  readonly textAlignmentLabel?: string;
  /** An alignment added to unchanged text, before the alignment. */
  readonly addedTextAlignmentLabel?: string;
  /** An alignment removed from unchanged text, before the alignment. */
  readonly removedTextAlignmentLabel?: string;
  /** Text aligned to the left. */
  readonly alignLeftLabel?: string;
  /** Centered text. */
  readonly alignCenterLabel?: string;
  /** Text aligned to the right. */
  readonly alignRightLabel?: string;
  /** Text aligned to both edges. */
  readonly alignJustifyLabel?: string;
}

/** Every text of the interface in one language. */
export type UiTexts = Required<DiffwiseCustomTexts>;

/** A language the interface has texts in. */
export type UiLanguage = Exclude<DiffwiseLanguage, typeof DiffwiseLanguage.Auto>;

/**
 * Every text of the interface in one language, such as `diffwisePolish`, which
 * `provideDiffwiseLanguages()` adds to an app.
 */
export interface DiffwiseLanguagePack {
  /** The language of the texts. */
  readonly language: UiLanguage;
  /** Every text of the interface in the language. */
  readonly texts: UiTexts;
}

/** The text with the number in place of `{count}`. */
export function withCount(text: string, count: number): string {
  return text.replaceAll(COUNT_PLACEHOLDER, String(count));
}

/** The text with the number of a line in place of `{number}`. */
export function withLineNumber(text: string, lineNumber: number): string {
  return text.replaceAll(NUMBER_PLACEHOLDER, String(lineNumber));
}

/**
 * The text with the position of an item in place of `{current}`, and the number of all items in
 * place of `{total}`.
 */
export function withPosition(text: string, current: number, total: number): string {
  return text
    .replaceAll(CURRENT_PLACEHOLDER, String(current))
    .replaceAll(TOTAL_PLACEHOLDER, String(total));
}
