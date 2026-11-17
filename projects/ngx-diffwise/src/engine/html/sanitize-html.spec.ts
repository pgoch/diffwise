import enLongAfter from '../../../../../test-data/en/long/after.html?raw';
import enLongBefore from '../../../../../test-data/en/long/before.html?raw';
import plLongAfter from '../../../../../test-data/pl/long/after.html?raw';
import plLongBefore from '../../../../../test-data/pl/long/before.html?raw';
import { parseHtml } from './parse-html';
import { sanitizeHtml, sanitizeHtmlPieces } from './sanitize-html';
import { splitLines } from './split-lines';

const ID_PREFIX = 'diff';
const STYLE_ATTRIBUTE = 'style';

/** Both versions of the long samples from `test-data/`, as `[name, html]`. */
const LONG_SAMPLES: [string, string][] = [
  ['en/long/before', enLongBefore],
  ['en/long/after', enLongAfter],
  ['pl/long/before', plLongBefore],
  ['pl/long/after', plLongAfter],
];

/** Pieces of HTML with dangerous parts, cleaned together and alone in the tests. */
const DANGEROUS_PIECES = [
  '<p>Text <img src="x.png" onerror="alert(1)"><script>alert(1)</script></p>',
  '<a href="javascript:alert(1)">link</a><a href="https://example.com" target="_blank">new tab</a>',
  '<p style="color: red; position: fixed; background: url(x.png)">Styled</p>',
  '<p class="abc">Text <b onclick="alert(1)">not closed',
  '',
  '<form action="/send"><input type="checkbox" checked tabindex="0"></form>',
  '<table><tbody><tr><td>Cell</td></tr></tbody></table>',
  '<ul><li data-diffwise-line-item="">Item</li></ul>',
];

function sanitize(html: string): DocumentFragment {
  const template = document.createElement('template');

  template.innerHTML = sanitizeHtml(html);

  return template.content;
}

describe('sanitizeHtml', () => {
  it('removes scripts and event handlers', () => {
    expect(sanitizeHtml('<p onclick="alert(1)">Text</p><script>alert(1)</script>')).toBe(
      '<p>Text</p>',
    );
  });

  it('removes javascript: link addresses', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">Click</a>')).toBe('<a>Click</a>');
  });

  it('keeps safe links', () => {
    expect(sanitizeHtml('<a href="https://example.com/help">Help</a>')).toBe(
      '<a href="https://example.com/help">Help</a>',
    );
  });

  it('keeps text color and alignment from style attributes', () => {
    const paragraph = sanitize('<p style="color: red; text-align: center">Text</p>')
      .firstElementChild as HTMLElement;

    expect(paragraph.style.color).toBe('red');
    expect(paragraph.style.textAlign).toBe('center');
  });

  it('removes style properties that could move content out of the diff', () => {
    const paragraph = sanitize(
      '<p style="color: red; position: fixed; z-index: 10; transform: scale(9)">Text</p>',
    ).firstElementChild as HTMLElement;

    expect(paragraph.style.color).toBe('red');
    expect(paragraph.style.position).toBe('');
    expect(paragraph.style.zIndex).toBe('');
    expect(paragraph.style.transform).toBe('');
  });

  it('removes style properties that load content from the network', () => {
    const paragraph = sanitize(
      '<p style="background-image: url(https://example.com/pixel.png)">Text</p>',
    ).firstElementChild as HTMLElement;

    expect(paragraph.hasAttribute(STYLE_ATTRIBUTE)).toBe(false);
  });

  it('cleans pieces of HTML together as it cleans each of them alone', () => {
    expect(sanitizeHtmlPieces(DANGEROUS_PIECES)).toEqual(DANGEROUS_PIECES.map(sanitizeHtml));
  });

  it.each(LONG_SAMPLES)('cleans the lines of %s together as it cleans each alone', (_, html) => {
    const lines = splitLines(parseHtml(html), ID_PREFIX).map((line) => line.html);

    expect(sanitizeHtmlPieces(lines)).toEqual(lines.map(sanitizeHtml));
  });

  it('keeps an unclosed tag of one piece out of the next piece', () => {
    expect(sanitizeHtmlPieces(['<p><b>Not closed', '<p>Next</p>'])).toEqual([
      '<p><b>Not closed</b></p>',
      '<p>Next</p>',
    ]);
  });

  it('cleans each piece alone when a piece closes its cell among the others', () => {
    const pieces = ['<p>First</p>', '</td><td><p>Out of its cell</p>', '<p>Last</p>'];

    expect(sanitizeHtmlPieces(pieces)).toEqual([
      '<p>First</p>',
      '<p>Out of its cell</p>',
      '<p>Last</p>',
    ]);
  });

  it('cleans no pieces into no pieces', () => {
    expect(sanitizeHtmlPieces([])).toEqual([]);
  });

  it('cleans dangerous parts at any depth of a fragment', () => {
    const html =
      '<p class="abc">Text <span><b><img src="x.png" onerror="alert(1)"> '
      + '<a href="javascript:alert(1)">link</a></b></span><script>alert(1)</script> end</p>';

    expect(sanitizeHtml(html)).toBe(
      '<p class="abc">Text <span><b><img src="x.png"> <a>link</a></b></span> end</p>',
    );
  });

  it('closes unclosed tags and cleans them too', () => {
    expect(sanitizeHtml('<p class="abc">Text <b onclick="alert(1)">not closed')).toBe(
      '<p class="abc">Text <b>not closed</b></p>',
    );
  });

  it('cleans text pasted from Word', () => {
    const html =
      '<p class="MsoNormal" style="color: red; mso-line-height-rule: exactly">Text<o:p></o:p></p>'
      + '<!--[if gte mso 9]><xml><o:OfficeDocumentSettings></o:OfficeDocumentSettings></xml><![endif]-->';

    expect(sanitizeHtml(html)).toBe('<p class="MsoNormal" style="color: red;">Text</p>');
  });

  it('removes style elements with their content', () => {
    expect(sanitizeHtml('<style>body { display: none }</style><p>Text</p>')).toBe('<p>Text</p>');
  });

  it('removes forms but keeps their content', () => {
    expect(sanitizeHtml('<form action="https://example.com"><p>Text</p></form>')).toBe(
      '<p>Text</p>',
    );
  });

  it('keeps checkboxes but makes them read-only', () => {
    const checkbox = sanitize('<input type="checkbox" checked>')
      .firstElementChild as HTMLInputElement;

    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });

  it('keeps id attributes for footnotes and anchors', () => {
    expect(sanitizeHtml('<h2 id="pricing">Pricing</h2>')).toBe('<h2 id="pricing">Pricing</h2>');
  });

  it('keeps links that open a new tab and protects the opener', () => {
    const link = sanitize('<a href="https://example.com" target="_blank">Example</a>')
      .firstElementChild as HTMLAnchorElement;

    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('removes other link targets', () => {
    expect(sanitizeHtml('<a href="https://example.com" target="_top">Example</a>')).toBe(
      '<a href="https://example.com">Example</a>',
    );
  });

  it('removes attributes that take focus or open popovers', () => {
    expect(sanitizeHtml('<p tabindex="1" popover="auto">Text</p>')).toBe('<p>Text</p>');
  });
});
