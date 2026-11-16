import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';

import type { DiffwiseDiffStats } from '../diff-stats';
import { type UiTexts, withCount, withPosition } from '../i18n/texts';

const ADDED_SIGN = '+';
const REMOVED_SIGN = '−';
const CHANGED_SIGN = '~';

/** Stands in the counter for the position before the first step: "– / 3". */
const NO_POSITION = '–';
const COUNTER_SEPARATOR = ' / ';
const NO_TEXT = '';

/** Ends the modifier class of each number of the statistics. */
const DiffStatKind = {
  Added: 'added',
  Removed: 'removed',
  Changed: 'changed',
} as const;

type DiffStatKind = (typeof DiffStatKind)[keyof typeof DiffStatKind];

/** A number of the statistics as the template shows it. */
interface ShownDiffStat {
  readonly kind: DiffStatKind;
  /** The number with its sign, such as `+3`. */
  readonly text: string;
  /** Names the number for screen readers and titles its tooltip, such as "Added lines: 3". */
  readonly label: string;
}

/** Where the navigation between the blocks of changes stands. */
export interface ToolbarNavigation {
  /** Position of the active block, counted from 1; `null` before the first step. */
  readonly current: number | null;
  /** Number of the blocks of changes. */
  readonly total: number;
}

/** The navigation of a diff without blocks, which the toolbar does not show. */
const NO_NAVIGATION: ToolbarNavigation = { current: null, total: 0 };

/**
 * The toolbar above the diff, which stays at the top while the page scrolls: arrows between the
 * blocks of changes with their counter, the numbers of changed lines, and at the end what the diff
 * puts in it, the button of the view settings; when the versions are the same, only a text that
 * says so.
 */
@Component({
  selector: 'diffwise-diff-toolbar',
  templateUrl: './diff-toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'diffwise-diff__toolbar' },
})
export class DiffToolbar {
  /** Numbers of the changed lines of the comparison. */
  readonly stats = input.required<DiffwiseDiffStats>();

  /** Shows the numbers of changed lines. */
  readonly showsStats = input.required<boolean>();

  /** Where the navigation stands; `null` hides the arrows and the counter. */
  readonly navigation = input.required<ToolbarNavigation | null>();

  /** Texts of the interface in its language. */
  readonly texts = input.required<UiTexts>();

  /** The user asks for the previous block of changes. */
  readonly previousChange = output<void>();

  /** The user asks for the next block of changes. */
  readonly nextChange = output<void>();

  /** The numbers of added, removed and changed lines, in this order. */
  protected readonly shownStats = computed<readonly ShownDiffStat[]>(() => {
    const { addedLines, removedLines, changedLines } = this.stats();
    const { addedLinesLabel, removedLinesLabel, changedLinesLabel } = this.texts();

    return [
      shownStat(DiffStatKind.Added, ADDED_SIGN, addedLines, addedLinesLabel),
      shownStat(DiffStatKind.Removed, REMOVED_SIGN, removedLines, removedLinesLabel),
      shownStat(DiffStatKind.Changed, CHANGED_SIGN, changedLines, changedLinesLabel),
    ];
  });

  /** The counter, such as "2 / 3", or "– / 3" before the first step. */
  protected readonly counterText = computed(() => {
    const { current, total } = this.navigation() ?? NO_NAVIGATION;
    return (current === null ? NO_POSITION : String(current)) + COUNTER_SEPARATOR + total;
  });

  /** Names the counter and titles its tooltip: "Change 2 of 3", or "Changes: 3" before. */
  protected readonly counterLabel = computed(() => {
    const { current, total } = this.navigation() ?? NO_NAVIGATION;
    const { currentChangeLabel, changeCountLabel } = this.texts();

    return current === null
      ? withCount(changeCountLabel, total)
      : withPosition(currentChangeLabel, current, total);
  });

  /** What screen readers hear after each step, where the step led; nothing before the first. */
  protected readonly announcement = computed(() => {
    const current = this.navigation()?.current ?? null;
    return current === null ? NO_TEXT : this.counterLabel();
  });
}

function shownStat(kind: DiffStatKind, sign: string, count: number, label: string): ShownDiffStat {
  return { kind, text: sign + count, label: withCount(label, count) };
}
