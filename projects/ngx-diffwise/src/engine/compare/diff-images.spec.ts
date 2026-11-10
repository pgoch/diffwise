import { diffImages } from './diff-images';
import { diffWords } from './diff-words';
import { parseHtml } from '../html/parse-html';
import { splitLines } from '../html/split-lines';
import {
  ChangeDetailKind,
  DEFAULT_DIFF_OPTIONS,
  type DiffOptions,
  type ImageChangeDetail,
  type ImageProperties,
  ImageProperty,
} from '../model';

const OLD_ID_PREFIX = 'diff-old-';
const NEW_ID_PREFIX = 'diff-new-';
const IGNORE_CASE: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };
const LOGO_2025 = 'images/logo-2025.svg';
const LOGO_2026 = 'images/logo-2026.svg';

/** Image changes of the first lines of two documents, as `[old position, new position, details]`. */
function imageChanges(
  oldHtml: string,
  newHtml: string,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
) {
  const [oldLine] = splitLines(parseHtml(oldHtml), OLD_ID_PREFIX);
  const [newLine] = splitLines(parseHtml(newHtml), NEW_ID_PREFIX);
  const wordChanges = diffWords(oldLine, newLine, options);
  const { oldRanges, newRanges, details } = diffImages(oldLine, newLine, wordChanges, options);

  return oldRanges.map((oldRange, index) => [
    oldRange.start,
    newRanges[index].start,
    oldRange.detailIndices?.map((detailIndex) => details[detailIndex]),
  ]);
}

/** An image with only a file and an alternative text. */
function image(source: string, altText: string | null = null): ImageProperties {
  return { source, width: null, height: null, altText };
}

function change(
  oldImage: ImageProperties,
  newImage: ImageProperties,
  changedProperties: ImageProperty[],
): ImageChangeDetail {
  return { kind: ChangeDetailKind.Image, oldImage, newImage, changedProperties };
}

describe('diffImages', () => {
  it('describes another file in the same place (T23)', () => {
    expect(
      imageChanges(
        '<p><img src="images/logo-2025.svg" alt="Logo"> Notatnik</p>',
        '<p><img src="images/logo-2026.svg" alt="Logo"> Notatnik</p>',
      ),
    ).toEqual([
      [0, 0, [change(image(LOGO_2025, 'Logo'), image(LOGO_2026, 'Logo'), [ImageProperty.Source])]],
    ]);
  });

  it('describes another alternative text of the same file (T24)', () => {
    expect(
      imageChanges(
        '<p>Logo: <img src="images/logo-2025.svg" alt="Logo"></p>',
        '<p>Logo: <img src="images/logo-2025.svg" alt="Logo serwisu"></p>',
      ),
    ).toEqual([
      [
        6,
        6,
        [
          change(image(LOGO_2025, 'Logo'), image(LOGO_2025, 'Logo serwisu'), [
            ImageProperty.AltText,
          ]),
        ],
      ],
    ]);
  });

  it('describes another size of the same file (T26)', () => {
    const oldImage = { ...image(LOGO_2025), width: '160px' };
    const newImage = { ...image(LOGO_2025), width: '220px' };

    expect(
      imageChanges(
        '<p><img src="images/logo-2025.svg" width="160"></p>',
        '<p><img src="images/logo-2025.svg" width="220"></p>',
      ),
    ).toEqual([[0, 0, [change(oldImage, newImage, [ImageProperty.Width])]]]);
  });

  it('compares alternative texts in the case the options say', () => {
    const oldHtml = '<p><img src="images/logo-2025.svg" alt="Logo serwisu"></p>';
    const newHtml = '<p><img src="images/logo-2025.svg" alt="logo serwisu"></p>';

    expect(imageChanges(oldHtml, newHtml)).toHaveLength(1);
    expect(imageChanges(oldHtml, newHtml, IGNORE_CASE)).toEqual([]);
  });

  it('gives no details for an image added to or removed from a sentence', () => {
    const withIcon = '<p><img src="a.svg"> Kliknij <img src="share.svg"> Udostępnij.</p>';
    const withoutIcon = '<p><img src="a.svg"> Kliknij Udostępnij.</p>';

    expect(imageChanges(withIcon, withoutIcon)).toEqual([]);
    expect(imageChanges(withoutIcon, withIcon)).toEqual([]);
  });

  it('pairs a removed and an added image only between the same unchanged words', () => {
    expect(
      imageChanges(
        '<p><img src="a.svg"> Zdanie bez zmian. <img src="b.svg"></p>',
        '<p><img src="c.svg"> Zdanie bez zmian.</p>',
      ),
    ).toEqual([[0, 0, [change(image('a.svg'), image('c.svg'), [ImageProperty.Source])]]]);
    expect(
      imageChanges(
        '<p>Zdanie bez zmian. <img src="a.svg"></p>',
        '<p><img src="b.svg"> Zdanie bez zmian.</p>',
      ),
    ).toEqual([]);
  });

  it('describes an image inside a link and inside a table cell', () => {
    const shieldOf = (width: string) => ({ ...image('images/icon-shield.svg', ''), width });

    expect(
      imageChanges(
        '<p><a href="https://example.com"><img src="images/logo-2025.svg"></a></p>',
        '<p><a href="https://example.com"><img src="images/logo-2026.svg"></a></p>',
      ),
    ).toEqual([[0, 0, [change(image(LOGO_2025), image(LOGO_2026), [ImageProperty.Source])]]]);
    expect(
      imageChanges(
        '<table><tr><td><img src="images/icon-shield.svg" alt="" width="16"> Panel</td></tr></table>',
        '<table><tr><td><img src="images/icon-shield.svg" alt="" width="20"> Panel</td></tr></table>',
      ),
    ).toEqual([[0, 0, [change(shieldOf('16px'), shieldOf('20px'), [ImageProperty.Width])]]]);
  });

  it('lists several changed images in reading order', () => {
    const narrowImage = { ...image('a.svg'), width: '10px' };
    const wideImage = { ...image('a.svg'), width: '20px' };

    expect(
      imageChanges(
        '<p><img src="a.svg" width="10"> i <img src="b.svg" alt="Stary"></p>',
        '<p><img src="a.svg" width="20"> i <img src="b.svg" alt="Nowy"></p>',
      ),
    ).toEqual([
      [0, 0, [change(narrowImage, wideImage, [ImageProperty.Width])]],
      [4, 4, [change(image('b.svg', 'Stary'), image('b.svg', 'Nowy'), [ImageProperty.AltText])]],
    ]);
  });
});
