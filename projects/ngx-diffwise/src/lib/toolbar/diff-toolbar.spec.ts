import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseDiffStats } from '../diff-stats';
import { ENGLISH_TEXTS } from '../i18n/en';
import { DiffToolbar, type ToolbarNavigation } from './diff-toolbar';

const STATS_INPUT = 'stats';
const SHOWS_STATS_INPUT = 'showsStats';
const NAVIGATION_INPUT = 'navigation';
const TEXTS_INPUT = 'texts';
const DIFF_STAT_SELECTOR = '.diffwise-html-diff__diff-stat';
const NAVIGATION_SELECTOR = '.diffwise-html-diff__navigation';
const PREVIOUS_BUTTON_SELECTOR = '.diffwise-html-diff__navigation-button--previous';
const NEXT_BUTTON_SELECTOR = '.diffwise-html-diff__navigation-button--next';
const COUNTER_SELECTOR = '.diffwise-html-diff__change-counter';
const ANNOUNCEMENT_SELECTOR = '[data-diffwise-announcement]';
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

const BEFORE_FIRST_STEP: ToolbarNavigation = { current: null, total: 3 };
const AT_SECOND_BLOCK: ToolbarNavigation = { current: 2, total: 3 };

function render(
  stats: DiffwiseDiffStats,
  showsStats = true,
  navigation: ToolbarNavigation | null = null,
): ComponentFixture<DiffToolbar> {
  const fixture = TestBed.createComponent(DiffToolbar);

  fixture.componentRef.setInput(STATS_INPUT, stats);
  fixture.componentRef.setInput(SHOWS_STATS_INPUT, showsStats);
  fixture.componentRef.setInput(NAVIGATION_INPUT, navigation);
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

/** The counter as `[its text, its name, what screen readers hear]`. */
function counterOf(element: HTMLElement) {
  const counter = element.querySelector(COUNTER_SELECTOR);

  return [
    counter?.textContent?.trim(),
    counter?.getAttribute(ARIA_LABEL_ATTRIBUTE),
    element.querySelector(ANNOUNCEMENT_SELECTOR)?.textContent?.trim(),
  ];
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
    expect(elementOf(render(NO_CHANGES, true, BEFORE_FIRST_STEP)).textContent?.trim()).toBe(
      'No changes',
    );
  });

  it('shows the arrows before the numbers, with names', () => {
    const element = elementOf(render(SOME_CHANGES, true, BEFORE_FIRST_STEP));
    const names = [PREVIOUS_BUTTON_SELECTOR, NEXT_BUTTON_SELECTOR].map((selector) =>
      element.querySelector(selector)?.getAttribute(ARIA_LABEL_ATTRIBUTE),
    );

    expect(element.firstElementChild?.matches(NAVIGATION_SELECTOR)).toBe(true);
    expect(names).toEqual(['Previous change', 'Next change']);
  });

  it('counts the blocks before the first step, and tells screen readers nothing yet', () => {
    const element = elementOf(render(SOME_CHANGES, true, BEFORE_FIRST_STEP));

    expect(counterOf(element)).toEqual(['– / 3', 'Changes: 3', '']);
  });

  it('shows the position of the active block, and tells screen readers where the step led', () => {
    const element = elementOf(render(SOME_CHANGES, true, AT_SECOND_BLOCK));

    expect(counterOf(element)).toEqual(['2 / 3', 'Change 2 of 3', 'Change 2 of 3']);
  });

  it('asks for the previous or the next block on a click of its arrow', () => {
    const fixture = render(SOME_CHANGES, true, BEFORE_FIRST_STEP);
    const asked: string[] = [];

    fixture.componentInstance.previousChange.subscribe(() => asked.push('previous'));
    fixture.componentInstance.nextChange.subscribe(() => asked.push('next'));
    elementOf(fixture).querySelector<HTMLElement>(NEXT_BUTTON_SELECTOR)?.click();
    elementOf(fixture).querySelector<HTMLElement>(PREVIOUS_BUTTON_SELECTOR)?.click();

    expect(asked).toEqual(['next', 'previous']);
  });

  it('shows no arrows without navigation', () => {
    expect(elementOf(render(SOME_CHANGES)).querySelector(NAVIGATION_SELECTOR)).toBeNull();
  });
});
