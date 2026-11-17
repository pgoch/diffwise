import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { DiffwiseCustomTexts } from 'ngx-diffwise';

import { ConfiguratorState } from './configurator-state';
import { CUSTOM_TEXT_GROUPS, type CustomText, type CustomTextGroup } from './custom-texts';

/**
 * Texts of the interface of an app, `customTexts`, in the groups of the documentation. An empty
 * field keeps the text of the language of the interface; the English text stands in it as a hint.
 */
@Component({
  selector: 'demo-custom-texts-editor',
  template: `
    @for (group of groups(); track group.title) {
      <details class="group">
        <summary>
          {{ group.title }}
          @if (changedCount(group); as count) {
            <span class="count">{{ count }} changed</span>
          }
        </summary>
        <div class="texts">
          @for (text of group.texts; track text.name) {
            <label class="text">
              <code>{{ text.name }}</code>
              <input
                type="text"
                [placeholder]="text.english"
                [value]="textOf(text)"
                (input)="write(text, $event)"
              />
            </label>
          }
        </div>
      </details>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .group {
      border-bottom: 1px solid var(--site-border);
    }

    summary {
      padding: 6px 0;
      font-size: 13.5px;
      cursor: pointer;
    }

    .count {
      margin-inline-start: 6px;
      color: var(--site-accent);
      font-size: 12px;
    }

    .texts {
      display: grid;
      gap: 6px;
      padding: 4px 0 12px;
    }

    .text {
      display: grid;
      gap: 2px;
    }

    code {
      color: var(--site-muted);
      font-size: 12px;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--site-border);
      border-radius: 6px;
      background: #fff;
      color: var(--site-text);
      font: inherit;
      font-size: 13.5px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTextsEditor {
  private readonly state = inject(ConfiguratorState);

  /** The groups of texts for the diffs of the app, each with the texts these diffs show. */
  protected readonly groups = computed(() => {
    const diffKinds = this.state.diffKinds();
    const isShown = (kinds: CustomText['diffKinds']) =>
      kinds === undefined || kinds.some((kind) => diffKinds.includes(kind));
    const shownGroups = CUSTOM_TEXT_GROUPS.filter((group) => isShown(group.diffKinds));

    return shownGroups.map((group) => {
      const texts = group.texts.filter((text) => isShown(text.diffKinds));

      return { ...group, texts };
    });
  });

  /** The text of the app; empty while the language gives it. */
  protected textOf({ name }: CustomText): string {
    return this.state.valueOf('customTexts')?.[name] ?? '';
  }

  /** The number of texts of the group that the app gives; 0 for none. */
  protected changedCount(group: CustomTextGroup): number {
    return group.texts.filter((text) => this.textOf(text).length > 0).length;
  }

  /** Puts the written text in the configuration; an empty one leaves the text to the language. */
  protected write({ name }: CustomText, event: Event): void {
    const { value } = event.target as HTMLInputElement;
    const customTexts = this.state.valueOf('customTexts') ?? {};
    const changed = Object.entries({ ...customTexts, [name]: value });
    const written: DiffwiseCustomTexts = Object.fromEntries(
      changed.filter(([, text]) => text !== undefined && text.length > 0),
    );

    this.state.setOption('customTexts', written);
  }
}
