import { comparisonText } from './comparison-text';
import { DEFAULT_DIFF_OPTIONS } from '../model';

describe('comparisonText', () => {
  it('keeps the text as it is by default', () => {
    expect(comparisonText('Business  Account', DEFAULT_DIFF_OPTIONS)).toBe('Business  Account');
  });

  it('removes all whitespace when whitespace is ignored', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreWhitespace: true };
    expect(comparisonText('let a  =\n  1;', options)).toBe('leta=1;');
  });

  it('lowers the case, also of Polish letters, when letter case is ignored', () => {
    const options = { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true };

    expect(comparisonText('Business Account', options)).toBe(
      comparisonText('Business account', options),
    );
    expect(comparisonText('ZAŻÓŁĆ', options)).toBe('zażółć');
  });
});
