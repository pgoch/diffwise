import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Diffwise, DiffwiseColorMode, DiffwiseLanguage } from 'ngx-diffwise';

import { serveSampleFiles } from '../../testing/sample-files';
import { ConfiguratorPage } from './configurator-page';

const STEP_SELECTOR = '.flow-steps .flow-step';
const CURRENT_STEP_SELECTOR = '.flow-steps [aria-current="step"]';
const GOAL_STEP_SELECTOR = '.flow-steps .flow-step--goal';
const HEADING_SELECTOR = '.step-heading';
const NAV_BUTTON_SELECTOR = '.nav button';
const OPTION_BUTTON_SELECTOR = '.option-choice';
const PREVIEW_BUTTON_SELECTOR = '.preview-switch button';
const PREVIEW_LABEL_SELECTOR = '.preview-label';
const NO_CHANGES_SELECTOR = '.preview .diffwise-diff__no-changes';
const LANGUAGE_SELECT_SELECTOR = '.preview-language';
const SAMPLE_HINT_SELECTOR = '.sample-hint';
const HTML_DIFF_SELECTOR = '.preview diffwise-html';
const TEXT_DIFF_SELECTOR = '.preview diffwise-text';
const DARK_THEME_CLASS = 'diffwise-diff--dark-theme';
const CHANGE_EVENT = 'change';
const BACK = 'Back';
const NEXT = 'Next';
const PLAIN_TEXT = 'Plain text';
const HTML_PREVIEW = 'HTML';
const TEXT_PREVIEW = 'Text';
const CHANGE_DETAILS_STEP = 'Change details';
const RESULT_STEP = 'Result';
const VIEW_SETTINGS_STEP = 'View settings';
const HIDDEN = 'Hidden';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Renders the configurator once the sample of its preview has loaded. */
async function render(): Promise<ComponentFixture<ConfiguratorPage>> {
  serveSampleFiles();

  const fixture = TestBed.createComponent(ConfiguratorPage);

  await settle(fixture);

  return fixture;
}

/** Waits for the sample to load and for the page to show it. */
async function settle(fixture: ComponentFixture<ConfiguratorPage>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Every element of the selector in the page. */
function all(fixture: ComponentFixture<ConfiguratorPage>, selector: string): HTMLElement[] {
  const element = fixture.nativeElement as HTMLElement;

  return Array.from(element.querySelectorAll<HTMLElement>(selector));
}

/** The texts of the elements of the selector, with whitespace as single spaces. */
function textsOf(fixture: ComponentFixture<ConfiguratorPage>, selector: string): string[] {
  return all(fixture, selector).map(
    (element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
}

/** The names of the steps in the bar. */
function stepNames(fixture: ComponentFixture<ConfiguratorPage>): string[] {
  return textsOf(fixture, STEP_SELECTOR).map((text) => text.replace(/^\d+\s*/, ''));
}

/** Clicks the element of the selector whose text starts with the label. */
async function click(
  fixture: ComponentFixture<ConfiguratorPage>,
  selector: string,
  label: string,
): Promise<void> {
  const target = all(fixture, selector).find((element) =>
    element.textContent?.trim().startsWith(label),
  );

  target?.click();
  await settle(fixture);
}

/** Clicks the step with the name in the bar. */
async function clickStep(fixture: ComponentFixture<ConfiguratorPage>, name: string): Promise<void> {
  const index = stepNames(fixture).indexOf(name);

  all(fixture, STEP_SELECTOR)[index]?.click();
  await settle(fixture);
}

/** The heading of the step that shows. */
function headingOf(fixture: ComponentFixture<ConfiguratorPage>): string {
  return textsOf(fixture, HEADING_SELECTOR)[0];
}

/** The text of the first element of the selector, or nothing when there is none. */
function textOf(fixture: ComponentFixture<ConfiguratorPage>, selector: string): string {
  return all(fixture, selector)[0]?.textContent ?? '';
}

/** Chooses the language of the sample. */
async function chooseLanguage(
  fixture: ComponentFixture<ConfiguratorPage>,
  language: DiffwiseLanguage,
): Promise<void> {
  const select = all(fixture, LANGUAGE_SELECT_SELECTOR)[0] as HTMLSelectElement;

  select.value = language;
  select.dispatchEvent(new Event(CHANGE_EVENT));
  await settle(fixture);
}

describe('ConfiguratorPage', () => {
  it('starts at the first step, with every step in the bar and the result as the goal', async () => {
    const fixture = await render();

    expect(stepNames(fixture)).toEqual([
      'Your diffs',
      'Colors',
      'Lines',
      'Layout',
      'Change details',
      'Fonts',
      'Toolbar',
      'Identical versions',
      'Comparison',
      'Language and texts',
      'View settings',
      'Result',
    ]);
    expect(textsOf(fixture, CURRENT_STEP_SELECTOR)).toEqual(['1 Your diffs']);
    expect(textsOf(fixture, GOAL_STEP_SELECTOR)).toEqual(['12 Result']);
    expect(headingOf(fixture)).toBe('1. Your diffs');
    expect(textsOf(fixture, NAV_BUTTON_SELECTOR)).toEqual([NEXT]);
  });

  it('goes to the next and the previous step, with the focus on the heading', async () => {
    const fixture = await render();

    await click(fixture, NAV_BUTTON_SELECTOR, NEXT);

    expect(headingOf(fixture)).toBe('2. Colors');
    expect(textsOf(fixture, CURRENT_STEP_SELECTOR)).toEqual(['2 Colors']);
    expect(textsOf(fixture, NAV_BUTTON_SELECTOR)).toEqual([BACK, NEXT]);
    expect(document.activeElement?.textContent?.trim()).toBe('2. Colors');

    await click(fixture, NAV_BUTTON_SELECTOR, BACK);

    expect(headingOf(fixture)).toBe('1. Your diffs');
  });

  it('goes to any step from the bar; the result has no next step', async () => {
    const fixture = await render();

    await clickStep(fixture, RESULT_STEP);

    expect(headingOf(fixture)).toBe('12. Result');
    expect(textsOf(fixture, NAV_BUTTON_SELECTOR)).toEqual([BACK]);

    await clickStep(fixture, 'Fonts');

    expect(headingOf(fixture)).toBe('6. Fonts');
  });

  it('leaves out the change details for an app with plain text alone, and previews plain text', async () => {
    const fixture = await render();

    await click(fixture, OPTION_BUTTON_SELECTOR, PLAIN_TEXT);

    expect(stepNames(fixture)).not.toContain(CHANGE_DETAILS_STEP);
    expect(stepNames(fixture)).toHaveLength(11);
    expect(all(fixture, PREVIEW_BUTTON_SELECTOR)).toEqual([]);
    expect(textOf(fixture, TEXT_DIFF_SELECTOR)).toContain('test-data/text/en/long');
    expect(all(fixture, HTML_DIFF_SELECTOR)).toEqual([]);
  });

  it('previews either diff of an app with both diffs', async () => {
    const fixture = await render();

    expect(textOf(fixture, HTML_DIFF_SELECTOR)).toContain('test-data/en/long');

    await click(fixture, PREVIEW_BUTTON_SELECTOR, TEXT_PREVIEW);

    expect(textOf(fixture, TEXT_DIFF_SELECTOR)).toContain('test-data/text/en/long');

    await click(fixture, PREVIEW_BUTTON_SELECTOR, HTML_PREVIEW);

    expect(textOf(fixture, HTML_DIFF_SELECTOR)).toContain('test-data/en/long');
  });

  it('previews the long sample in the chosen language, and plain text in English when its language has none', async () => {
    const fixture = await render();

    await chooseLanguage(fixture, DiffwiseLanguage.DE);

    expect(textOf(fixture, HTML_DIFF_SELECTOR)).toContain('test-data/de/long');
    expect(all(fixture, SAMPLE_HINT_SELECTOR)).toEqual([]);

    await click(fixture, PREVIEW_BUTTON_SELECTOR, TEXT_PREVIEW);

    expect(textOf(fixture, TEXT_DIFF_SELECTOR)).toContain('test-data/text/en/long');
    expect(textOf(fixture, SAMPLE_HINT_SELECTOR)).toContain('English and Polish');

    await chooseLanguage(fixture, DiffwiseLanguage.PL);

    expect(textOf(fixture, TEXT_DIFF_SELECTOR)).toContain('test-data/text/pl/long');
    expect(all(fixture, SAMPLE_HINT_SELECTOR)).toEqual([]);
  });

  it('compares the sample with itself in the step of identical versions', async () => {
    const fixture = await render();

    await clickStep(fixture, 'Identical versions');

    expect(textsOf(fixture, PREVIEW_LABEL_SELECTOR)).toEqual([
      'Preview · the sample compared with itself',
    ]);
    expect(textsOf(fixture, NO_CHANGES_SELECTOR)).toEqual(['No changes']);

    await clickStep(fixture, 'Comparison');

    expect(textsOf(fixture, PREVIEW_LABEL_SELECTOR)).toEqual(['Preview']);
    expect(all(fixture, NO_CHANGES_SELECTOR)).toEqual([]);
  });

  it('disables the view settings without the toolbar, and steps over them', async () => {
    const fixture = await render();
    const viewSettings = () =>
      all(fixture, STEP_SELECTOR).find((step) => step.textContent?.includes(VIEW_SETTINGS_STEP));

    expect((viewSettings() as HTMLButtonElement).disabled).toBe(false);

    await clickStep(fixture, 'Toolbar');
    await click(fixture, OPTION_BUTTON_SELECTOR, HIDDEN);

    expect((viewSettings() as HTMLButtonElement).disabled).toBe(true);
    expect(viewSettings()?.textContent).toContain('(Only with the toolbar shown.)');

    await clickStep(fixture, 'Language and texts');
    await click(fixture, NAV_BUTTON_SELECTOR, NEXT);

    expect(headingOf(fixture)).toBe('12. Result');

    await click(fixture, NAV_BUTTON_SELECTOR, BACK);

    expect(headingOf(fixture)).toBe('10. Language and texts');
  });

  it('keeps the preview apart from the global configuration of the demo', async () => {
    TestBed.inject(Diffwise).updateConfig({ colorMode: DiffwiseColorMode.Dark });

    const fixture = await render();
    const diff = all(fixture, HTML_DIFF_SELECTOR)[0];

    expect(diff.classList.contains(DARK_THEME_CLASS)).toBe(false);
  });

  it('keeps the choices while the app runs, also after leaving the page', async () => {
    const first = await render();

    await click(first, OPTION_BUTTON_SELECTOR, PLAIN_TEXT);
    await clickStep(first, 'Lines');
    first.destroy();

    const second = await render();

    expect(headingOf(second)).toBe('3. Lines');
    expect(stepNames(second)).not.toContain(CHANGE_DETAILS_STEP);
  });
});
