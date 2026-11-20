import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { type Comparison, type ComparisonSettings, diffHtml } from '../engine';
import { ChangeDetailsButton } from './change-details/change-details-button';
import { ChangeTooltip } from './change-details/change-tooltip';
import { CollapsedLinesBar } from './collapsed-lines/collapsed-lines-bar';
import { type DiffVersions, DiffView } from './diff-view';
import { DiffToolbar } from './toolbar/diff-toolbar';
import { ViewSettings } from './toolbar/view-settings';

/** A version without any document, before the app gives one. */
const NO_HTML = '';

/**
 * Shows two versions of an HTML document with the changes marked: side by side, or in a single
 * column, which a narrow diff shows by itself.
 */
@Component({
  selector: 'diffwise-html',
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
    './large-document.css',
    './high-contrast.css',
    './forced-colors.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DiffwiseHtml extends DiffView {
  /** The earlier version of the document. */
  readonly oldHtml = input(NO_HTML);

  /** The later version of the document. */
  readonly newHtml = input(NO_HTML);

  /** Both documents; a new one starts a new comparison. */
  protected override readonly versions = computed<DiffVersions>(() => ({
    old: this.oldHtml(),
    new: this.newHtml(),
  }));

  /** Compares the documents as the reader sees them: text, formatting, links, images and tables. */
  protected override compareVersions(
    versions: DiffVersions,
    settings: ComparisonSettings,
  ): Comparison {
    return diffHtml(versions.old, versions.new, settings);
  }
}
