import { parseHtml } from '../html/parse-html';
import { splitLines } from '../html/split-lines';
import { DEFAULT_DIFF_OPTIONS, type DiffOptions, type Line } from '../model';
import {
  checkboxChanged,
  itemNumberChanged,
  listItemsDiffer,
  listMarkerChanged,
} from './diff-list-markers';

const ID_PREFIX = 'diff-';
const IGNORE_FORMATTING: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ignoreFormatting: true };

/** The line of a document with the text. */
function lineWithText(html: string, text: string): Line {
  const line = splitLines(parseHtml(html), ID_PREFIX).find((each) => each.text === text);

  if (line === undefined) {
    throw new Error(`No line "${text}" in ${html}`);
  }

  return line;
}

/** Whether the markers of the lines with the text differ between the versions. */
function markerChanged(
  oldHtml: string,
  newHtml: string,
  text: string,
  options = DEFAULT_DIFF_OPTIONS,
): boolean {
  return listMarkerChanged(lineWithText(oldHtml, text), lineWithText(newHtml, text), options);
}

describe('listMarkerChanged', () => {
  it('finds a bulleted list turned into a numbered one', () => {
    const oldHtml = '<ul><li>Notes</li><li>Photos</li></ul>';
    const newHtml = '<ol><li>Notes</li><li>Photos</li></ol>';

    expect(markerChanged(oldHtml, newHtml, 'Photos')).toBe(true);
  });

  it('finds other numbering or other bullets', () => {
    const numbers = '<ol><li>Account</li></ol>';
    const letters = '<ol type="a"><li>Account</li></ol>';
    const dots = '<ul><li>Account</li></ul>';
    const squares = '<ul style="list-style-type: square"><li>Account</li></ul>';

    expect(markerChanged(numbers, letters, 'Account')).toBe(true);
    expect(markerChanged(dots, squares, 'Account')).toBe(true);
  });

  it('finds another number, from another start or shifted by an added item', () => {
    const oldHtml = '<ol><li>Account</li><li>Notes</li></ol><ol start="3"><li>Import</li></ol>';
    const newHtml =
      '<ol><li>Account</li><li>Backups</li><li>Notes</li></ol><ol start="4"><li>Import</li></ol>';

    expect(markerChanged(oldHtml, newHtml, 'Account')).toBe(false);
    expect(markerChanged(oldHtml, newHtml, 'Notes')).toBe(true);
    expect(markerChanged(oldHtml, newHtml, 'Import')).toBe(true);
  });

  it('finds a paragraph turned into a list item, and the other way round', () => {
    const paragraph = '<p>Backups</p>';
    const item = '<ul><li>Backups</li></ul>';

    expect(markerChanged(paragraph, item, 'Backups')).toBe(true);
    expect(markerChanged(item, paragraph, 'Backups')).toBe(true);
  });

  it('finds an item moved one level deeper, also into a list with its own start', () => {
    const oldBullets = '<ul><li>Accounts</li><li>Personal</li></ul>';
    const newBullets = '<ul><li>Accounts<ul><li>Personal</li></ul></li></ul>';
    const oldNumbers = '<ol><li>Accounts</li><li>Personal</li></ol>';
    const newNumbers = '<ol><li>Accounts<ol start="3"><li>Personal</li></ol></li></ol>';

    expect(markerChanged(oldBullets, newBullets, 'Personal')).toBe(true);
    expect(markerChanged(oldNumbers, newNumbers, 'Personal')).toBe(true);
  });

  it('finds only other numbers with ignoreFormatting', () => {
    const bullets = '<ul><li>Account</li><li>Notes</li></ul>';
    const numbers = '<ol><li>Account</li><li>Notes</li></ol>';
    const letters = '<ol type="a"><li>Account</li><li>Notes</li></ol>';
    const shifted = '<ol><li>Backups</li><li>Account</li><li>Notes</li></ol>';

    expect(markerChanged(bullets, numbers, 'Notes', IGNORE_FORMATTING)).toBe(false);
    expect(markerChanged(numbers, letters, 'Notes', IGNORE_FORMATTING)).toBe(false);
    expect(markerChanged('<p>Notes</p>', numbers, 'Notes', IGNORE_FORMATTING)).toBe(false);
    expect(markerChanged(numbers, shifted, 'Notes', IGNORE_FORMATTING)).toBe(true);
  });

  it('finds no change between lines without markers', () => {
    const html = '<p>Notes</p><dl><dt>Notes</dt></dl>';

    expect(markerChanged(html, html, 'Notes')).toBe(false);
  });
});

describe('checkboxChanged', () => {
  const unchecked = '<ul><li><label><input type="checkbox"> Invite your family</label></li></ul>';
  const checked =
    '<ul><li><label><input type="checkbox" checked> Invite your family</label></li></ul>';
  const changed = (oldHtml: string, newHtml: string) =>
    checkboxChanged(
      lineWithText(oldHtml, 'Invite your family'),
      lineWithText(newHtml, 'Invite your family'),
    );

  it('finds a checked or cleared checkbox', () => {
    expect(changed(unchecked, checked)).toBe(true);
    expect(changed(checked, unchecked)).toBe(true);
    expect(changed(checked, checked)).toBe(false);
  });

  it('finds no change of a checkbox only one line has', () => {
    const withoutCheckbox = '<ul><li>Invite your family</li></ul>';

    expect(changed(withoutCheckbox, checked)).toBe(false);
    expect(changed(unchecked, withoutCheckbox)).toBe(false);
  });
});

/** Whether the numbers of the items with the text differ between the versions. */
function numberChanged(oldHtml: string, newHtml: string, text: string): boolean {
  return itemNumberChanged(lineWithText(oldHtml, text), lineWithText(newHtml, text));
}

describe('itemNumberChanged', () => {
  it('finds another number of each item of a list with another start', () => {
    const oldHtml = '<ol start="5"><li>Import</li><li>Invitation</li></ol>';
    const newHtml = '<ol start="6"><li>Import</li><li>Invitation</li></ol>';

    expect(numberChanged(oldHtml, newHtml, 'Import')).toBe(true);
    expect(numberChanged(oldHtml, newHtml, 'Invitation')).toBe(true);
  });

  it('finds another number from the value of an item', () => {
    const oldHtml = '<ol><li>Introduction</li><li value="10">Prices</li></ol>';
    const newHtml = '<ol><li>Introduction</li><li value="12">Prices</li></ol>';

    expect(numberChanged(oldHtml, newHtml, 'Prices')).toBe(true);
    expect(numberChanged(oldHtml, newHtml, 'Introduction')).toBe(false);
  });

  it('finds numbers shifted by items added or removed in the list, also when written in value', () => {
    const oldHtml = '<ol><li>Account</li><li>Sign-in</li><li>Notes</li></ol>';
    const addedItem =
      '<ol><li>Account</li><li>Verification</li><li>Sign-in</li><li>Notes</li></ol>';
    const removedItem = '<ol><li>Sign-in</li><li>Notes</li></ol>';
    const rewrittenValues =
      '<ol><li value="1">Account</li><li value="2">Verification</li><li value="3">Sign-in</li></ol>';

    expect(numberChanged(oldHtml, addedItem, 'Account')).toBe(false);
    expect(numberChanged(oldHtml, addedItem, 'Notes')).toBe(true);
    expect(numberChanged(oldHtml, removedItem, 'Sign-in')).toBe(true);
    expect(numberChanged(oldHtml, rewrittenValues, 'Sign-in')).toBe(true);
  });

  it('finds shifted numbers both before and after a paragraph that splits a list', () => {
    const oldHtml =
      '<ol><li>Account</li><li>Sign-in</li></ol><p>Then:</p><ol start="3"><li>Import</li></ol>';
    const newHtml =
      '<ol><li>Account</li><li>Backups</li><li>Sign-in</li></ol>'
      + '<p>Then:</p><ol start="4"><li>Import</li></ol>';

    expect(numberChanged(oldHtml, newHtml, 'Sign-in')).toBe(true);
    expect(numberChanged(oldHtml, newHtml, 'Import')).toBe(true);
  });

  it('finds numbers of a list counting down shifted by items added after them', () => {
    const oldHtml = '<ol reversed><li>Account</li><li>Notes</li></ol>';
    const newHtml = '<ol reversed><li>Account</li><li>Notes</li><li>Backups</li></ol>';

    expect(numberChanged(oldHtml, newHtml, 'Account')).toBe(true);
    expect(numberChanged(oldHtml, newHtml, 'Notes')).toBe(true);
  });

  it('compares numbers only when both items show them', () => {
    const bullets = '<ul><li>Account</li><li>Notes</li></ul>';
    const addedBullet = '<ul><li>Account</li><li>Backups</li><li>Notes</li></ul>';
    const numbersFromThree = '<ol start="3"><li>Account</li><li>Notes</li></ol>';

    expect(numberChanged(bullets, addedBullet, 'Notes')).toBe(false);
    expect(numberChanged(bullets, numbersFromThree, 'Notes')).toBe(false);
    expect(numberChanged('<p>Notes</p>', numbersFromThree, 'Notes')).toBe(false);
  });
});

describe('listItemsDiffer', () => {
  it('tells items apart by their markers or checkboxes; numbers and checkboxes count always', () => {
    const numbers = '<ol><li>Account</li><li>Notes</li></ol>';
    const shifted = '<ol><li>Backups</li><li>Account</li><li>Notes</li></ol>';
    const letters = '<ol type="a"><li>Account</li><li>Notes</li></ol>';
    const unchecked = '<ul><li><input type="checkbox"> Notes</li></ul>';
    const checked = '<ul><li><input type="checkbox" checked> Notes</li></ul>';
    const differ = (oldHtml: string, newHtml: string, options = DEFAULT_DIFF_OPTIONS) =>
      listItemsDiffer(lineWithText(oldHtml, 'Notes'), lineWithText(newHtml, 'Notes'), options);

    expect(differ(numbers, shifted)).toBe(true);
    expect(differ(numbers, shifted, IGNORE_FORMATTING)).toBe(true);
    expect(differ(numbers, letters)).toBe(true);
    expect(differ(numbers, letters, IGNORE_FORMATTING)).toBe(false);
    expect(differ(unchecked, checked, IGNORE_FORMATTING)).toBe(true);
    expect(differ(numbers, numbers)).toBe(false);
  });
});
