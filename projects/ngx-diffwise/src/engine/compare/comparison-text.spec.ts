import { comparisonText } from './comparison-text';
import { DEFAULT_DIFF_OPTIONS } from '../model';

describe('comparisonText', () => {
  it('keeps the text as it is by default', () => {
    expect(comparisonText('Konto  Firmowe', DEFAULT_DIFF_OPTIONS)).toBe('Konto  Firmowe');
  });

  it('removes all whitespace when whitespace is ignored', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };
    expect(comparisonText('let a  =\n  1;', options)).toBe('leta=1;');
  });

  it('lowers the case when letter case is ignored (T9)', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(comparisonText('Konto Firmowe', options)).toBe(comparisonText('Konto firmowe', options));
    expect(comparisonText('ZAŻÓŁĆ', options)).toBe('zażółć');
  });
});
