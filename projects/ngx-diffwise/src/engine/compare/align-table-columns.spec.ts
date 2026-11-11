import { alignTableColumns } from './align-table-columns';
import { diffLines } from './diff-lines';
import { parseHtml } from '../html/parse-html';
import { splitLines } from '../html/split-lines';
import { DEFAULT_DIFF_OPTIONS, type LineChange, LineChangeKind } from '../model';

const OLD_ID_PREFIX = 'diff-old-';
const NEW_ID_PREFIX = 'diff-new-';
const NO_PAIR_ERROR = 'The versions have no paired lines.';

/** Rows of a table about plans, with a Family column between Personal and Business. */
const FEATURES_WITH_FAMILY = `
  <table>
    <tr><th>Feature</th><th>Free</th><th>Personal</th><th>Family</th><th>Business</th></tr>
    <tr><td>Offline access</td><td>–</td><td>✓</td><td>✓</td><td>✓</td></tr>
    <tr><td>Version history</td><td>7 days</td><td>1 year</td><td>1 year</td><td>Unlimited</td></tr>
    <tr><td>Shared notebooks</td><td>3</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
  </table>`;

/** The same table without the Family column. */
const FEATURES = `
  <table>
    <tr><th>Feature</th><th>Free</th><th>Personal</th><th>Business</th></tr>
    <tr><td>Offline access</td><td>–</td><td>✓</td><td>✓</td></tr>
    <tr><td>Version history</td><td>7 days</td><td>1 year</td><td>Unlimited</td></tr>
    <tr><td>Shared notebooks</td><td>3</td><td>Unlimited</td><td>Unlimited</td></tr>
  </table>`;

function changesOf(oldHtml: string, newHtml: string): readonly LineChange[] {
  const oldLines = splitLines(parseHtml(oldHtml), OLD_ID_PREFIX);
  const newLines = splitLines(parseHtml(newHtml), NEW_ID_PREFIX);

  return diffLines(oldLines, newLines, DEFAULT_DIFF_OPTIONS).changes;
}

/** Matched columns of the tables of the first paired lines, as `[old column, new column]`. */
function matchedColumns(oldHtml: string, newHtml: string) {
  const changes = changesOf(oldHtml, newHtml);
  const pair = changes.find((change) => change.kind === LineChangeKind.Changed);

  if (pair?.kind !== LineChangeKind.Changed) {
    throw new Error(NO_PAIR_ERROR);
  }

  const match = alignTableColumns(changes, DEFAULT_DIFF_OPTIONS).of(pair.oldLine, pair.newLine);

  return match === null ? null : [...match.oldToNew];
}

describe('alignTableColumns', () => {
  it('matches the columns around an added column in every row, also where values repeat', () => {
    expect(matchedColumns(FEATURES, FEATURES_WITH_FAMILY)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 4],
    ]);
  });

  it('leaves a removed column without a match', () => {
    expect(matchedColumns(FEATURES_WITH_FAMILY, FEATURES)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [4, 3],
    ]);
  });

  it('pairs columns that no equal cells tell apart by position between matched columns', () => {
    const oldHtml = `
      <table>
        <tr><td>Offline access</td><td>yes</td><td>Free</td></tr>
        <tr><td>Version history</td><td>7 days</td><td>Free</td></tr>
      </table>`;
    const newHtml = `
      <table>
        <tr><td>Offline access</td><td>no</td><td>Free</td></tr>
        <tr><td>Version history</td><td>30 days</td><td>Free</td></tr>
      </table>`;

    expect(matchedColumns(oldHtml, newHtml)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it('leaves columns without a match where the tables have a different number of them', () => {
    const oldHtml = '<table><tr><td>Offline access</td><td>yes</td><td>Free</td></tr></table>';
    const newHtml =
      '<table><tr><td>Offline access</td><td>no</td><td>soon</td><td>Free</td></tr></table>';

    expect(matchedColumns(oldHtml, newHtml)).toEqual([
      [0, 0],
      [2, 3],
    ]);
  });

  it('tells columns apart only by single cells with text', () => {
    const oldHtml = `
      <table>
        <tr><td>Plan</td><td></td><td colspan="2">Storage and devices</td></tr>
        <tr><td>Personal</td><td></td><td>20 GB</td><td>5</td></tr>
      </table>`;
    const newHtml = `
      <table>
        <tr><td>Plan</td><td colspan="2">Storage and devices</td><td></td></tr>
        <tr><td>Personal</td><td>20 GB</td><td>5</td><td></td></tr>
      </table>`;

    expect(matchedColumns(oldHtml, newHtml)).toEqual([
      [0, 0],
      [2, 1],
      [3, 2],
    ]);
  });

  it('gives no match for a pair of lines that are not table rows', () => {
    expect(
      matchedColumns('<p>Offline access is free.</p>', '<p>Offline access is paid.</p>'),
    ).toBeNull();
  });
});
