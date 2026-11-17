import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Diffwise, DiffwiseColorMode, DiffwiseLayout } from 'ngx-diffwise';

import { serveSampleFiles } from '../../testing/sample-files';
import { ConfiguratorState } from './configurator-state';
import { ConfiguratorPage } from './configurator-page';

const STEP_SELECTOR = '.flow-steps .flow-step';
const CURRENT_STEP_SELECTOR = '.flow-steps [aria-current="step"]';
const GOAL_STEP_SELECTOR = '.flow-steps .flow-step--goal';
const HEADING_SELECTOR = '.step-heading';
const NAV_BUTTON_SELECTOR = '.nav button';
const HEAD_BUTTON_SELECTOR = '.step-nav button';
const OPTION_BUTTON_SELECTOR = '.option-choice';
const PREVIEW_BUTTON_SELECTOR = '.preview-switch button';
const PREVIEW_LABEL_SELECTOR = '.preview-label';
const NO_CHANGES_SELECTOR = '.preview .diffwise-diff__no-changes';
const LANGUAGE_SELECT_SELECTOR = '.preview select[aria-label="Language of the sample"]';
const PREVIEW_THEME_SELECTOR = '.preview-theme';
const PREVIEW_LAYOUT_SELECTOR = '.preview-layout';
const INLINE_LAYOUT_SELECTOR = '.preview diffwise-html.diffwise-diff--layout-inline';
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
const TOOLBAR_STEP = 'Toolbar';
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

/** Chooses the value in a list. */
async function chooseIn(
  fixture: ComponentFixture<ConfiguratorPage>,
  select: HTMLSelectElement,
  value: string,
): Promise<void> {
  select.value = value;
  select.dispatchEvent(new Event(CHANGE_EVENT));
  await settle(fixture);
}

describe('ConfiguratorPage', () => {
  it('starts at the first step, with every step in the bar and the result as the goal', async () => {
    const fixture = await render();

    expect(stepNames(fixture)).toEqual([
      'General',
      'Colors',
      'Lines',
      'Layout',
      'Change details',
      'Fonts',
      'Toolbar',
      'Identical versions',
      'Comparison',
      'Texts',
      'View settings',
      'Result',
    ]);
    expect(textsOf(fixture, CURRENT_STEP_SELECTOR)).toEqual(['1 General']);
    expect(textsOf(fixture, GOAL_STEP_SELECTOR)).toEqual(['12 Result']);
    expect(headingOf(fixture)).toBe('1. General');
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

    expect(headingOf(fixture)).toBe('1. General');
  });

  it('goes to the next and the previous step also from the buttons next to the heading', async () => {
    const fixture = await render();

    await click(fixture, HEAD_BUTTON_SELECTOR, NEXT);

    expect(headingOf(fixture)).toBe('2. Colors');
    expect(textsOf(fixture, HEAD_BUTTON_SELECTOR)).toEqual([BACK, NEXT]);

    await click(fixture, HEAD_BUTTON_SELECTOR, BACK);

    expect(headingOf(fixture)).toBe('1. General');
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

  it('previews English samples only, with no list of their languages', async () => {
    const fixture = await render();

    expect(all(fixture, LANGUAGE_SELECT_SELECTOR)).toEqual([]);

    await click(fixture, OPTION_BUTTON_SELECTOR, PLAIN_TEXT);

    expect(textOf(fixture, TEXT_DIFF_SELECTOR)).toContain('test-data/text/en/long');
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

  it('disables the toolbar and the view settings without the toolbar, and steps over them', async () => {
    const fixture = await render();
    const stepNamed = (name: string) =>
      all(fixture, STEP_SELECTOR).find((step) => step.textContent?.includes(name));
    const isDisabled = (name: string) => (stepNamed(name) as HTMLButtonElement).disabled;

    expect([isDisabled(TOOLBAR_STEP), isDisabled(VIEW_SETTINGS_STEP)]).toEqual([false, false]);

    await click(fixture, OPTION_BUTTON_SELECTOR, HIDDEN);

    expect([isDisabled(TOOLBAR_STEP), isDisabled(VIEW_SETTINGS_STEP)]).toEqual([true, true]);
    expect(stepNamed(VIEW_SETTINGS_STEP)?.textContent).toContain(
      '(Only with the toolbar shown in the step General.)',
    );

    await clickStep(fixture, 'Fonts');
    await click(fixture, NAV_BUTTON_SELECTOR, NEXT);

    expect(headingOf(fixture)).toBe('8. Identical versions');

    await clickStep(fixture, 'Texts');
    await click(fixture, NAV_BUTTON_SELECTOR, NEXT);

    expect(headingOf(fixture)).toBe('12. Result');

    await click(fixture, NAV_BUTTON_SELECTOR, BACK);

    expect(headingOf(fixture)).toBe('10. Texts');
  });

  it('previews either theme and layout of Auto, without changing the configuration', async () => {
    const fixture = await render();
    const theme = all(fixture, PREVIEW_THEME_SELECTOR)[0] as HTMLSelectElement;
    const layout = all(fixture, PREVIEW_LAYOUT_SELECTOR)[0] as HTMLSelectElement;

    await chooseIn(fixture, theme, DiffwiseColorMode.Dark);
    await chooseIn(fixture, layout, DiffwiseLayout.Inline);

    expect(all(fixture, HTML_DIFF_SELECTOR)[0].classList.contains(DARK_THEME_CLASS)).toBe(true);
    expect(all(fixture, INLINE_LAYOUT_SELECTOR)).toHaveLength(1);
    expect(TestBed.inject(ConfiguratorState).options()).toEqual({});

    await click(fixture, OPTION_BUTTON_SELECTOR, 'Light');

    expect(theme.disabled).toBe(true);
    expect(theme.value).toBe(DiffwiseColorMode.Light);
    expect(all(fixture, HTML_DIFF_SELECTOR)[0].classList.contains(DARK_THEME_CLASS)).toBe(false);
    expect(layout.disabled).toBe(false);
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
