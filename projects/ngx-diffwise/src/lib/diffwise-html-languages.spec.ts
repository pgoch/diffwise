import { LOCALE_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseLanguage, DiffwiseLayout } from './config/option-values';
import { DiffwiseHtml } from './diffwise-html';
import { LANGUAGE_TEXTS, type UiLanguage, languageTag } from './i18n/resolve-language';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const VERSION_HEADER_SELECTOR = '.diffwise-diff__version-header';
const DESCRIPTION_SELECTOR = '[data-diffwise-line-description]';
const TOOLBAR_TAG = 'diffwise-diff-toolbar';
const VIEW_BUTTON_SELECTOR = '.diffwise-diff__view-button';
const GROUP_LABEL_SELECTOR = '.diffwise-diff__view-settings-label';
const RESET_SELECTOR = '.diffwise-diff__view-settings-reset';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const LANG_ATTRIBUTE = 'lang';
const CUSTOM_HEADER = 'Draft';

/** Line 2 changed and line 3 added; line 1 the same. */
const OLD_HTML = '<p>Shared introduction.</p><p>The price is 10 euro.</p>';
const NEW_HTML =
  '<p>Shared introduction.</p><p>The price is 12 euro.</p><p>Contact support any day.</p>';

const LANGUAGES = Object.keys(LANGUAGE_TEXTS) as UiLanguage[];

function render(options: DiffwiseConfigOptions): ComponentFixture<DiffwiseHtml> {
  const fixture = TestBed.createComponent(DiffwiseHtml);

  fixture.componentRef.setInput(OLD_HTML_INPUT, OLD_HTML);
  fixture.componentRef.setInput(NEW_HTML_INPUT, NEW_HTML);

  for (const [name, value] of Object.entries(options)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function renderElement(options: DiffwiseConfigOptions): HTMLElement {
  return render(options).nativeElement as HTMLElement;
}

function textsOf(element: HTMLElement, selector: string): (string | undefined)[] {
  return Array.from(element.querySelectorAll(selector), (found) => found.textContent?.trim());
}

describe('DiffwiseHtml languages of the interface', () => {
  for (const language of LANGUAGES) {
    it(`shows the interface in the language "${language}", marked with its tag`, () => {
      const texts = LANGUAGE_TEXTS[language];
      const element = renderElement({ language, layout: DiffwiseLayout.SideBySide });
      const toolbar = element.querySelector(TOOLBAR_TAG);

      expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual([
        texts.oldVersionLabel,
        texts.newVersionLabel,
      ]);
      expect(element.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(texts.diffLabel);
      expect(textsOf(element, DESCRIPTION_SELECTOR)).toEqual([
        texts.changedLineBeforeLabel.replace('{number}', '2'),
        texts.changedLineAfterLabel.replace('{number}', '2'),
        texts.addedLineLabel.replace('{number}', '3'),
      ]);
      expect(toolbar?.getAttribute(LANG_ATTRIBUTE)).toBe(languageTag(language));
      expect(element.querySelector(VIEW_BUTTON_SELECTOR)?.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(
        texts.viewButtonLabel,
      );
      expect(textsOf(element, GROUP_LABEL_SELECTOR)).toEqual([
        texts.colorModeLabel,
        texts.diffPaletteLabel,
        texts.layoutLabel,
        texts.inlineDiffStyleLabel,
      ]);
      expect(textsOf(element, RESET_SELECTOR)).toEqual([texts.resetUserSettingsLabel]);
    });

    it(`lets a custom text win over a text in the language "${language}"`, () => {
      const element = renderElement({ language, customTexts: { oldVersionLabel: CUSTOM_HEADER } });

      expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual([
        CUSTOM_HEADER,
        LANGUAGE_TEXTS[language].newVersionLabel,
      ]);
    });
  }

  it('shows the interface in Japanese, in the Japanese words', () => {
    const element = renderElement({ language: DiffwiseLanguage.JA });

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual([
      '以前のバージョン',
      '新しいバージョン',
    ]);
  });

  it('takes the language of the app in automatic mode, such as German of Austria', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-AT' }] });

    const element = renderElement({});

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual([
      'Vorherige Version',
      'Neue Version',
    ]);
    expect(element.querySelector(TOOLBAR_TAG)?.getAttribute(LANG_ATTRIBUTE)).toBe('de');
  });

  it('shows Simplified Chinese to an app in Chinese of Taiwan, marked as simplified', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'zh-TW' }] });

    const element = renderElement({});

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(['上一版本', '新版本']);
    expect(element.querySelector(TOOLBAR_TAG)?.getAttribute(LANG_ATTRIBUTE)).toBe('zh-Hans');
  });
});
