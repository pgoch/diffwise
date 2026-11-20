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

  it('closes unclosed tags the way a browser does', () => {
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

  it('drops data-diffwise attributes, so the content cannot pose as details of a change', () => {
    const html =
      '<p data-diffwise-change-details="0" data-note="1"><b data-diffwise-x="">Text</b></p>';

    expect(parseHtml(html).innerHTML).toBe('<p data-note="1"><b>Text</b></p>');
  });

  it('turns customized built-in elements into plain ones with their attributes and text', () => {
    const html = '<p is="my-paragraph" class="note">Text <span is="my-span">inside</span></p>';

    expect(parseHtml(html).innerHTML).toBe('<p class="note">Text <span>inside</span></p>');
  });
});
