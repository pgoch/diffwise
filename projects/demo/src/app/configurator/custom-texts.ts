import type { DiffwiseCustomTexts } from 'ngx-diffwise';

import { DiffKind } from '../samples';

/** A text of the interface: its name in `customTexts` and its English text. */
export interface CustomText {
  readonly name: keyof DiffwiseCustomTexts;
  readonly english: string;
  /** The diffs that show the text, when not every diff of its group does. */
  readonly diffKinds?: readonly DiffKind[];
}

/** Texts of the interface that show in one place, as `docs/configuration.md` groups them. */
export interface CustomTextGroup {
  readonly title: string;
  /** The diffs that show the texts of the group. */
  readonly diffKinds: readonly DiffKind[];
  readonly texts: readonly CustomText[];
}

const ALL_DIFFS: readonly DiffKind[] = [DiffKind.Html, DiffKind.Text];
const HTML_DIFF: readonly DiffKind[] = [DiffKind.Html];
const TEXT_DIFF: readonly DiffKind[] = [DiffKind.Text];

/**
 * Every text of the interface with its English text, in the groups of the documentation. A test
 * checks it against the English texts of the library, which are not part of its public API.
 */
export const CUSTOM_TEXT_GROUPS: readonly CustomTextGroup[] = [
  {
    title: 'Versions and the diff',
    diffKinds: ALL_DIFFS,
    texts: [
      { name: 'oldVersionLabel', english: 'Previous version' },
      { name: 'newVersionLabel', english: 'New version' },
      { name: 'diffLabel', english: 'Comparison of document versions' },
    ],
  },
  {
    title: 'For screen readers',
    diffKinds: ALL_DIFFS,
    texts: [
      { name: 'removedLineLabel', english: 'Removed line {number}' },
      { name: 'addedLineLabel', english: 'Added line {number}' },
      { name: 'changedLineBeforeLabel', english: 'Changed line {number}, before' },
      { name: 'changedLineAfterLabel', english: 'Changed line {number}, after' },
      { name: 'changedLineLabel', english: 'Changed line {number}' },
      { name: 'wideTableLabel', english: 'Wide table, scroll sideways' },
      { name: 'longLinesLabel', english: 'Long lines, scroll sideways', diffKinds: TEXT_DIFF },
    ],
  },
  {
    title: 'Tooltips',
    diffKinds: HTML_DIFF,
    texts: [
      { name: 'formattingChangeLabel', english: 'Formatting change' },
      { name: 'linkChangeLabel', english: 'Link address changed' },
      { name: 'addedLinkLabel', english: 'Link added' },
      { name: 'removedLinkLabel', english: 'Link removed' },
      { name: 'imageChangeLabel', english: 'Image changed' },
      { name: 'multipleChangesLabel', english: 'Formatting changes: {count}' },
      { name: 'oldValueLabel', english: 'Before' },
      { name: 'newValueLabel', english: 'After' },
      { name: 'imageFileLabel', english: 'file' },
      { name: 'imageSizeLabel', english: 'size' },
      { name: 'imageAltTextLabel', english: 'alternative text' },
    ],
  },
  {
    title: 'Names of formatting',
    diffKinds: HTML_DIFF,
    texts: [
      { name: 'boldLabel', english: 'bold' },
      { name: 'addedBoldLabel', english: 'bold added' },
      { name: 'removedBoldLabel', english: 'bold removed' },
      { name: 'italicLabel', english: 'italic' },
      { name: 'addedItalicLabel', english: 'italic added' },
      { name: 'removedItalicLabel', english: 'italic removed' },
      { name: 'underlineLabel', english: 'underline' },
      { name: 'addedUnderlineLabel', english: 'underline added' },
      { name: 'removedUnderlineLabel', english: 'underline removed' },
      { name: 'strikethroughLabel', english: 'strikethrough' },
      { name: 'addedStrikethroughLabel', english: 'strikethrough added' },
      { name: 'removedStrikethroughLabel', english: 'strikethrough removed' },
      { name: 'superscriptLabel', english: 'superscript' },
      { name: 'addedSuperscriptLabel', english: 'superscript added' },
      { name: 'removedSuperscriptLabel', english: 'superscript removed' },
      { name: 'subscriptLabel', english: 'subscript' },
      { name: 'addedSubscriptLabel', english: 'subscript added' },
      { name: 'removedSubscriptLabel', english: 'subscript removed' },
      { name: 'codeLabel', english: 'code font' },
      { name: 'addedCodeLabel', english: 'code font added' },
      { name: 'removedCodeLabel', english: 'code font removed' },
      { name: 'textHighlightLabel', english: 'highlight' },
      { name: 'addedTextHighlightLabel', english: 'highlight added' },
      { name: 'removedTextHighlightLabel', english: 'highlight removed' },
      { name: 'smallTextLabel', english: 'smaller font' },
      { name: 'addedSmallTextLabel', english: 'smaller font added' },
      { name: 'removedSmallTextLabel', english: 'smaller font removed' },
      { name: 'uppercaseLabel', english: 'uppercase' },
      { name: 'addedUppercaseLabel', english: 'uppercase added' },
      { name: 'removedUppercaseLabel', english: 'uppercase removed' },
      { name: 'lowercaseLabel', english: 'lowercase' },
      { name: 'addedLowercaseLabel', english: 'lowercase added' },
      { name: 'removedLowercaseLabel', english: 'lowercase removed' },
      { name: 'capitalizedLabel', english: 'capitalized' },
      { name: 'addedCapitalizedLabel', english: 'capitalization added' },
      { name: 'removedCapitalizedLabel', english: 'capitalization removed' },
      { name: 'headingLabel', english: 'heading {level}' },
      { name: 'paragraphLabel', english: 'paragraph' },
      { name: 'textColorLabel', english: 'text color' },
      { name: 'addedTextColorLabel', english: 'text color added' },
      { name: 'removedTextColorLabel', english: 'text color removed' },
      { name: 'backgroundColorLabel', english: 'background color' },
      { name: 'addedBackgroundColorLabel', english: 'background color added' },
      { name: 'removedBackgroundColorLabel', english: 'background color removed' },
      { name: 'fontFamilyLabel', english: 'font' },
      { name: 'addedFontFamilyLabel', english: 'font added' },
      { name: 'removedFontFamilyLabel', english: 'font removed' },
      { name: 'fontSizeLabel', english: 'font size' },
      { name: 'addedFontSizeLabel', english: 'font size added' },
      { name: 'removedFontSizeLabel', english: 'font size removed' },
      { name: 'textAlignmentLabel', english: 'alignment' },
      { name: 'addedTextAlignmentLabel', english: 'alignment added' },
      { name: 'removedTextAlignmentLabel', english: 'alignment removed' },
      { name: 'alignLeftLabel', english: 'left' },
      { name: 'alignCenterLabel', english: 'center' },
      { name: 'alignRightLabel', english: 'right' },
      { name: 'alignJustifyLabel', english: 'justified' },
    ],
  },
  {
    title: 'Single column and hidden lines',
    diffKinds: ALL_DIFFS,
    texts: [
      { name: 'inlineContentLabel', english: 'Content after changes' },
      { name: 'showHiddenLinesLabel', english: 'Show hidden lines: {count}' },
      { name: 'hiddenLinesLabel', english: 'Hidden lines: {count}' },
    ],
  },
  {
    title: 'Large documents',
    diffKinds: ALL_DIFFS,
    texts: [
      {
        name: 'largeDocumentLabel',
        english: 'The document is too large to load without confirmation.',
      },
      { name: 'showComparisonLabel', english: 'Show the comparison' },
    ],
  },
  {
    title: 'Toolbar',
    diffKinds: ALL_DIFFS,
    texts: [
      { name: 'addedLinesLabel', english: 'Added lines: {count}' },
      { name: 'removedLinesLabel', english: 'Removed lines: {count}' },
      { name: 'changedLinesLabel', english: 'Changed lines: {count}' },
      { name: 'noChangesLabel', english: 'No changes' },
      { name: 'previousChangeLabel', english: 'Previous change' },
      { name: 'nextChangeLabel', english: 'Next change' },
      { name: 'currentChangeLabel', english: 'Change {current} of {total}' },
      { name: 'changeCountLabel', english: 'Changes: {count}' },
    ],
  },
  {
    title: 'View settings',
    diffKinds: ALL_DIFFS,
    texts: [
      { name: 'viewButtonLabel', english: 'View' },
      { name: 'viewSettingsLabel', english: 'View settings' },
      { name: 'layoutLabel', english: 'Layout' },
      { name: 'autoLayoutLabel', english: 'Auto' },
      { name: 'sideBySideLayoutLabel', english: 'Side by side' },
      { name: 'inlineLayoutLabel', english: 'Single column' },
      { name: 'inlineDiffStyleLabel', english: 'Changes in a single column' },
      { name: 'mergedInlineDiffLabel', english: 'Merged' },
      { name: 'strikethroughInlineDiffLabel', english: 'Struck through' },
      { name: 'stackedInlineDiffLabel', english: 'Stacked' },
      { name: 'colorModeLabel', english: 'Theme' },
      { name: 'autoColorModeLabel', english: 'Auto' },
      { name: 'lightColorModeLabel', english: 'Light' },
      { name: 'darkColorModeLabel', english: 'Dark' },
      { name: 'diffPaletteLabel', english: 'Colors of changes' },
      { name: 'defaultDiffPaletteLabel', english: 'Standard' },
      { name: 'colorblindDiffPaletteLabel', english: 'Colorblind-friendly' },
      { name: 'highContrastDiffPaletteLabel', english: 'High contrast' },
      { name: 'customDiffPaletteLabel', english: 'Custom' },
      { name: 'textFontLabel', english: 'Text font', diffKinds: TEXT_DIFF },
      { name: 'monospaceTextFontLabel', english: 'Fixed width', diffKinds: TEXT_DIFF },
      { name: 'proportionalTextFontLabel', english: 'Regular', diffKinds: TEXT_DIFF },
      { name: 'hideUnchangedLinesLabel', english: 'Hide unchanged lines' },
      { name: 'wrapLinesLabel', english: 'Wrap lines', diffKinds: TEXT_DIFF },
      {
        name: 'showAllWhitespaceLabel',
        english: 'Show all spaces and tabs',
        diffKinds: TEXT_DIFF,
      },
      { name: 'resetUserSettingsLabel', english: 'Restore defaults' },
    ],
  },
];
