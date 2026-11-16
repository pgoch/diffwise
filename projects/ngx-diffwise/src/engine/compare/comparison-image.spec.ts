import { comparisonImage, imageWordKey } from './comparison-image';
import { DEFAULT_DIFF_OPTIONS, type ImageProperties } from '../model';

const LOGO: ImageProperties = {
  source: 'images/logo-2025.svg',
  width: '160px',
  height: null,
  altText: 'Notebook  Logo',
};

describe('imageWordKey', () => {
  it('gives images the same key only for the same file', () => {
    const resizedLogo = { ...LOGO, width: '220px', altText: 'Logo' };
    const newLogo = { ...LOGO, source: 'images/logo-2026.svg' };

    expect(imageWordKey({ position: 0, properties: LOGO })).toBe(
      imageWordKey({ position: 5, properties: resizedLogo }),
    );
    expect(imageWordKey({ position: 0, properties: LOGO })).not.toBe(
      imageWordKey({ position: 0, properties: newLogo }),
    );
  });
});

describe('comparisonImage', () => {
  it('keeps an image as it is by default', () => {
    expect(comparisonImage(LOGO, DEFAULT_DIFF_OPTIONS)).toEqual(LOGO);
  });

  it('compares the alternative text as the options compare text', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true, ignoreCase: true };
    const withoutAltText = { ...LOGO, altText: null };

    expect(comparisonImage(LOGO, options)).toEqual({ ...LOGO, altText: 'notebooklogo' });
    expect(comparisonImage(withoutAltText, options)).toEqual(withoutAltText);
  });
});
