import { type ListMarker, ListStyle, ListType } from '../model';
import { listMarkerText } from './list-marker-text';

const ARMENIAN_STYLE = 'armenian';
const FIRST_NUMBER = 1;
const TOP_LEVEL = 1;

function markerOf(listType: ListType, style: string, number = FIRST_NUMBER): ListMarker {
  return { listType, style, number, unshiftedNumber: number, level: TOP_LEVEL };
}

/** Text of a numbered marker of the style and number. */
function numberedText(style: string, number: number): string | null {
  return listMarkerText(markerOf(ListType.Numbered, style, number));
}

/** Texts of a numbered marker of the style for each number. */
function numberedTexts(style: string, numbers: number[]): (string | null)[] {
  return numbers.map((number) => numberedText(style, number));
}

describe('listMarkerText', () => {
  it('writes numbers with a dot, also with a leading zero', () => {
    expect(numberedTexts(ListStyle.Decimal, [5, -2])).toEqual(['5.', '-2.']);
    expect(numberedTexts(ListStyle.DecimalLeadingZero, [5, 12, -3])).toEqual([
      '05.',
      '12.',
      '-03.',
    ]);
  });

  it('counts letters as CSS does, going on with two letters after z', () => {
    expect(numberedTexts(ListStyle.LowerAlpha, [1, 3, 26, 27, 28])).toEqual([
      'a.',
      'c.',
      'z.',
      'aa.',
      'ab.',
    ]);
    expect(numberedTexts(ListStyle.UpperAlpha, [2, 703])).toEqual(['B.', 'AAA.']);
    expect(numberedTexts(ListStyle.LowerGreek, [3, 24, 25])).toEqual(['γ.', 'ω.', 'αα.']);
  });

  it('writes Roman numerals in both cases', () => {
    expect(numberedTexts(ListStyle.LowerRoman, [4, 14, 1999])).toEqual(['iv.', 'xiv.', 'mcmxcix.']);
    expect(numberedTexts(ListStyle.UpperRoman, [2026])).toEqual(['MMXXVI.']);
  });

  it('writes numbers out of the range of a style in digits', () => {
    expect(numberedText(ListStyle.LowerAlpha, 0)).toBe('0.');
    expect(numberedText(ListStyle.UpperRoman, 4000)).toBe('4000.');
    expect(numberedText(ListStyle.LowerRoman, -1)).toBe('-1.');
  });

  it('gives a bullet its character', () => {
    const bullets = [ListStyle.Disc, ListStyle.Circle, ListStyle.Square].map((style) =>
      listMarkerText(markerOf(ListType.Bulleted, style)),
    );

    expect(bullets).toEqual(['•', '◦', '▪']);
  });

  it('gives no text for a style it does not draw', () => {
    expect(numberedText(ARMENIAN_STYLE, 3)).toBeNull();
  });
});
