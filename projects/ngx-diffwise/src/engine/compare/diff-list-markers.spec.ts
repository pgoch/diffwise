import { parseHtml } from '../html/parse-html';
import { splitLines } from '../html/split-lines';
import {
  ChangeDetailKind,
  CheckboxState,
  DEFAULT_DIFF_OPTIONS,
  type DiffOptions,
  type Line,
  ListMarkerProperty,
  ListStyle,
} from '../model';
import { diffListMarkers, itemNumberChanged, listItemsDiffer } from './diff-list-markers';

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

/** Changes of the list items of the lines with the text in both versions. */
function itemChanges(
  oldHtml: string,
  newHtml: string,
  text: string,
  options = DEFAULT_DIFF_OPTIONS,
) {
  return diffListMarkers(lineWithText(oldHtml, text), lineWithText(newHtml, text), options);
}

/** Changed properties of the marker of the lines with the text; empty without a marker change. */
function changedProperties(
  oldHtml: string,
  newHtml: string,
  text: string,
  options = DEFAULT_DIFF_OPTIONS,
) {
  return itemChanges(oldHtml, newHtml, text, options).flatMap((detail) =>
    detail.kind === ChangeDetailKind.ListMarker ? detail.changedProperties : [],
  );
}

describe('diffListMarkers', () => {
  it('describes a bulleted list turned into a numbered one by its list type', () => {
    const oldHtml = '<ul><li>Notes</li><li>Photos</li></ul>';
    const newHtml = '<ol><li>Notes</li><li>Photos</li></ol>';
    const [detail] = itemChanges(oldHtml, newHtml, 'Photos');

    expect(detail).toEqual({
      kind: ChangeDetailKind.ListMarker,
      oldMarker: expect.objectContaining({ style: ListStyle.Disc, number: 2 }),
      newMarker: expect.objectContaining({ style: ListStyle.Decimal, number: 2 }),
      changedProperties: [ListMarkerProperty.ListType],
    });
  });

  it('describes other numbering or other bullets by their style', () => {
    const numbers = '<ol><li>Account</li></ol>';
    const letters = '<ol type="a"><li>Account</li></ol>';
    const dots = '<ul><li>Account</li></ul>';
    const squares = '<ul style="list-style-type: square"><li>Account</li></ul>';

    expect(changedProperties(numbers, letters, 'Account')).toEqual([ListMarkerProperty.Style]);
    expect(changedProperties(dots, squares, 'Account')).toEqual([ListMarkerProperty.Style]);
  });

  it('describes no other number, from another start or shifted by an added item', () => {
    const oldHtml = '<ol><li>Account</li><li>Notes</li></ol><ol start="3"><li>Import</li></ol>';
    const newHtml =
      '<ol><li>Account</li><li>Backups</li><li>Notes</li></ol><ol start="4"><li>Import</li></ol>';

    expect(itemChanges(oldHtml, newHtml, 'Notes')).toEqual([]);
    expect(itemChanges(oldHtml, newHtml, 'Import')).toEqual([]);
  });

  it('describes a paragraph turned into a list item by the list type, with no old marker', () => {
    const paragraph = '<p>Backups</p>';
    const item = '<ul><li>Backups</li></ul>';
    const [toItem] = itemChanges(paragraph, item, 'Backups');
    const [toParagraph] = itemChanges(item, paragraph, 'Backups');

    expect(toItem).toEqual({
      kind: ChangeDetailKind.ListMarker,
      oldMarker: null,
      newMarker: expect.objectContaining({ style: ListStyle.Disc }),
      changedProperties: [ListMarkerProperty.ListType],
    });
    expect(toParagraph).toEqual(expect.objectContaining({ newMarker: null }));
  });

  it('describes an item moved one level deeper only by its level', () => {
    const oldBullets = '<ul><li>Accounts</li><li>Personal</li></ul>';
    const newBullets = '<ul><li>Accounts<ul><li>Personal</li></ul></li></ul>';
    const oldNumbers = '<ol><li>Accounts</li><li>Personal</li></ol>';
    const newNumbers = '<ol><li>Accounts<ol><li>Personal</li></ol></li></ol>';

    expect(changedProperties(oldBullets, newBullets, 'Personal')).toEqual([
      ListMarkerProperty.Level,
    ]);
    expect(changedProperties(oldNumbers, newNumbers, 'Personal')).toEqual([
      ListMarkerProperty.Level,
    ]);
  });

  it('describes an item moved to a nested list with its own start only by its level', () => {
    const oldHtml = '<ol><li>Accounts</li><li>Personal</li></ol>';
    const newHtml = '<ol><li>Accounts<ol start="3"><li>Personal</li></ol></li></ol>';

    expect(changedProperties(oldHtml, newHtml, 'Personal')).toEqual([ListMarkerProperty.Level]);
  });

  it('describes no marker changes with ignoreFormatting', () => {
    const bullets = '<ul><li>Account</li><li>Notes</li></ul>';
    const numbers = '<ol><li>Account</li><li>Notes</li></ol>';
    const letters = '<ol type="a"><li>Account</li><li>Notes</li></ol>';
    const nested = '<ol><li>Account<ol><li>Notes</li></ol></li></ol>';

    expect(changedProperties(bullets, numbers, 'Notes', IGNORE_FORMATTING)).toEqual([]);
    expect(changedProperties(numbers, letters, 'Notes', IGNORE_FORMATTING)).toEqual([]);
    expect(changedProperties('<p>Notes</p>', numbers, 'Notes', IGNORE_FORMATTING)).toEqual([]);
    expect(changedProperties(numbers, nested, 'Notes', IGNORE_FORMATTING)).toEqual([]);
  });

  it('describes a checked or cleared checkbox', () => {
    const unchecked = '<ul><li><label><input type="checkbox"> Invite your family</label></li></ul>';
    const checked =
      '<ul><li><label><input type="checkbox" checked> Invite your family</label></li></ul>';

    expect(itemChanges(unchecked, checked, 'Invite your family', IGNORE_FORMATTING)).toEqual([
      {
        kind: ChangeDetailKind.Checkbox,
        oldState: CheckboxState.Unchecked,
        newState: CheckboxState.Checked,
      },
    ]);
    expect(itemChanges(checked, unchecked, 'Invite your family')).toEqual([
      expect.objectContaining({ newState: CheckboxState.Unchecked }),
    ]);
  });

  it('describes the marker before the checkbox, and no checkbox only one line has', () => {
    const oldHtml = '<ul><li><input type="checkbox"> Backups</li><li>Notes</li></ul>';
    const newHtml =
      '<ol><li><input type="checkbox" checked> Backups</li><li><input type="checkbox"> Notes</li></ol>';
    const kindsOf = (text: string) =>
      itemChanges(oldHtml, newHtml, text).map((detail) => detail.kind);

    expect(kindsOf('Backups')).toEqual([ChangeDetailKind.ListMarker, ChangeDetailKind.Checkbox]);
    expect(kindsOf('Notes')).toEqual([ChangeDetailKind.ListMarker]);
  });

  it('finds no changes between lines without markers', () => {
    const oldHtml = '<p>Notes</p><dl><dt>Notes</dt></dl>';
    const newHtml = '<p>Notes</p><dl><dt>Notes</dt></dl>';

    expect(itemChanges(oldHtml, newHtml, 'Notes')).toEqual([]);
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
  it('tells items apart by another number, also with ignoreFormatting, or by a described change', () => {
    const numbers = '<ol><li>Account</li><li>Notes</li></ol>';
    const shifted = '<ol><li>Backups</li><li>Account</li><li>Notes</li></ol>';
    const letters = '<ol type="a"><li>Account</li><li>Notes</li></ol>';
    const differ = (oldHtml: string, newHtml: string, options = DEFAULT_DIFF_OPTIONS) =>
      listItemsDiffer(lineWithText(oldHtml, 'Notes'), lineWithText(newHtml, 'Notes'), options);

    expect(differ(numbers, shifted)).toBe(true);
    expect(differ(numbers, shifted, IGNORE_FORMATTING)).toBe(true);
    expect(differ(numbers, letters)).toBe(true);
    expect(differ(numbers, letters, IGNORE_FORMATTING)).toBe(false);
    expect(differ(numbers, numbers)).toBe(false);
  });
});
