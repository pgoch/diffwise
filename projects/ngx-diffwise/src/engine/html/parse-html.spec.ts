import { parseHtml } from './parse-html';

describe('parseHtml', () => {
  it('parses a fragment into sanitized elements', () => {
    expect(parseHtml('<p onclick="alert(1)">Text</p><script>alert(1)</script>').innerHTML).toBe(
      '<p>Text</p>',
    );
  });

  it('takes the body of a full document', () => {
    const html =
      '<!doctype html><html><head><title>Title</title></head><body><p>Text</p></body></html>';

    expect(parseHtml(html).innerHTML).toBe('<p>Text</p>');
  });

  it('closes unclosed tags the way a browser does (T37)', () => {
    expect(parseHtml('<p>Paragraph <b>not closed').innerHTML).toBe(
      '<p>Paragraph <b>not closed</b></p>',
    );
  });

  it('drops comments', () => {
    expect(parseHtml('<p>Text<!-- note --></p>').innerHTML).toBe('<p>Text</p>');
  });

  it('drops hidden elements', () => {
    expect(parseHtml('<p>Text</p><p hidden>Secret</p>').innerHTML).toBe('<p>Text</p>');
  });

  it('returns an empty element for empty input', () => {
    expect(parseHtml('').childNodes.length).toBe(0);
  });
});
