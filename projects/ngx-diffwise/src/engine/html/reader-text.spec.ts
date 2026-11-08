import { parseHtml } from './parse-html';
import { readerText } from './reader-text';

function textOf(html: string): string {
  return readerText(parseHtml(html).childNodes);
}

describe('readerText', () => {
  it('collapses whitespace a reader cannot see (T8)', () => {
    expect(textOf('<p>Konto  osobiste</p>')).toBe('Konto osobiste');
    expect(textOf('<p>Konto&nbsp;osobiste</p>')).toBe('Konto osobiste');
    expect(textOf('<p>\n  Konto\nosobiste </p>')).toBe('Konto osobiste');
  });

  it('reads entities as the characters a reader sees (T11)', () => {
    expect(textOf('<p>Rabat &lt; 20 zł &amp; darmowa dostawa</p>')).toBe(
      'Rabat < 20 zł & darmowa dostawa',
    );
  });

  it('keeps Polish letters and emoji intact (T13)', () => {
    expect(textOf('<p>Zażółć gęślą jaźń 🙂🎉</p>')).toBe('Zażółć gęślą jaźń 🙂🎉');
  });

  it('keeps words whole across inline formatting', () => {
    expect(textOf('<p>Read the <b>full</b> guide<i>lines</i>.</p>')).toBe(
      'Read the full guidelines.',
    );
  });

  it('separates words at blocks, line breaks and images', () => {
    expect(textOf('<p>one</p><p>two</p>')).toBe('one two');
    expect(textOf('<p>one<br>two<img src="images/icon-share.svg" alt="">three</p>')).toBe(
      'one two three',
    );
  });

  it('keeps spaces and line breaks in code blocks', () => {
    expect(textOf('<pre>let a  = 1;\n  let b = 2;</pre>')).toBe('let a  = 1;\n  let b = 2;');
  });

  it('reads a no-break space in a code block as a space', () => {
    expect(textOf('<pre>a&nbsp;b</pre>')).toBe('a b');
  });

  it('gives empty text for an empty document', () => {
    expect(textOf('')).toBe('');
  });
});
