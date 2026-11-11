import {
  type ChangeDetail,
  ChangeDetailKind,
  type CheckboxChangeDetail,
  CheckboxState,
  type FormattingChangeDetail,
  FormattingValue,
  type FormattingValueChange,
  type ImageChangeDetail,
  type ImageProperties,
  ImageProperty,
  type LinkChangeDetail,
  type ListMarker,
  type ListMarkerChangeDetail,
  ListMarkerProperty,
  ListStyle,
  ListType,
  TextStyle,
} from '../../engine';
import type { UiTexts } from '../i18n/texts';
import { type ChangedParts, splitChangedParts } from './changed-part';
import {
  type TooltipContent,
  TooltipHighlight,
  type TooltipLine,
  type TooltipPart,
  TooltipPartKind,
  type TooltipSection,
  codePart,
  colorPart,
  descriptionLine,
  rowLine,
  subtitleLine,
  textPart,
  titleOnlyTooltip,
  tooltipPart,
} from './tooltip-content';

/** Name of a text of the interface. */
type TextName = keyof UiTexts;

/** Forms of the name of a formatting: as it is, and added or removed. */
const NameForm = {
  Plain: 'plain',
  Added: 'added',
  Removed: 'removed',
} as const;

type NameForm = (typeof NameForm)[keyof typeof NameForm];

/** Names of the texts of one formatting, in each form. */
type FormattingTextNames = Readonly<Record<NameForm, TextName>>;

/** Formatting values described as a name with values, such as the text color. */
type NamedValue = Exclude<FormattingValue, typeof FormattingValue.HeadingLevel>;

const STYLE_TEXT_NAMES: Readonly<Record<TextStyle, FormattingTextNames>> = {
  [TextStyle.Bold]: { plain: 'boldLabel', added: 'addedBoldLabel', removed: 'removedBoldLabel' },
  [TextStyle.Italic]: {
    plain: 'italicLabel',
    added: 'addedItalicLabel',
    removed: 'removedItalicLabel',
  },
  [TextStyle.Underline]: {
    plain: 'underlineLabel',
    added: 'addedUnderlineLabel',
    removed: 'removedUnderlineLabel',
  },
  [TextStyle.Strikethrough]: {
    plain: 'strikethroughLabel',
    added: 'addedStrikethroughLabel',
    removed: 'removedStrikethroughLabel',
  },
  [TextStyle.Superscript]: {
    plain: 'superscriptLabel',
    added: 'addedSuperscriptLabel',
    removed: 'removedSuperscriptLabel',
  },
  [TextStyle.Subscript]: {
    plain: 'subscriptLabel',
    added: 'addedSubscriptLabel',
    removed: 'removedSubscriptLabel',
  },
  [TextStyle.Code]: { plain: 'codeLabel', added: 'addedCodeLabel', removed: 'removedCodeLabel' },
  [TextStyle.TextHighlight]: {
    plain: 'textHighlightLabel',
    added: 'addedTextHighlightLabel',
    removed: 'removedTextHighlightLabel',
  },
  [TextStyle.SmallText]: {
    plain: 'smallTextLabel',
    added: 'addedSmallTextLabel',
    removed: 'removedSmallTextLabel',
  },
  [TextStyle.Uppercase]: {
    plain: 'uppercaseLabel',
    added: 'addedUppercaseLabel',
    removed: 'removedUppercaseLabel',
  },
  [TextStyle.Lowercase]: {
    plain: 'lowercaseLabel',
    added: 'addedLowercaseLabel',
    removed: 'removedLowercaseLabel',
  },
  [TextStyle.Capitalized]: {
    plain: 'capitalizedLabel',
    added: 'addedCapitalizedLabel',
    removed: 'removedCapitalizedLabel',
  },
};

const VALUE_TEXT_NAMES: Readonly<Record<NamedValue, FormattingTextNames>> = {
  [FormattingValue.TextColor]: {
    plain: 'textColorLabel',
    added: 'addedTextColorLabel',
    removed: 'removedTextColorLabel',
  },
  [FormattingValue.BackgroundColor]: {
    plain: 'backgroundColorLabel',
    added: 'addedBackgroundColorLabel',
    removed: 'removedBackgroundColorLabel',
  },
  [FormattingValue.FontFamily]: {
    plain: 'fontFamilyLabel',
    added: 'addedFontFamilyLabel',
    removed: 'removedFontFamilyLabel',
  },
  [FormattingValue.FontSize]: {
    plain: 'fontSizeLabel',
    added: 'addedFontSizeLabel',
    removed: 'removedFontSizeLabel',
  },
  [FormattingValue.TextAlignment]: {
    plain: 'textAlignmentLabel',
    added: 'addedTextAlignmentLabel',
    removed: 'removedTextAlignmentLabel',
  },
};

/** Values of `text-align` with names in the interface; tooltips show other values as they are. */
const ALIGNMENT_TEXT_NAMES: ReadonlyMap<string, TextName> = new Map([
  ['left', 'alignLeftLabel'],
  ['center', 'alignCenterLabel'],
  ['right', 'alignRightLabel'],
  ['justify', 'alignJustifyLabel'],
]);

/** Formatting values shown with a swatch of their color. */
const COLOR_VALUES: ReadonlySet<FormattingValue> = new Set([
  FormattingValue.TextColor,
  FormattingValue.BackgroundColor,
]);

/** Names of the list types. */
const LIST_TYPE_TEXT_NAMES: Readonly<Record<ListType, TextName>> = {
  [ListType.Bulleted]: 'bulletedListLabel',
  [ListType.Numbered]: 'numberedListLabel',
};

/** List styles with names in the interface; tooltips show other styles as CSS names them. */
const LIST_STYLE_TEXT_NAMES: ReadonlyMap<string, TextName> = new Map([
  [ListStyle.Decimal, 'decimalNumberingLabel'],
  [ListStyle.LowerAlpha, 'lowerAlphaNumberingLabel'],
  [ListStyle.UpperAlpha, 'upperAlphaNumberingLabel'],
  [ListStyle.LowerRoman, 'lowerRomanNumberingLabel'],
  [ListStyle.UpperRoman, 'upperRomanNumberingLabel'],
  [ListStyle.Disc, 'discBulletsLabel'],
  [ListStyle.Circle, 'circleBulletsLabel'],
  [ListStyle.Square, 'squareBulletsLabel'],
]);

/** Titles of a checkbox change by the new state of the checkbox. */
const CHECKBOX_TEXT_NAMES: Readonly<Record<CheckboxState, TextName>> = {
  [CheckboxState.Checked]: 'checkedCheckboxLabel',
  [CheckboxState.Unchecked]: 'uncheckedCheckboxLabel',
};

const LIST_FORMAT_OPTIONS: Intl.ListFormatOptions = { type: 'conjunction' };
const COUNT_PLACEHOLDER = '{count}';
const LEVEL_PLACEHOLDER = '{level}';
const NUMBER_PLACEHOLDER = '{number}';
const ARROW = ' → ';
const LABEL_SEPARATOR = ': ';
const SIZE_SEPARATOR = ' × ';
const PIXEL_UNIT = 'px';
const PIXEL_UNIT_AFTER_SIZES = ' px';
const NO_TEXT = '';

/** Stands for a value that a version does not have, such as the `alt` of an image. */
const MISSING_VALUE = '—';

/** Stands for an empty alternative text, which marks a decorative image. */
const EMPTY_ALT_TEXT = '""';

const DATA_ADDRESS = /^\s*data:/i;

/** Characters of a `data:` address that a tooltip shows; the whole address can be very long. */
const MAX_DATA_ADDRESS_LENGTH = 30;
const ELLIPSIS = '…';
const PATH_SEPARATOR = '/';

/** Starts the query or the fragment of an address; a file name ends before it. */
const QUERY_OR_FRAGMENT_START = /[?#]/;

/** A color as browsers write it, such as `rgb(192, 57, 43)`, with its three channels. */
const RGB_COLOR = /^rgb\((\d+), (\d+), (\d+)\)$/;
const HEX_COLOR_START = '#';
const HEX_RADIX = 16;
const HEX_CHANNEL_LENGTH = 2;
const HEX_PADDING = '0';

/** Describes changes besides changed text in the language of the interface, for tooltips. */
export class ChangeDescriber {
  /** Joins names in the language of the interface, such as "bold and italic". */
  private readonly listFormat: Intl.ListFormat;

  /** Highlights the changed parts of values, unless `highlightsChanges` is false. */
  constructor(
    private readonly texts: UiTexts,
    language: string,
    private readonly highlightsChanges = true,
  ) {
    this.listFormat = new Intl.ListFormat(language, LIST_FORMAT_OPTIONS);
  }

  /** Title of a tooltip of changes; it also names the icon of the changes. */
  title(details: readonly ChangeDetail[]): string {
    return details.length === 1
      ? this.changeTitle(details[0])
      : this.multipleChangesTitle(details.length);
  }

  /**
   * Tooltip of changes: one change with its lines, or several, each under its own title. A change
   * that its title describes, such as a checked checkbox, has no lines.
   */
  tooltip(details: readonly ChangeDetail[]): TooltipContent {
    if (details.length === 1) {
      const [detail] = details;
      const title = this.changeTitle(detail);
      const lines = this.changeLines(detail);

      if (lines.length === 0) {
        return titleOnlyTooltip(title);
      }

      return { title, sections: [{ title: null, lines }] };
    }

    const sections = details.map((detail) => this.titledSection(detail));

    return { title: this.multipleChangesTitle(details.length), sections };
  }

  private titledSection(detail: ChangeDetail): TooltipSection {
    return { title: this.changeTitle(detail), lines: this.changeLines(detail) };
  }

  /** "Formatting changes: 2". */
  private multipleChangesTitle(count: number): string {
    return this.texts.multipleChangesLabel.replaceAll(COUNT_PLACEHOLDER, String(count));
  }

  private changeTitle(detail: ChangeDetail): string {
    switch (detail.kind) {
      case ChangeDetailKind.Formatting:
        return this.texts.formattingChangeLabel;
      case ChangeDetailKind.Link:
        return this.linkTitle(detail);
      case ChangeDetailKind.Image:
        return this.texts.imageChangeLabel;
      case ChangeDetailKind.ListMarker:
        return this.texts.listMarkerChangeLabel;
      case ChangeDetailKind.Checkbox:
        return this.checkboxTitle(detail);
    }
  }

  private changeLines(detail: ChangeDetail): TooltipLine[] {
    switch (detail.kind) {
      case ChangeDetailKind.Formatting:
        return this.formattingLines(detail);
      case ChangeDetailKind.Link:
        return this.linkLines(detail);
      case ChangeDetailKind.Image:
        return this.imageLines(detail);
      case ChangeDetailKind.ListMarker:
        return this.listMarkerLines(detail);
      case ChangeDetailKind.Checkbox:
        return [];
    }
  }

  /** A line about the styles, such as "italic → bold", then a line for each changed value. */
  private formattingLines({
    removedStyles,
    addedStyles,
    changedValues,
  }: FormattingChangeDetail): TooltipLine[] {
    const lines: TooltipLine[] = [];
    const stylesText = this.stylesChangeText(removedStyles, addedStyles);

    if (stylesText !== null) {
      lines.push(descriptionLine([textPart(stylesText)]));
    }

    for (const valueChange of changedValues) {
      lines.push(descriptionLine(this.valueChangeParts(valueChange)));
    }

    return lines;
  }

  /** "italic → bold" when styles turned into others, or else "bold added" or "italic removed". */
  private stylesChangeText(
    removedStyles: readonly TextStyle[],
    addedStyles: readonly TextStyle[],
  ): string | null {
    const stylesReplaced = removedStyles.length > 0 && addedStyles.length > 0;

    if (stylesReplaced) {
      const oldStyles = this.styleNames(removedStyles, NameForm.Plain);
      const newStyles = this.styleNames(addedStyles, NameForm.Plain);

      return oldStyles + ARROW + newStyles;
    }

    if (addedStyles.length > 0) {
      return this.styleNames(addedStyles, NameForm.Added);
    }

    if (removedStyles.length > 0) {
      return this.styleNames(removedStyles, NameForm.Removed);
    }

    return null;
  }

  /** Names of the styles in one form, as a list, such as "bold added and italic added". */
  private styleNames(styles: readonly TextStyle[], form: NameForm): string {
    const names = styles.map((style) => this.texts[STYLE_TEXT_NAMES[style][form]]);
    return this.listFormat.format(names);
  }

  /** "text color: #c0392b → #1e7d4f" with swatches, or "text color added: #1e7d4f". */
  private valueChangeParts({ name, oldValue, newValue }: FormattingValueChange): TooltipPart[] {
    if (name === FormattingValue.HeadingLevel) {
      return [textPart(this.blockName(oldValue) + ARROW + this.blockName(newValue))];
    }

    const textNames = VALUE_TEXT_NAMES[name];

    if (oldValue === null) {
      return [this.labelPart(textNames.added), ...this.valueParts(name, newValue)];
    }

    if (newValue === null) {
      return [this.labelPart(textNames.removed), ...this.valueParts(name, oldValue)];
    }

    return [
      this.labelPart(textNames.plain),
      ...this.valueParts(name, oldValue),
      textPart(ARROW),
      ...this.valueParts(name, newValue),
    ];
  }

  /** A name before its values, such as "text color: ". */
  private labelPart(textName: TextName): TooltipPart {
    return textPart(this.texts[textName] + LABEL_SEPARATOR);
  }

  /** A color with its swatch, an alignment by its name, other values as CSS writes them. */
  private valueParts(name: NamedValue, value: string | null): TooltipPart[] {
    if (value === null) {
      return [textPart(MISSING_VALUE)];
    }

    if (COLOR_VALUES.has(name)) {
      return [colorPart(value), codePart(colorText(value))];
    }

    if (name === FormattingValue.TextAlignment) {
      return [textPart(this.alignmentName(value))];
    }

    return [textPart(value)];
  }

  /** "heading 2" for a heading level, or "paragraph" without one. */
  private blockName(headingLevel: string | null): string {
    if (headingLevel === null) {
      return this.texts.paragraphLabel;
    }

    return this.texts.headingLabel.replaceAll(LEVEL_PLACEHOLDER, headingLevel);
  }

  private alignmentName(alignment: string): string {
    const textName = ALIGNMENT_TEXT_NAMES.get(alignment);
    return textName === undefined ? alignment : this.texts[textName];
  }

  /** "Link added", "Link removed", or "Link address changed". */
  private linkTitle({ oldLink, newLink }: LinkChangeDetail): string {
    if (oldLink === null) {
      return this.texts.addedLinkLabel;
    }

    return newLink === null ? this.texts.removedLinkLabel : this.texts.linkChangeLabel;
  }

  /** The address of an added or a removed link, or rows with the old and the new address. */
  private linkLines({ oldLink, newLink }: LinkChangeDetail): TooltipLine[] {
    if (oldLink === null || newLink === null) {
      const address = shownAddress(oldLink ?? newLink);
      return [descriptionLine([codePart(address)])];
    }

    return this.valueRows(shownAddress(oldLink), shownAddress(newLink), TooltipPartKind.Code);
  }

  /** What changed in an image: its file, its size and its alternative text, in this order. */
  private imageLines({ oldImage, newImage, changedProperties }: ImageChangeDetail): TooltipLine[] {
    const changed = new Set(changedProperties);
    const sizeChanged = changed.has(ImageProperty.Width) || changed.has(ImageProperty.Height);
    const lines: TooltipLine[] = [];

    if (changed.has(ImageProperty.Source)) {
      const moreChanged = changed.size > 1;
      lines.push(...this.fileLines(oldImage.source, newImage.source, moreChanged));
    }

    if (sizeChanged) {
      lines.push(descriptionLine([textPart(this.sizeChangeText(oldImage, newImage))]));
    }

    if (changed.has(ImageProperty.AltText)) {
      const oldAltText = shownAltText(oldImage.altText);
      const newAltText = shownAltText(newImage.altText);

      lines.push(subtitleLine(this.texts.imageAltTextLabel));
      lines.push(...this.valueRows(oldAltText, newAltText, TooltipPartKind.Text));
    }

    return lines;
  }

  /** Rows with the old and the new file, under "file" when more of the image changed. */
  private fileLines(
    oldSource: string | null,
    newSource: string | null,
    withSubtitle: boolean,
  ): TooltipLine[] {
    const [oldFile, newFile] = shownFiles(oldSource, newSource);
    const rows = this.valueRows(oldFile, newFile, TooltipPartKind.Code);

    if (!withSubtitle) {
      return rows;
    }

    return [subtitleLine(this.texts.imageFileLabel), ...rows];
  }

  /** "size: 480 × 270 → 640 × 360 px"; sizes not all in pixels keep their units. */
  private sizeChangeText(oldImage: ImageProperties, newImage: ImageProperties): string {
    const sizes = [oldImage.width, oldImage.height, newImage.width, newImage.height];
    const inPixels = sizes.every((size) => size === null || size.endsWith(PIXEL_UNIT));
    const unit = inPixels ? PIXEL_UNIT_AFTER_SIZES : NO_TEXT;
    const oldSize = sizeText(oldImage, inPixels);
    const newSize = sizeText(newImage, inPixels);

    return this.texts.imageSizeLabel + LABEL_SEPARATOR + oldSize + ARROW + newSize + unit;
  }

  /**
   * A line for each changed property of a list marker, such as "bulleted list → numbered list",
   * "numbers → lowercase letters", "number 5 → number 6" or "level 1 → level 2".
   */
  private listMarkerLines({
    oldMarker,
    newMarker,
    changedProperties,
  }: ListMarkerChangeDetail): TooltipLine[] {
    return changedProperties.map((property) => {
      const oldName = this.markerPropertyName(oldMarker, property);
      const newName = this.markerPropertyName(newMarker, property);

      return descriptionLine([textPart(oldName + ARROW + newName)]);
    });
  }

  /** A property of a marker as tooltips name it; a line without a marker is a paragraph. */
  private markerPropertyName(marker: ListMarker | null, property: ListMarkerProperty): string {
    if (marker === null) {
      return this.texts.paragraphLabel;
    }

    switch (property) {
      case ListMarkerProperty.ListType:
        return this.texts[LIST_TYPE_TEXT_NAMES[marker.listType]];
      case ListMarkerProperty.Style:
        return this.listStyleName(marker.style);
      case ListMarkerProperty.Number:
        return this.texts.itemNumberLabel.replaceAll(NUMBER_PLACEHOLDER, String(marker.number));
      case ListMarkerProperty.Level:
        return this.texts.listLevelLabel.replaceAll(LEVEL_PLACEHOLDER, String(marker.level));
    }
  }

  private listStyleName(style: string): string {
    const textName = LIST_STYLE_TEXT_NAMES.get(style);
    return textName === undefined ? style : this.texts[textName];
  }

  /** "Checkbox checked" or "Checkbox cleared". */
  private checkboxTitle({ newState }: CheckboxChangeDetail): string {
    return this.texts[CHECKBOX_TEXT_NAMES[newState]];
  }

  /** Rows "Before" and "After", each with the part that changed highlighted. */
  private valueRows(oldValue: string, newValue: string, kind: TooltipPartKind): TooltipLine[] {
    const [oldParts, newParts] = this.changedPartsOf(oldValue, newValue);
    const oldValueParts = highlightedParts(oldParts, kind, TooltipHighlight.Removed);
    const newValueParts = highlightedParts(newParts, kind, TooltipHighlight.Added);

    return [
      rowLine(this.texts.oldValueLabel, oldValueParts),
      rowLine(this.texts.newValueLabel, newValueParts),
    ];
  }

  /** Both values split around their changed parts; without highlights, each value is whole. */
  private changedPartsOf(oldValue: string, newValue: string): [ChangedParts, ChangedParts] {
    if (this.highlightsChanges) {
      return splitChangedParts(oldValue, newValue);
    }

    return [wholeValue(oldValue), wholeValue(newValue)];
  }
}

/** A value as one part that both values have, so no part of it is highlighted. */
function wholeValue(value: string): ChangedParts {
  return { start: value, changed: NO_TEXT, end: NO_TEXT };
}

/** Parts of a value: the start and the end as they are, and the changed part highlighted. */
function highlightedParts(
  { start, changed, end }: ChangedParts,
  kind: TooltipPartKind,
  highlight: TooltipHighlight,
): TooltipPart[] {
  const parts = [
    tooltipPart(kind, start),
    tooltipPart(kind, changed, highlight),
    tooltipPart(kind, end),
  ];

  return parts.filter((part) => part.text.length > 0);
}

/** Files as their names, or as whole addresses when both have the same name. */
function shownFiles(oldSource: string | null, newSource: string | null): [string, string] {
  const oldName = fileName(oldSource);
  const newName = fileName(newSource);

  if (oldName !== newName) {
    return [oldName, newName];
  }

  return [shownAddress(oldSource), shownAddress(newSource)];
}

/** Name of the file of an address, such as `logo.svg` of `img/logo.svg?v=2`, or the address. */
function fileName(address: string | null): string {
  if (address === null || DATA_ADDRESS.test(address)) {
    return shownAddress(address);
  }

  const [path] = address.split(QUERY_OR_FRAGMENT_START);
  const name = path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1);

  return name.length > 0 ? name : address;
}

/** An address as tooltips show it: a dash for none, and a long `data:` address shortened. */
function shownAddress(address: string | null): string {
  if (address === null || address.length === 0) {
    return MISSING_VALUE;
  }

  const isLongDataAddress = DATA_ADDRESS.test(address) && address.length > MAX_DATA_ADDRESS_LENGTH;

  return isLongDataAddress ? shortenedDataAddress(address) : address;
}

/** The start of a `data:` address, such as `data:image/png;base64,iVBORw0KGgo…`. */
function shortenedDataAddress(address: string): string {
  return address.slice(0, MAX_DATA_ADDRESS_LENGTH) + ELLIPSIS;
}

/** Alternative text as tooltips show it: a dash without `alt`, and quotes when it is empty. */
function shownAltText(altText: string | null): string {
  if (altText === null) {
    return MISSING_VALUE;
  }

  return altText.length === 0 ? EMPTY_ALT_TEXT : altText;
}

/** "480 × 270" without pixel units, "480px × 50%" with others; a dash for a side without size. */
function sizeText({ width, height }: ImageProperties, inPixels: boolean): string {
  if (width === null && height === null) {
    return MISSING_VALUE;
  }

  return [width, height].map((side) => sideText(side, inPixels)).join(SIZE_SEPARATOR);
}

function sideText(size: string | null, inPixels: boolean): string {
  if (size === null) {
    return MISSING_VALUE;
  }

  return inPixels ? withoutPixelUnit(size) : size;
}

function withoutPixelUnit(size: string): string {
  return size.slice(0, -PIXEL_UNIT.length);
}

/** A color as tooltips write it: `rgb(192, 57, 43)` as `#c0392b`, others as CSS writes them. */
function colorText(color: string): string {
  const channels = RGB_COLOR.exec(color)?.slice(1);

  if (channels === undefined) {
    return color;
  }

  return HEX_COLOR_START + channels.map(hexChannel).join(NO_TEXT);
}

/** A color channel from 0 to 255 as two hexadecimal digits, such as `0f`. */
function hexChannel(channel: string): string {
  return Number(channel).toString(HEX_RADIX).padStart(HEX_CHANNEL_LENGTH, HEX_PADDING);
}
