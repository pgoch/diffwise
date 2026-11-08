import { parseHtml } from './parse-html';
import { prefixIds } from './prefix-ids';

const PREFIX = 'diff-old-';

function prefixed(html: string): string {
  const root = parseHtml(html);

  prefixIds(root, PREFIX);

  return root.innerHTML;
}

describe('prefixIds', () => {
  it('prefixes ids and anchor names', () => {
    expect(prefixed('<h2 id="plans">Plany</h2><p><a name="top"></a>Treść</p>')).toBe(
      '<h2 id="diff-old-plans">Plany</h2><p><a name="diff-old-top"></a>Treść</p>',
    );
  });

  it('prefixes links to parts of the document and leaves other links alone', () => {
    const links =
      '<a href="#plans">Plany</a> <a href="#">Góra</a> <a href="/pomoc#konto">Pomoc</a>';

    expect(prefixed(`<p>${links}</p>`)).toBe(
      '<p><a href="#diff-old-plans">Plany</a> <a href="#">Góra</a> <a href="/pomoc#konto">Pomoc</a></p>',
    );
  });

  it('prefixes every id an attribute refers to', () => {
    expect(prefixed('<p aria-describedby="hint note">Tekst</p>')).toBe(
      '<p aria-describedby="diff-old-hint diff-old-note">Tekst</p>',
    );
    expect(prefixed('<label for="email">E-mail</label><input id="email" name="email">')).toBe(
      '<label for="diff-old-email">E-mail</label><input id="diff-old-email" name="email" disabled="">',
    );
  });

  it('prefixes header cells that data cells refer to', () => {
    expect(
      prefixed('<table><tr><th id="plan">Plan</th><td headers="plan">Osobisty</td></tr></table>'),
    ).toBe(
      '<table><tbody><tr><th id="diff-old-plan">Plan</th><td headers="diff-old-plan">Osobisty</td></tr></tbody></table>',
    );
  });

  it('prefixes the map an image uses', () => {
    expect(
      prefixed('<p><img src="images/plan.svg" usemap="#plan"><map name="plan"></map></p>'),
    ).toBe(
      '<p><img src="images/plan.svg" usemap="#diff-old-plan"><map name="diff-old-plan"></map></p>',
    );
  });

  it('prefixes url(#…) references in SVG', () => {
    const gradient = '<linearGradient id="fade"></linearGradient>';

    expect(prefixed(`<p><svg>${gradient}<rect fill="url(#fade)"></rect></svg></p>`)).toBe(
      '<p><svg><linearGradient id="diff-old-fade"></linearGradient><rect fill="url(#diff-old-fade)"></rect></svg></p>',
    );
  });
});
