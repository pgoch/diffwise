import {
  type ChangeDetail,
  ChangeDetailKind,
  FormattingValue,
  type FormattingValueChange,
  type ImageProperties,
  ImageProperty,
  TextStyle,
} from '../../engine';
import { ENGLISH_TEXTS } from '../i18n/en';
import { POLISH_TEXTS } from '../i18n/pl';
import { ChangeDescriber } from './change-texts';
import {
  type TooltipContent,
  TooltipHighlight,
  type TooltipLine,
  TooltipLineKind,
  type TooltipPart,
  TooltipPartKind,
} from './tooltip-content';

const ENGLISH = 'en';
const POLISH = 'pl';
const NO_TEXT = '';

/** Marks of the text form of a tooltip, as `tooltipText` writes it. */
const SUBTITLE_START = '# ';
const LABEL_SEPARATOR = ': ';
const SWATCH = '■ ';
const REMOVED_START = '[-';
const REMOVED_END = '-]';
const ADDED_START = '[+';
const ADDED_END = '+]';

const IMAGE_PROPERTIES = Object.values(ImageProperty);

const NO_IMAGE_PROPERTIES: ImageProperties = {
  source: null,
  width: null,
  height: null,
  altText: null,
};

const english = new ChangeDescriber(ENGLISH_TEXTS, ENGLISH);
const polish = new ChangeDescriber(POLISH_TEXTS, POLISH);

function formatting(
  removedStyles: TextStyle[],
  addedStyles: TextStyle[],
  changedValues: FormattingValueChange[] = [],
): ChangeDetail {
  return { kind: ChangeDetailKind.Formatting, removedStyles, addedStyles, changedValues };
}

function valueChange(
  name: FormattingValue,
  oldValue: string | null,
  newValue: string | null,
): FormattingValueChange {
  return { name, oldValue, newValue };
}

function link(oldLink: string | null, newLink: string | null): ChangeDetail {
  return { kind: ChangeDetailKind.Link, oldLink, newLink };
}

/** A changed image; the properties left out are `null`, and the ones that differ changed. */
function image(
  oldProperties: Partial<ImageProperties>,
  newProperties: Partial<ImageProperties>,
): ChangeDetail {
  const oldImage = { ...NO_IMAGE_PROPERTIES, ...oldProperties };
  const newImage = { ...NO_IMAGE_PROPERTIES, ...newProperties };
  const changedProperties = IMAGE_PROPERTIES.filter((name) => oldImage[name] !== newImage[name]);

  return { kind: ChangeDetailKind.Image, oldImage, newImage, changedProperties };
}

/**
 * A tooltip as text: the title, then a text for each line. A subtitle and the title of a change
 * start with `# `, a row with its label, highlighted parts are `[-…-]` and `[+…+]`, a swatch `■`.
 */
function tooltipText(content: TooltipContent): string[] {
  const texts = [content.title];

  for (const section of content.sections) {
    if (section.title !== null) {
      texts.push(SUBTITLE_START + section.title);
    }

    texts.push(...section.lines.map(lineText));
  }

  return texts;
}

/** Texts of the lines of a tooltip of one change, without its title. */
function linesOf(describer: ChangeDescriber, detail: ChangeDetail): string[] {
  return tooltipText(describer.tooltip([detail])).slice(1);
}

function lineText(line: TooltipLine): string {
  const value = line.parts.map(partText).join(NO_TEXT);

  switch (line.kind) {
    case TooltipLineKind.Subtitle:
      return SUBTITLE_START + value;
    case TooltipLineKind.Row:
      return line.label + LABEL_SEPARATOR + value;
    case TooltipLineKind.Description:
      return value;
  }
}

function partText({ kind, text, highlight }: TooltipPart): string {
  if (kind === TooltipPartKind.Color) {
    return SWATCH;
  }

  switch (highlight) {
    case TooltipHighlight.Removed:
      return REMOVED_START + text + REMOVED_END;
    case TooltipHighlight.Added:
      return ADDED_START + text + ADDED_END;
    case null:
      return text;
  }
}

/** Kinds of the parts of a tooltip of one change, each once. */
function partKindsOf(content: TooltipContent): Set<TooltipPartKind> {
  const parts = content.sections.flatMap((section) => section.lines.flatMap((line) => line.parts));
  return new Set(parts.map((part) => part.kind));
}

describe('ChangeDescriber', () => {
  it('describes styles turned into others with an arrow, in the language of the interface (U36 A)', () => {
    const detail = formatting([TextStyle.Italic], [TextStyle.Bold, TextStyle.Underline]);

    expect(tooltipText(english.tooltip([detail]))).toEqual([
      'Formatting change',
      'italic → bold and underline',
    ]);
    expect(tooltipText(polish.tooltip([detail]))).toEqual([
      'Zmiana formatowania',
      'kursywa → pogrubienie i podkreślenie',
    ]);
  });

  it('names added and removed styles in forms of their own (U36 A)', () => {
    expect(linesOf(polish, formatting([], [TextStyle.Bold, TextStyle.Italic]))).toEqual([
      'dodane pogrubienie i dodana kursywa',
    ]);
    expect(linesOf(polish, formatting([TextStyle.Italic], []))).toEqual(['usunięta kursywa']);
    expect(linesOf(english, formatting([], [TextStyle.Capitalized]))).toEqual([
      'capitalization added',
    ]);
  });

  it('describes heading levels, and a paragraph turned into a heading (T12)', () => {
    const levels = formatting([], [], [valueChange(FormattingValue.HeadingLevel, '3', '2')]);
    const paragraph = formatting([], [], [valueChange(FormattingValue.HeadingLevel, null, '2')]);

    expect(linesOf(english, levels)).toEqual(['heading 3 → heading 2']);
    expect(linesOf(polish, paragraph)).toEqual(['akapit → nagłówek 2']);
  });

  it('shows colors with swatches and writes them in hexadecimal digits (U37 B)', () => {
    const textColor = valueChange(
      FormattingValue.TextColor,
      'rgb(192, 57, 43)',
      'rgb(30, 125, 79)',
    );
    const content = english.tooltip([formatting([], [], [textColor])]);
    const [line] = content.sections[0].lines;
    const swatchColors = line.parts.filter((part) => part.kind === TooltipPartKind.Color);
    const colorTexts = line.parts.filter((part) => part.kind === TooltipPartKind.Code);

    expect(lineText(line)).toBe('text color: ■ #c0392b → ■ #1e7d4f');
    expect(swatchColors.map((part) => part.text)).toEqual(['rgb(192, 57, 43)', 'rgb(30, 125, 79)']);
    expect(colorTexts.map((part) => part.text)).toEqual(['#c0392b', '#1e7d4f']);
  });

  it('writes other colors as CSS writes them', () => {
    const background = valueChange(
      FormattingValue.BackgroundColor,
      'rgba(255, 0, 0, 0.5)',
      'yellow',
    );

    expect(linesOf(english, formatting([], [], [background]))).toEqual([
      'background color: ■ rgba(255, 0, 0, 0.5) → ■ yellow',
    ]);
  });

  it('names a value added or removed, with the value after the name (U36 A)', () => {
    const addedColor = valueChange(FormattingValue.TextColor, null, 'rgb(192, 57, 43)');
    const removedFont = valueChange(FormattingValue.FontFamily, 'Georgia, serif', null);

    expect(linesOf(polish, formatting([], [], [addedColor]))).toEqual([
      'dodany kolor tekstu: ■ #c0392b',
    ]);
    expect(linesOf(polish, formatting([], [], [removedFont]))).toEqual([
      'usunięta czcionka: Georgia, serif',
    ]);
  });

  it('names alignments in the language of the interface and keeps other values as they are', () => {
    const alignment = valueChange(FormattingValue.TextAlignment, 'left', 'center');
    const fontSize = valueChange(FormattingValue.FontSize, '14px', '18px');
    const otherAlignment = valueChange(FormattingValue.TextAlignment, 'start', 'justify');

    expect(linesOf(polish, formatting([], [], [alignment, fontSize]))).toEqual([
      'wyrównanie: do lewej → do środka',
      'rozmiar tekstu: 14px → 18px',
    ]);
    expect(linesOf(english, formatting([], [], [otherAlignment]))).toEqual([
      'alignment: start → justified',
    ]);
  });

  it('describes the styles first, then each changed value', () => {
    const textColor = valueChange(FormattingValue.TextColor, 'red', 'blue');
    const detail = formatting([TextStyle.Italic], [TextStyle.Bold], [textColor]);

    expect(linesOf(english, detail)).toEqual(['italic → bold', 'text color: ■ red → ■ blue']);
  });

  it('shows the old and the new address of a link with the changed part highlighted (U9 C)', () => {
    const content = english.tooltip([
      link('https://example.com/terms-2025', 'https://example.com/terms-2026'),
    ]);

    expect(tooltipText(content)).toEqual([
      'Link address changed',
      'Before: https://example.com/terms-[-2025-]',
      'After: https://example.com/terms-[+2026+]',
    ]);
    expect(partKindsOf(content)).toEqual(new Set([TooltipPartKind.Code]));
  });

  it('titles an added or a removed link and shows its address (U40 A)', () => {
    const address = 'https://example.com/pomoc/linki-publiczne';

    expect(tooltipText(polish.tooltip([link(null, address)]))).toEqual(['Dodany link', address]);
    expect(tooltipText(polish.tooltip([link(address, null)]))).toEqual(['Usunięty link', address]);
  });

  it('shortens a long data address', () => {
    const dataAddress = 'data:image/png;base64,' + 'iVBORw0KGgo'.repeat(100);

    expect(linesOf(english, link(null, dataAddress))).toEqual(['data:image/png;base64,iVBORw0K…']);
  });

  it('shows the files of a changed image by their names (U38 C)', () => {
    const detail = image({ source: 'img/logo-2025.svg' }, { source: 'img/logo-2026.svg?v=2' });

    expect(linesOf(polish, detail)).toEqual(['Było: logo-[-2025-].svg', 'Jest: logo-[+2026+].svg']);
  });

  it('shows whole addresses when both files have the same name (U38 C)', () => {
    const detail = image(
      { source: 'https://cdn.example.com/media/2025/logo.svg' },
      { source: 'https://cdn.example.com/media/2026/logo.svg' },
    );

    expect(linesOf(english, detail)).toEqual([
      'Before: https://cdn.example.com/media/[-2025-]/logo.svg',
      'After: https://cdn.example.com/media/[+2026+]/logo.svg',
    ]);
  });

  it('shows both sides of a size in one line, with pixels once at the end (U39 A, T26)', () => {
    const detail = image(
      { source: 'editor.png', width: '480px', height: '270px' },
      { source: 'editor.png', width: '640px', height: '360px' },
    );

    expect(linesOf(polish, detail)).toEqual(['rozmiar: 480 × 270 → 640 × 360 px']);
  });

  it('keeps units of sizes not all in pixels, and shows a dash for a side without size', () => {
    const percent = image({ width: '480px' }, { width: '50%' });
    const sized = image({}, { width: '640px', height: '360px' });

    expect(linesOf(english, percent)).toEqual(['size: 480px × — → 50% × —']);
    expect(linesOf(english, sized)).toEqual(['size: — → 640 × 360 px']);
  });

  it('heads the alternative text, and the files when more of the image changed (T24)', () => {
    const detail = image(
      { source: 'img/logo-2025.svg', width: '220px', height: '72px', altText: 'Logo serwisu' },
      {
        source: 'img/logo-2026.svg',
        width: '240px',
        height: '80px',
        altText: 'Logo serwisu Notatnik',
      },
    );

    expect(linesOf(polish, detail)).toEqual([
      '# plik',
      'Było: logo-[-2025-].svg',
      'Jest: logo-[+2026+].svg',
      'rozmiar: 220 × 72 → 240 × 80 px',
      '# tekst alternatywny',
      'Było: Logo serwisu',
      'Jest: Logo serwisu[+ Notatnik+]',
    ]);
  });

  it('shows a missing alternative text as a dash, and an empty one as quotes', () => {
    const detail = image({ source: 'icon.png' }, { source: 'icon.png', altText: '' });

    expect(linesOf(english, detail)).toEqual([
      '# alternative text',
      'Before: [-—-]',
      'After: [+""+]',
    ]);
  });

  it('lists several changes, each under its title (U27 E, T22)', () => {
    const details = [
      formatting([], [TextStyle.Bold]),
      link('https://example.com/a', 'https://example.com/b'),
    ];

    expect(tooltipText(english.tooltip(details))).toEqual([
      'Formatting changes: 2',
      '# Formatting change',
      'bold added',
      '# Link address changed',
      'Before: https://example.com/[-a-]',
      'After: https://example.com/[+b+]',
    ]);
  });

  it('titles one change by its kind and several by their number', () => {
    const details = [formatting([], [TextStyle.Bold]), image({ source: 'a.png' }, {})];

    expect(polish.title([details[1]])).toBe('Zmieniony obrazek');
    expect(polish.title(details)).toBe('Zmiany formatowania: 2');
  });

  it('puts values in custom texts in place of their placeholders', () => {
    const customTexts = {
      ...ENGLISH_TEXTS,
      multipleChangesLabel: '{count} changes in this line',
      headingLabel: 'H{level}',
    };
    const describer = new ChangeDescriber(customTexts, ENGLISH);
    const headingLevel = valueChange(FormattingValue.HeadingLevel, '3', '2');
    const details = [formatting([], [], [headingLevel]), link(null, 'https://example.com')];

    expect(describer.title(details)).toBe('2 changes in this line');
    expect(linesOf(describer, details[0])).toEqual(['H3 → H2']);
  });
});
