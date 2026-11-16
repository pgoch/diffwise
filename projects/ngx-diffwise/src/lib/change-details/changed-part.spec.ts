import { splitChangedParts } from './changed-part';

describe('splitChangedParts', () => {
  it('highlights whole words, so a changed year is one part', () => {
    const [oldParts, newParts] = splitChangedParts(
      'https://example.com/terms-2025',
      'https://example.com/terms-2026',
    );

    expect(oldParts).toEqual({ start: 'https://example.com/terms-', changed: '2025', end: '' });
    expect(newParts).toEqual({ start: 'https://example.com/terms-', changed: '2026', end: '' });
  });

  it('keeps the shared end, such as the file of an address in another folder', () => {
    const [oldParts, newParts] = splitChangedParts(
      'https://cdn.example.com/media/2025/logo.svg',
      'https://cdn.example.com/media/2026/logo.svg',
    );

    expect(oldParts).toEqual({
      start: 'https://cdn.example.com/media/',
      changed: '2025',
      end: '/logo.svg',
    });
    expect(newParts.changed).toBe('2026');
  });

  it('leaves the changed part of the shorter value empty when the other only adds text', () => {
    const [oldParts, newParts] = splitChangedParts('Notebook logo', 'Notebook logo in color');

    expect(oldParts).toEqual({ start: 'Notebook logo', changed: '', end: '' });
    expect(newParts).toEqual({ start: 'Notebook logo', changed: ' in color', end: '' });
  });

  it('never counts a token both in the shared start and in the shared end', () => {
    const [oldParts, newParts] = splitChangedParts('a-a', 'a-a-a');

    expect(oldParts).toEqual({ start: 'a-a', changed: '', end: '' });
    expect(newParts).toEqual({ start: 'a-a', changed: '-a', end: '' });
  });

  it('marks the whole value when nothing is shared, and nothing when the values are equal', () => {
    expect(splitChangedParts('Sales chart', 'Diagram')).toEqual([
      { start: '', changed: 'Sales chart', end: '' },
      { start: '', changed: 'Diagram', end: '' },
    ]);
    expect(splitChangedParts('logo.svg', 'logo.svg')).toEqual([
      { start: 'logo.svg', changed: '', end: '' },
      { start: 'logo.svg', changed: '', end: '' },
    ]);
  });

  it('treats Polish letters as parts of words', () => {
    const [oldParts] = splitChangedParts('zażółć-1', 'zażółć-2');

    expect(oldParts).toEqual({ start: 'zażółć-', changed: '1', end: '' });
  });
});
