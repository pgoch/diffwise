import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';

import type { DiffwiseDiffStats } from '../diff-stats';
import { type UiTexts, withCount } from '../i18n/texts';

const ADDED_SIGN = '+';
const REMOVED_SIGN = '−';
const CHANGED_SIGN = '~';

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

/**
 * The toolbar above the diff, which stays at the top while the page scrolls. For now it shows the
 * numbers of changed lines; when the versions are the same, only a text that says so.
 */
@Component({
  selector: 'diffwise-diff-toolbar',
  templateUrl: './diff-toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'diffwise-html-diff__toolbar' },
})
export class DiffToolbar {
  /** Numbers of the changed lines of the comparison. */
  readonly stats = input.required<DiffwiseDiffStats>();

  /** Shows the numbers of changed lines. */
  readonly showsStats = input.required<boolean>();

  /** Texts of the interface in its language. */
  readonly texts = input.required<UiTexts>();

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
}

function shownStat(kind: DiffStatKind, sign: string, count: number, label: string): ShownDiffStat {
  return { kind, text: sign + count, label: withCount(label, count) };
}
