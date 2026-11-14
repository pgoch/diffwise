import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseDiffStats } from '../diff-stats';
import { ENGLISH_TEXTS } from '../i18n/en';
import { DiffToolbar } from './diff-toolbar';

const STATS_INPUT = 'stats';
const SHOWS_STATS_INPUT = 'showsStats';
const TEXTS_INPUT = 'texts';
const DIFF_STAT_SELECTOR = '.diffwise-html-diff__diff-stat';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const TOOLBAR_CLASS = 'diffwise-html-diff__toolbar';

const SOME_CHANGES: DiffwiseDiffStats = {
  addedLines: 3,
  removedLines: 1,
  changedLines: 10,
  hasChanges: true,
};

const NO_CHANGES: DiffwiseDiffStats = {
  addedLines: 0,
  removedLines: 0,
  changedLines: 0,
  hasChanges: false,
};

function render(stats: DiffwiseDiffStats, showsStats = true): ComponentFixture<DiffToolbar> {
  const fixture = TestBed.createComponent(DiffToolbar);

  fixture.componentRef.setInput(STATS_INPUT, stats);
  fixture.componentRef.setInput(SHOWS_STATS_INPUT, showsStats);
  fixture.componentRef.setInput(TEXTS_INPUT, ENGLISH_TEXTS);
  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<DiffToolbar>): HTMLElement {
  return fixture.nativeElement;
}

function statsOf(element: HTMLElement) {
  return Array.from(element.querySelectorAll(DIFF_STAT_SELECTOR), (stat) => [
    stat.textContent?.trim(),
    stat.getAttribute(ARIA_LABEL_ATTRIBUTE),
  ]);
}

describe('DiffToolbar', () => {
  it('shows each number with its sign and its name', () => {
    const element = elementOf(render(SOME_CHANGES));

    expect(element.classList).toContain(TOOLBAR_CLASS);
    expect(statsOf(element)).toEqual([
      ['+3', 'Added lines: 3'],
      ['−1', 'Removed lines: 1'],
      ['~10', 'Changed lines: 10'],
    ]);
  });

  it('shows no numbers when asked so', () => {
    expect(elementOf(render(SOME_CHANGES, false)).textContent?.trim()).toBe('');
  });

  it('shows only the text that nothing changed for the same versions', () => {
    expect(elementOf(render(NO_CHANGES)).textContent?.trim()).toBe('No changes');
  });
});
