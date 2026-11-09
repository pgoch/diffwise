import { imageProperties } from './line-images';
import { parseHtml } from './parse-html';

const IMAGE_SELECTOR = 'img';
const MISSING_IMAGE_ERROR = 'The document has no image.';
const NO_PROPERTIES = { source: null, width: null, height: null, altText: null };

/** Properties of the first image of a document. */
function propertiesOf(html: string) {
  const image = parseHtml(html).querySelector(IMAGE_SELECTOR);

  if (image === null) {
    throw new Error(MISSING_IMAGE_ERROR);
  }

  return imageProperties(image);
}

describe('imageProperties', () => {
  it('reads the file, the size and the alternative text of an image', () => {
    expect(
      propertiesOf(
        '<img src=" images/logo-2025.svg " alt=" Notebook\n Online  logo" width="64" height="64">',
      ),
    ).toEqual({
      source: 'images/logo-2025.svg',
      width: '64px',
      height: '64px',
      altText: 'Notebook Online logo',
    });
  });

  it('gives null for what an image does not set, but keeps an empty alternative text', () => {
    expect(propertiesOf('<img>')).toEqual(NO_PROPERTIES);
    expect(propertiesOf('<img src="" alt="">')).toEqual({ ...NO_PROPERTIES, altText: '' });
  });

  it('reads the size from the style over the attributes, as CSS does', () => {
    expect(
      propertiesOf('<img src="a.svg" width="480" height="270" style="width: 50%; height: 12em">'),
    ).toEqual({ ...NO_PROPERTIES, source: 'a.svg', width: '50%', height: '12em' });
    expect(propertiesOf('<img src="a.svg" width="480" style="width: auto">').width).toBeNull();
  });

  it('reads size attributes the way browsers do', () => {
    expect(propertiesOf('<img width="480px">').width).toBe('480px');
    expect(propertiesOf('<img width="12.50">').width).toBe('12.5px');
    expect(propertiesOf('<img width=" 50% ">').width).toBe('50%');
    expect(propertiesOf('<img width="wide">').width).toBeNull();
  });
});
