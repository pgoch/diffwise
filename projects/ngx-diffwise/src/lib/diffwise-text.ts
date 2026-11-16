import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { type Comparison, type ComparisonSettings, diffText } from '../engine';
import { ChangeDetailsButton } from './change-details/change-details-button';
import { ChangeTooltip } from './change-details/change-tooltip';
import { CollapsedLinesBar } from './collapsed-lines/collapsed-lines-bar';
import { type DiffVersions, DiffView } from './diff-view';
import { DiffToolbar } from './toolbar/diff-toolbar';
import { ViewSettings } from './toolbar/view-settings';

/**
 * Shows two versions of a plain text with the changes marked, line by line: side by side, or in a
 * single column, which a narrow diff shows by itself. Spaces, tabs and indentation stay as in the
 * text, and the text never becomes HTML.
 */
@Component({
  selector: 'diffwise-text',
  imports: [
    ChangeDetailsButton,
    ChangeTooltip,
    CollapsedLinesBar,
    DiffToolbar,
    NgTemplateOutlet,
    ViewSettings,
  ],
  templateUrl: './diff-view.html',
  styleUrls: [
    './diff-view.css',
    './list-and-table-lines.css',
    './change-details/change-details.css',
    './single-column.css',
    './collapsed-lines/collapsed-lines.css',
    './toolbar/toolbar.css',
    './toolbar/view-settings.css',
    './navigation/active-change.css',
    './no-changes.css',
    './high-contrast.css',
    './forced-colors.css',
    './text-lines.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DiffwiseText extends DiffView {
  /** The earlier version of the text. */
  readonly oldText = input('');

  /** The later version of the text. */
  readonly newText = input('');

  /** Both texts; a new one starts a new comparison. */
  protected override readonly versions = computed<DiffVersions>(() => ({
    old: this.oldText(),
    new: this.newText(),
  }));

  /** Compares the texts line by line, and the words of similar lines. */
  protected override compareVersions(
    versions: DiffVersions,
    settings: ComparisonSettings,
  ): Comparison {
    return diffText(versions.old, versions.new, settings);
  }
}
