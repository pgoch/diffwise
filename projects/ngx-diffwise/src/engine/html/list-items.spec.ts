import { ListItemNumbers } from './list-items';
import { parseHtml } from './parse-html';

const LIST_ITEM_SELECTOR = 'li';

/** Numbers of all list items of a document, in reading order. */
function itemNumbers(html: string): number[] {
  const numbers = new ListItemNumbers();
  const items = parseHtml(html).querySelectorAll(LIST_ITEM_SELECTOR);

  return Array.from(items, (item) => numbers.numberOf(item));
}

describe('ListItemNumbers', () => {
  it('counts the items of a list from 1', () => {
    expect(itemNumbers('<ol><li>Jeden</li><li>Dwa</li><li>Trzy</li></ol>')).toEqual([1, 2, 3]);
  });

  it('starts a numbered list at its start, also below zero', () => {
    expect(itemNumbers('<ol start="5"><li>Import</li><li>Zaproszenie</li></ol>')).toEqual([5, 6]);
    expect(itemNumbers('<ol start="-2"><li>A</li><li>B</li><li>C</li></ol>')).toEqual([-2, -1, 0]);
  });

  it('goes on from the value of an item', () => {
    expect(itemNumbers('<ol><li>A</li><li value="7">B</li><li>C</li></ol>')).toEqual([1, 7, 8]);
  });

  it('counts down in a reversed list, from the number of its items or from its start', () => {
    expect(itemNumbers('<ol reversed><li>A</li><li>B</li><li>C</li></ol>')).toEqual([3, 2, 1]);
    expect(itemNumbers('<ol reversed start="5"><li>A</li><li>B</li></ol>')).toEqual([5, 4]);
    expect(itemNumbers('<ol reversed><li>A</li><li value="10">B</li><li>C</li></ol>')).toEqual([
      3, 10, 9,
    ]);
  });

  it('counts the items of a nested list separately', () => {
    const html = '<ol reversed><li>Konta<ol><li>osobiste</li></ol></li><li>B</li><li>C</li></ol>';

    expect(itemNumbers(html)).toEqual([3, 1, 2, 1]);
  });

  it('counts the items of bulleted lists too', () => {
    expect(itemNumbers('<ul><li>A</li><li value="5">B</li><li>C</li></ul>')).toEqual([1, 5, 6]);
    expect(itemNumbers('<menu><li>Kopiuj</li><li>Wklej</li></menu>')).toEqual([1, 2]);
  });

  it('counts an item inside another element of a list in that list', () => {
    expect(itemNumbers('<ol><div><li>A</li></div><li>B</li></ol>')).toEqual([1, 2]);
  });

  it('counts items outside any list among their parent’s items', () => {
    expect(itemNumbers('<div><li>A</li><li>B</li></div><section><li>C</li></section>')).toEqual([
      1, 2, 1,
    ]);
  });

  it('reads start and value as HTML reads integers', () => {
    expect(itemNumbers('<ol start=" 3x"><li>A</li></ol>')).toEqual([3]);
    expect(itemNumbers('<ol start=""><li>A</li><li value="2.9">B</li></ol>')).toEqual([1, 2]);
    expect(itemNumbers('<ol><li>A</li><li value="dwa">B</li></ol>')).toEqual([1, 2]);
  });
});
