import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { DiffwiseColorMode } from 'ngx-diffwise';

import { serveSampleFiles } from '../../testing/sample-files';
import { ConfigForm, configCode } from './config-code';
import { AppDiffs, ConfiguratorState } from './configurator-state';
import { ConfiguratorPage } from './configurator-page';
import { STEPS, StepId } from './steps';

const CODE_SELECTOR = '.code';
const FORM_BUTTON_SELECTOR = '.form-switch button';
const COPY_BUTTON_SELECTOR = '.code-head .button--primary';
const CHANGE_SELECTOR = '.change-text';
const EDIT_BUTTON_SELECTOR = '.change-edit';
const CHANGES_HEADING_SELECTOR = '.changes-heading';
const EMPTY_SELECTOR = '.changes-empty';
const START_OVER_SELECTOR = '.changes > .button';
const HEADING_SELECTOR = '.step-heading';
const PREVIEW_SELECTOR = '.preview';
const CLIPBOARD_PROPERTY = 'clipboard';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Renders the configurator at the result. */
async function renderResult(): Promise<ComponentFixture<ConfiguratorPage>> {
  serveSampleFiles();

  const state = TestBed.inject(ConfiguratorState);
  const result = STEPS.find(({ id }) => id === StepId.Result);

  if (result !== undefined) {
    state.goTo(result);
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

/** The first element of the selector. */
function elementOf(fixture: ComponentFixture<ConfiguratorPage>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);

  if (element === null) {
    throw new Error(`No element ${selector}`);
  }

  return element;
}

/** The texts of the elements of the selector, with whitespace as single spaces. */
function textsOf(fixture: ComponentFixture<ConfiguratorPage>, selector: string): string[] {
  const elements = (fixture.nativeElement as HTMLElement).querySelectorAll(selector);

  return Array.from(elements, (element) => element.textContent?.replace(/\s+/g, ' ').trim());
}

/** Gives the page a clipboard that copies, or one that the browser does not allow. */
function useClipboard(allows: boolean): ReturnType<typeof vi.fn> {
  const writeText = allows ? vi.fn().mockResolvedValue(undefined) : vi.fn().mockRejectedValue(0);

  Object.defineProperty(navigator, CLIPBOARD_PROPERTY, {
    value: { writeText },
    configurable: true,
  });

  return writeText;
}

/** Chooses a few options of several kinds. */
function chooseOptions(): void {
  const state = TestBed.inject(ConfiguratorState);

  state.setOption('colorMode', DiffwiseColorMode.Dark);
  state.setOption('contextLines', 5);
  state.setOption('allowedUserSettings', []);
}

describe('ResultStep', () => {
  it('shows the configuration of the chosen options, and lists them in place of the preview', async () => {
    chooseOptions();

    const fixture = await renderResult();
    const options = TestBed.inject(ConfiguratorState).resultOptions();

    expect(elementOf(fixture, CODE_SELECTOR).textContent).toBe(
      configCode(options, ConfigForm.PlainObject),
    );
    expect(textsOf(fixture, CHANGES_HEADING_SELECTOR)).toEqual(['Changed options: 3']);
    expect(textsOf(fixture, CHANGE_SELECTOR)).toEqual([
      'Theme: Dark',
      'Lines around changes: 5 lines',
      'Options for the user: None',
    ]);
    expect(elementOf(fixture, PREVIEW_SELECTOR).hidden).toBe(true);
  });

  it('shows the configuration as a DiffwiseConfig on request', async () => {
    chooseOptions();

    const fixture = await renderResult();
    const [, classForm] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        FORM_BUTTON_SELECTOR,
      ),
    );

    classForm.click();
    await settle(fixture);

    expect(classForm.getAttribute('aria-pressed')).toBe('true');
    expect(elementOf(fixture, CODE_SELECTOR).textContent).toContain(
      'colorMode: DiffwiseColorMode.Dark',
    );
  });

  it('copies the configuration and says so, or selects it when the browser does not allow it', async () => {
    chooseOptions();

    const fixture = await renderResult();
    const copy = elementOf(fixture, COPY_BUTTON_SELECTOR);
    const writeText = useClipboard(true);

    copy.click();
    await settle(fixture);

    expect(writeText).toHaveBeenCalledWith(elementOf(fixture, CODE_SELECTOR).textContent);
    expect(copy.textContent?.trim()).toBe('Copied');

    useClipboard(false);
    copy.click();
    await settle(fixture);

    expect(document.getSelection()?.toString()).toContain('provideDiffwise');
  });

  it('goes back to the step of an option to change it', async () => {
    chooseOptions();

    const fixture = await renderResult();

    elementOf(fixture, EDIT_BUTTON_SELECTOR).click();
    await settle(fixture);

    expect(textsOf(fixture, HEADING_SELECTOR)).toEqual(['1. General']);
  });

  it('leaves out the options of a diff the app does not show', async () => {
    const state = TestBed.inject(ConfiguratorState);

    state.setOption('ignoreFormatting', true);
    state.appDiffs.set(AppDiffs.Text);

    const fixture = await renderResult();

    expect(elementOf(fixture, CODE_SELECTOR).textContent).not.toContain('ignoreFormatting');
    expect(textsOf(fixture, EMPTY_SELECTOR)).toEqual([
      'None yet, so the configuration keeps every default.',
    ]);
  });

  it('starts over without the chosen options, at the first step', async () => {
    chooseOptions();

    const fixture = await renderResult();

    elementOf(fixture, START_OVER_SELECTOR).click();
    await settle(fixture);

    expect(TestBed.inject(ConfiguratorState).options()).toEqual({});
    expect(textsOf(fixture, HEADING_SELECTOR)).toEqual(['1. General']);
  });
});
