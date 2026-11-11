import { CheckboxState, type ListMarker, ListStyle, ListType } from '../model';
import { ListMarkerReader, startCheckboxState } from './list-items';
import { parseHtml } from './parse-html';

const LIST_ITEM_SELECTOR = 'li';

/** Numbers of all list items of a document, in reading order. */
function itemNumbers(html: string): number[] {
  const numbers = new ListMarkerReader();
  const items = parseHtml(html).querySelectorAll(LIST_ITEM_SELECTOR);

  return Array.from(items, (item) => numbers.numberOf(item));
}

/** Markers of all list items of a document, in reading order. */
function itemMarkers(html: string): (ListMarker | null)[] {
  const markers = new ListMarkerReader();
  const items = parseHtml(html).querySelectorAll(LIST_ITEM_SELECTOR);

  return Array.from(items, (item) => markers.markerOf(item));
}

/** Styles of the markers of all list items; `null` for an item without a marker. */
function itemStyles(html: string): (string | null)[] {
  return itemMarkers(html).map((marker) => marker?.style ?? null);
}

/** States of the checkboxes that all list items start with; `null` for an item without one. */
function checkboxStates(html: string): (CheckboxState | null)[] {
  const items = parseHtml(html).querySelectorAll(LIST_ITEM_SELECTOR);
  return Array.from(items, (item) => startCheckboxState(item));
}

describe('ListMarkerReader', () => {
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

describe('ListMarkerReader markers', () => {
  it('gives numbered lists numbers, and bulleted lists dots, circles and squares by nesting', () => {
    const html =
      '<ul><li>A<ul><li>B<ol><li>C<ul><li>D</li></ul></li></ol></li></ul></li></ul>'
      + '<menu><li>E</li></menu>';

    expect(itemStyles(html)).toEqual([
      ListStyle.Disc,
      ListStyle.Circle,
      ListStyle.Decimal,
      ListStyle.Square,
      ListStyle.Disc,
    ]);
  });

  it('reads the type of a list and of an item, with the case of numbering types', () => {
    const html =
      '<ol type="a"><li>A</li><li type="I">B</li></ol><ol type="A"><li>C</li></ol>'
      + '<ul type="SQUARE"><li>D</li><li type="circle">E</li></ul><ul type="a"><li>F</li></ul>';

    expect(itemStyles(html)).toEqual([
      ListStyle.LowerAlpha,
      ListStyle.UpperRoman,
      ListStyle.UpperAlpha,
      ListStyle.Square,
      ListStyle.Circle,
      ListStyle.Disc,
    ]);
  });

  it('reads list-style-type, which wins over the type of the same element', () => {
    const html =
      '<ol type="a" style="list-style-type: upper-roman"><li>A</li>'
      + '<li style="list-style-type: lower-latin">B</li></ol>'
      + '<ol style="list-style-type: lower-roman"><li type="a">C</li></ol>'
      + '<ul style="list-style-type: Decimal"><li>D</li></ul>'
      + '<ol><div style="list-style-type: lower-greek"><li>E</li></div></ol>';

    expect(itemStyles(html)).toEqual([
      ListStyle.UpperRoman,
      ListStyle.LowerAlpha,
      ListStyle.LowerAlpha,
      ListStyle.Decimal,
      ListStyle.LowerGreek,
    ]);
  });

  it('gives no marker to an item whose style shows none', () => {
    const html = '<ul style="list-style-type: none"><li>A</li></ul><ul type="none"><li>B</li></ul>';

    expect(itemMarkers(html)).toEqual([null, null]);
  });

  it('tells bulleted lists from numbered ones by the style, not by the tag', () => {
    const html =
      '<ul><li>A</li></ul><ol type="i"><li>B</li></ol>'
      + '<ol style="list-style-type: armenian"><li>C</li></ol>'
      + '<ul style="list-style-type: decimal"><li>D</li></ul>'
      + '<ol style="list-style-type: square"><li>E</li></ol>';

    expect(itemMarkers(html).map((marker) => marker?.listType)).toEqual([
      ListType.Bulleted,
      ListType.Numbered,
      ListType.Numbered,
      ListType.Numbered,
      ListType.Bulleted,
    ]);
  });

  it('counts the lists around an item as its level', () => {
    const html = '<ol><li>A<ul><li>B<ol><li>C</li></ol></li></ul></li><li>D</li></ol>';

    expect(itemMarkers(html).map((marker) => marker?.level)).toEqual([1, 2, 3, 1]);
  });

  it('gives each marker the number of its item', () => {
    const html =
      '<ol start="5"><li>A</li><li value="9">B</li></ol><ol reversed><li>C</li><li>D</li></ol>';

    expect(itemMarkers(html).map((marker) => marker?.number)).toEqual([5, 9, 2, 1]);
  });
});

describe('startCheckboxState', () => {
  it('reads a checkbox at the start of an item, also in a label or a paragraph', () => {
    const html =
      '<ul><li><input type="checkbox" checked> Account</li>'
      + '<li><label><input type="checkbox"> Family</label></li>'
      + '<li><p> <input type="CHECKBOX" checked>Backups</p></li></ul>';

    expect(checkboxStates(html)).toEqual([
      CheckboxState.Checked,
      CheckboxState.Unchecked,
      CheckboxState.Checked,
    ]);
  });

  it('finds no checkbox after text or an image, in a nested item or of another type', () => {
    const html =
      '<ul><li>Account <input type="checkbox"></li>'
      + '<li><ul><li><input type="checkbox"> Family</li></ul></li>'
      + '<li><input type="radio"> Backups</li>'
      + '<li><img src="icon.png" alt=""><input type="checkbox"> Notes</li></ul>';

    expect(checkboxStates(html)).toEqual([null, null, CheckboxState.Unchecked, null, null]);
  });
});
