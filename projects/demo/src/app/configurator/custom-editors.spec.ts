import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { type DiffwiseConfigOptions, DiffwiseHtml } from 'ngx-diffwise';

import { ENGLISH_TEXTS } from '../../../../ngx-diffwise/src/lib/i18n/en';
import { serveSampleFiles } from '../../testing/sample-files';
import { AppDiffs, ConfiguratorState } from './configurator-state';
import { ConfiguratorPage } from './configurator-page';
import { CUSTOM_TEXT_GROUPS } from './custom-texts';
import { STEPS, StepId } from './steps';

const GROUP_SELECTOR = 'demo-custom-texts-editor details';
const SUMMARY_SELECTOR = 'summary';
const TEXT_SELECTOR = '.text';
const CODE_SELECTOR = 'code';
const INPUT_SELECTOR = 'input';
const INPUT_EVENT = 'input';
const LIGHT_ADDED_ACCENT = 'Added accent, light theme';
const DARK_ADDED_ACCENT = 'Added accent, dark theme';
const OLD_VERSION_TEXT = 'oldVersionLabel';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Renders the configurator at the step. */
async function render(stepId: StepId): Promise<ComponentFixture<ConfiguratorPage>> {
  serveSampleFiles();

  const step = STEPS.find(({ id }) => id === stepId);

  if (step !== undefined) {
    TestBed.inject(ConfiguratorState).goTo(step);
  }

  const fixture = TestBed.createComponent(ConfiguratorPage);

  await settle(fixture);

  return fixture;
}

/** Waits for the page to show the changes. */
async function settle(fixture: ComponentFixture<ConfiguratorPage>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** The options of the configuration that the HTML diff of the preview gets. */
function previewConfig(fixture: ComponentFixture<ConfiguratorPage>): DiffwiseConfigOptions {
  const diff = fixture.debugElement.query(By.directive(DiffwiseHtml));

  return (diff.componentInstance as DiffwiseHtml).config() as DiffwiseConfigOptions;
}

/** The fields of a color, named as a screen reader names them: the check box and the color. */
function colorFields(
  fixture: ComponentFixture<ConfiguratorPage>,
  label: string,
): [HTMLInputElement, HTMLInputElement] {
  const element = fixture.nativeElement as HTMLElement;
  const fields = element.querySelectorAll<HTMLInputElement>(`input[aria-label="${label}"]`);

  return [fields[0], fields[1]];
}

/** Sets the value of a field and tells the page, as typing does. */
async function type(
  fixture: ComponentFixture<ConfiguratorPage>,
  field: HTMLInputElement,
  value: string,
): Promise<void> {
  field.value = value;
  field.dispatchEvent(new Event(INPUT_EVENT));
  await settle(fixture);
}

/** The groups of texts, each with its title and its text names. */
function textGroups(fixture: ComponentFixture<ConfiguratorPage>): [string, string[]][] {
  const element = fixture.nativeElement as HTMLElement;

  return Array.from(element.querySelectorAll(GROUP_SELECTOR), (group) => [
    group.querySelector(SUMMARY_SELECTOR)?.textContent?.trim() ?? '',
    Array.from(group.querySelectorAll(CODE_SELECTOR), (code) => code.textContent ?? ''),
  ]);
}

/** The field of the text with the name. */
function textField(fixture: ComponentFixture<ConfiguratorPage>, name: string): HTMLInputElement {
  const element = fixture.nativeElement as HTMLElement;
  const texts = Array.from(element.querySelectorAll(TEXT_SELECTOR));
  const text = texts.find(
    (candidate) => candidate.querySelector(CODE_SELECTOR)?.textContent === name,
  );

  return text?.querySelector<HTMLInputElement>(INPUT_SELECTOR) as HTMLInputElement;
}

describe('Custom texts catalogue', () => {
  it('has every text of the interface once, with the English text of the library', () => {
    const texts = CUSTOM_TEXT_GROUPS.flatMap((group) => group.texts);
    const names = texts.map((text) => text.name);

    expect([...names].sort()).toEqual(Object.keys(ENGLISH_TEXTS).sort());
    expect(new Set(names).size).toBe(names.length);

    for (const { name, english } of texts) {
      expect(english).toBe(ENGLISH_TEXTS[name]);
    }
  });
});

describe('CustomColorsEditor', () => {
  it('gives the preview a ticked color, its picked value, and takes it back', async () => {
    const fixture = await render(StepId.Colors);
    const [check, color] = colorFields(fixture, LIGHT_ADDED_ACCENT);

    expect(color.disabled).toBe(true);

    check.click();
    await settle(fixture);

    expect(previewConfig(fixture).diffColors).toEqual({ light: { addedAccent: '#0f766e' } });

    await type(fixture, colorFields(fixture, LIGHT_ADDED_ACCENT)[1], '#123456');

    expect(previewConfig(fixture).diffColors).toEqual({ light: { addedAccent: '#123456' } });

    colorFields(fixture, DARK_ADDED_ACCENT)[0].click();
    await settle(fixture);

    expect(previewConfig(fixture).diffColors).toEqual({
      light: { addedAccent: '#123456' },
      dark: { addedAccent: '#5eead4' },
    });

    colorFields(fixture, LIGHT_ADDED_ACCENT)[0].click();
    await settle(fixture);

    expect(previewConfig(fixture).diffColors).toEqual({ dark: { addedAccent: '#5eead4' } });

    colorFields(fixture, DARK_ADDED_ACCENT)[0].click();
    await settle(fixture);

    expect(TestBed.inject(ConfiguratorState).options()).toEqual({});
  });
});

describe('CustomTextsEditor', () => {
  it('groups the texts as the documentation does, with the English text as a hint', async () => {
    const fixture = await render(StepId.Language);
    const groups = textGroups(fixture);

    expect(groups.map(([title]) => title)).toEqual([
      'Versions and the diff',
      'For screen readers',
      'Tooltips',
      'Names of formatting',
      'Single column and hidden lines',
      'Toolbar',
      'View settings',
    ]);
    expect(textField(fixture, OLD_VERSION_TEXT).placeholder).toBe('Previous version');
  });

  it('gives the preview a written text, counts it, and takes back an empty one', async () => {
    const fixture = await render(StepId.Language);

    await type(fixture, textField(fixture, OLD_VERSION_TEXT), 'Draft');

    expect(previewConfig(fixture).customTexts).toEqual({ oldVersionLabel: 'Draft' });
    expect(textGroups(fixture)[0][0]).toBe('Versions and the diff 1 changed');

    await type(fixture, textField(fixture, OLD_VERSION_TEXT), '');

    expect(TestBed.inject(ConfiguratorState).options()).toEqual({});
  });

  it('leaves out the texts of a diff the app does not show', async () => {
    const state = TestBed.inject(ConfiguratorState);

    state.chooseAppDiffs(AppDiffs.Text);

    const fixture = await render(StepId.Language);
    const titles = textGroups(fixture).map(([title]) => title);

    expect(titles).not.toContain('Tooltips');
    expect(titles).not.toContain('Names of formatting');

    state.chooseAppDiffs(AppDiffs.Html);
    await settle(fixture);

    const viewSettings = textGroups(fixture).find(([title]) => title === 'View settings');

    expect(viewSettings?.[1]).not.toContain('textFontLabel');
  });
});
