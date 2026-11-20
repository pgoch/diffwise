import { LOCALE_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { DiffwiseConfigOptions } from './config/diffwise-config';
import { DiffwiseLanguage, DiffwiseLayout } from './config/option-values';
import { provideDiffwiseLanguages } from './config/provide-diffwise-languages';
import { DiffwiseHtml } from './diffwise-html';
import { ENGLISH_TEXTS } from './i18n/en';
import { LANGUAGE_PACKS, diffwiseGerman, diffwisePolish } from './i18n/languages';
import { languageTag } from './i18n/resolve-language';
import type { DiffwiseLanguagePack } from './i18n/texts';

const OLD_HTML_INPUT = 'oldHtml';
const NEW_HTML_INPUT = 'newHtml';
const LAYOUT_INPUT = 'layout';
const VERSION_HEADER_SELECTOR = '.diffwise-diff__version-header';
const DESCRIPTION_SELECTOR = '[data-diffwise-line-description]';
const TOOLBAR_TAG = 'diffwise-diff-toolbar';
const VIEW_BUTTON_SELECTOR = '.diffwise-diff__view-button';
const GROUP_LABEL_SELECTOR = '.diffwise-diff__view-settings-label';
const RESET_SELECTOR = '.diffwise-diff__view-settings-reset';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const LANG_ATTRIBUTE = 'lang';
const WARN_METHOD = 'warn';
const CUSTOM_HEADER = 'Draft';
const PROVIDE_FUNCTION = 'provideDiffwiseLanguages()';
const ENGLISH_HEADERS = ['Previous version', 'New version'];
const POLISH_HEADERS = ['Poprzednia wersja', 'Nowa wersja'];
const GERMAN_HEADERS = ['Vorherige Version', 'Neue Version'];

/** Line 2 changed and line 3 added; line 1 the same. */
const OLD_HTML = '<p>Shared introduction.</p><p>The price is 10 euro.</p>';
const NEW_HTML =
  '<p>Shared introduction.</p><p>The price is 12 euro.</p><p>Contact support any day.</p>';

/** Every language of the interface with its texts, English first. */
const LANGUAGE_TEXTS: readonly DiffwiseLanguagePack[] = [
  { language: DiffwiseLanguage.EN, texts: ENGLISH_TEXTS },
  ...LANGUAGE_PACKS,
];

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
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideDiffwiseLanguages(...LANGUAGE_PACKS)] });
  });

  for (const { language, texts } of LANGUAGE_TEXTS) {
    it(`shows the interface in the language "${language}", marked with its tag`, () => {
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
        texts.newVersionLabel,
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

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(GERMAN_HEADERS);
    expect(element.querySelector(TOOLBAR_TAG)?.getAttribute(LANG_ATTRIBUTE)).toBe('de');
  });

  it('shows Simplified Chinese to an app in Chinese of Taiwan, marked as simplified', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'zh-TW' }] });

    const element = renderElement({});

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(['上一版本', '新版本']);
    expect(element.querySelector(TOOLBAR_TAG)?.getAttribute(LANG_ATTRIBUTE)).toBe('zh-Hans');
  });
});

describe('DiffwiseHtml languages that the app provides', () => {
  beforeEach(() => {
    vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows English in place of a language that the app does not provide, and warns', () => {
    const element = renderElement({ language: DiffwiseLanguage.PL });

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(ENGLISH_HEADERS);
    expect(element.querySelector(TOOLBAR_TAG)?.getAttribute(LANG_ATTRIBUTE)).toBe('en');
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(PROVIDE_FUNCTION),
      DiffwiseLanguage.PL,
    );
  });

  it('takes the language of the app in automatic mode only when the app provides it', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-AT' }] });

    expect(textsOf(renderElement({}), VERSION_HEADER_SELECTOR)).toEqual(ENGLISH_HEADERS);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(PROVIDE_FUNCTION),
      DiffwiseLanguage.DE,
    );
  });

  it('shows English without a warning, since every app has it', () => {
    const element = renderElement({ language: DiffwiseLanguage.EN });

    expect(textsOf(element, VERSION_HEADER_SELECTOR)).toEqual(ENGLISH_HEADERS);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('adds the languages of each call of provideDiffwiseLanguages()', () => {
    TestBed.configureTestingModule({
      providers: [
        provideDiffwiseLanguages(diffwisePolish),
        provideDiffwiseLanguages(diffwiseGerman),
      ],
    });

    const polish = renderElement({ language: DiffwiseLanguage.PL });
    const german = renderElement({ language: DiffwiseLanguage.DE });

    expect(textsOf(polish, VERSION_HEADER_SELECTOR)).toEqual(POLISH_HEADERS);
    expect(textsOf(german, VERSION_HEADER_SELECTOR)).toEqual(GERMAN_HEADERS);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns about a language not provided once, not again when another option changes', () => {
    const fixture = render({ language: DiffwiseLanguage.PL });

    fixture.componentRef.setInput(LAYOUT_INPUT, DiffwiseLayout.Inline);
    fixture.detectChanges();

    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
