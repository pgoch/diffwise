import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shows two versions of an HTML document side by side, with the changes marked. */
@Component({
  selector: 'diffwise-html-diff',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffwiseHtmlDiff {
  /** The earlier version of the document. */
  readonly oldHtml = input('');

  /** The later version of the document. */
  readonly newHtml = input('');
}
