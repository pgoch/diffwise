import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseColorMode, DiffwiseLayout } from './config/option-values';
import type { DiffwiseDiffStats } from './diff-stats';
import { DiffwiseHtmlDiff } from './diffwise-html-diff';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const IGNORE_CASE_INPUT = 'ignoreCase';
const COLOR_MODE_INPUT = 'colorMode';
const LAYOUT_INPUT = 'layout';

/** One line removed, one unchanged, one changed and one added. */
const OLD_TERMS_HTML = '<p>Old intro.</p><p>Terms of use.</p><p>Reply within 24 hours.</p>';
const NEW_TERMS_HTML = '<p>Terms of use.</p><p>Reply within 48 hours.</p><p>New outro.</p>';

/** The same text, with other letter case in the new version. */
const LOWER_CASE_HTML = '<p>Reply within 24 hours.</p>';
const UPPER_CASE_HTML = '<p>REPLY within 24 hours.</p>';

const TERMS_STATS: DiffwiseDiffStats = {
  addedLines: 1,
  removedLines: 1,
  changedLines: 1,
  hasChanges: true,
};

const NO_CHANGES_STATS: DiffwiseDiffStats = {
  addedLines: 0,
  removedLines: 0,
  changedLines: 0,
  hasChanges: false,
};

/** A rendered diff and the statistics it has emitted so far. */
interface RenderedStats {
  readonly fixture: ComponentFixture<DiffwiseHtmlDiff>;
  readonly emitted: DiffwiseDiffStats[];
}

/** Renders the diff of the versions with its options, and records each emitted statistics. */
function render(
  oldHtml = OLD_TERMS_HTML,
  newHtml = NEW_TERMS_HTML,
  options: DiffwiseConfigOptions = {},
): RenderedStats {
  const fixture = TestBed.createComponent(DiffwiseHtmlDiff);
  const emitted: DiffwiseDiffStats[] = [];

  fixture.componentInstance.diffStatsComputed.subscribe((stats) => emitted.push(stats));
  fixture.componentRef.setInput(OLD_HTML_INPUT, oldHtml);
  fixture.componentRef.setInput(NEW_HTML_INPUT, newHtml);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return { fixture, emitted };
}

/** Sets an input and lets the diff show the change. */
function change(fixture: ComponentFixture<DiffwiseHtmlDiff>, name: string, value: unknown): void {
  fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
}

describe('DiffwiseHtmlDiff statistics', () => {
  it('emits the numbers of changed lines after the first comparison', () => {
    const { emitted } = render();

    expect(emitted).toEqual([TERMS_STATS]);
  });

  it('emits no changes for the same versions', () => {
    const { emitted } = render(OLD_TERMS_HTML, OLD_TERMS_HTML);

    expect(emitted).toEqual([NO_CHANGES_STATS]);
  });

  it('emits again after a change of a version', () => {
    const { fixture, emitted } = render();

    change(fixture, NEW_HTML_INPUT, OLD_TERMS_HTML);

    expect(emitted).toEqual([TERMS_STATS, NO_CHANGES_STATS]);
  });

  it('emits again after a change of an option of the comparison', () => {
    const { fixture, emitted } = render(LOWER_CASE_HTML, UPPER_CASE_HTML);

    change(fixture, IGNORE_CASE_INPUT, true);

    expect(emitted).toEqual([
      { ...NO_CHANGES_STATS, changedLines: 1, hasChanges: true },
      NO_CHANGES_STATS,
    ]);
  });

  it('emits nothing after a change of the look, even one that compares the versions again', () => {
    const { fixture, emitted } = render();

    change(fixture, COLOR_MODE_INPUT, DiffwiseColorMode.Dark);
    change(fixture, LAYOUT_INPUT, DiffwiseLayout.Inline);

    expect(emitted).toEqual([TERMS_STATS]);
  });
});
