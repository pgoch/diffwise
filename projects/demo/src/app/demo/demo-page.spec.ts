import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Diffwise, DiffwiseFontFamily } from 'ngx-diffwise';

import { NEW_LINE, serveSampleFiles } from '../../testing/sample-files';
import { DemoPage } from './demo-page';

const HTML_DIFF_SELECTOR = 'diffwise-html';
const TEXT_DIFF_SELECTOR = 'diffwise-text';
const GROUP_SELECTOR = 'fieldset';
const LEGEND_SELECTOR = 'legend';
const BUTTON_SELECTOR = 'button';
const CHECK_SELECTOR = '.demo-check';
const FIELD_SELECTOR = '.demo-field';
const INPUT_SELECTOR = 'input';
const PRESSED_ATTRIBUTE = 'aria-pressed';
const PRESSED = 'true';
const DIFF_GROUP = 'Diff';
const SIZE_GROUP = 'Size';
const HEADERS_GROUP = 'Headers';
const FONT_GROUP = 'Font';
const TEXT_CHOICE = 'Text';
const MEDIUM_CHOICE = 'Medium';
const CUSTOM_TEXTS_CHOICE = 'Custom texts';
const CUSTOM_CHOICE = 'Custom';
const CUSTOM_COLORS_CHECK = 'Custom colors (example)';
const FONT_NAME_FIELD = 'Font name';
const APP_FONT = 'Inter';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Renders the demo once its sample has loaded. */
async function render(): Promise<ComponentFixture<DemoPage>> {
  serveSampleFiles();

  const fixture = TestBed.createComponent(DemoPage);

  await settle(fixture);

  return fixture;
}

/** Waits for the samples to load and for the page to show them. */
async function settle(fixture: ComponentFixture<DemoPage>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** The buttons of the group with the legend. */
function buttonsOf(fixture: ComponentFixture<DemoPage>, legend: string): HTMLButtonElement[] {
  const element = fixture.nativeElement as HTMLElement;
  const group = Array.from(element.querySelectorAll(GROUP_SELECTOR)).find(
    (fieldset) => fieldset.querySelector(LEGEND_SELECTOR)?.textContent?.trim() === legend,
  );

  return Array.from(group?.querySelectorAll(BUTTON_SELECTOR) ?? []);
}

/** The button with the label in the group with the legend. */
function buttonOf(
  fixture: ComponentFixture<DemoPage>,
  legend: string,
  label: string,
): HTMLButtonElement | undefined {
  return buttonsOf(fixture, legend).find((button) => button.textContent?.trim() === label);
}

/** Clicks the button with the label in the group with the legend. */
async function choose(
  fixture: ComponentFixture<DemoPage>,
  legend: string,
  label: string,
): Promise<void> {
  buttonOf(fixture, legend, label)?.click();
  await settle(fixture);
}

/** The input of the labeled check box or field. */
function inputOf(fixture: ComponentFixture<DemoPage>, selector: string, label: string) {
  const element = fixture.nativeElement as HTMLElement;
  const labelElement = Array.from(element.querySelectorAll(selector)).find((candidate) =>
    candidate.textContent?.includes(label),
  );

  return labelElement?.querySelector(INPUT_SELECTOR);
}

/** The text of the diff of the selector. */
function diffText(fixture: ComponentFixture<DemoPage>, selector: string): string {
  const element = fixture.nativeElement as HTMLElement;

  return element.querySelector(selector)?.textContent ?? '';
}

describe('DemoPage', () => {
  it('shows the short English HTML sample in an HTML diff', async () => {
    const fixture = await render();

    expect(diffText(fixture, HTML_DIFF_SELECTOR)).toContain('test-data/en/short');
    expect(diffText(fixture, HTML_DIFF_SELECTOR)).toContain(NEW_LINE);
  });

  it('shows the chosen plain text sample in a text diff', async () => {
    const fixture = await render();

    await choose(fixture, DIFF_GROUP, TEXT_CHOICE);
    await choose(fixture, SIZE_GROUP, MEDIUM_CHOICE);

    expect(diffText(fixture, TEXT_DIFF_SELECTOR)).toContain('test-data/text/en/medium');
    expect(diffText(fixture, HTML_DIFF_SELECTOR)).toBe('');
  });

  it('starts the panel from the global configuration, as on another visit', async () => {
    const diffwise = TestBed.inject(Diffwise);

    diffwise.updateConfig({
      versionHeaders: { old: 'Draft', new: 'Final' },
      diffColors: { light: { addedAccent: '#0f766e' } },
      fontFamily: APP_FONT,
    });

    const fixture = await render();
    const fontName = inputOf(fixture, FIELD_SELECTOR, FONT_NAME_FIELD);

    expect(
      buttonOf(fixture, HEADERS_GROUP, CUSTOM_TEXTS_CHOICE)?.getAttribute(PRESSED_ATTRIBUTE),
    ).toBe(PRESSED);
    expect(buttonOf(fixture, FONT_GROUP, CUSTOM_CHOICE)?.getAttribute(PRESSED_ATTRIBUTE)).toBe(
      PRESSED,
    );
    expect(inputOf(fixture, CHECK_SELECTOR, CUSTOM_COLORS_CHECK)?.checked).toBe(true);
    expect(fontName?.value).toBe(APP_FONT);
  });

  it('starts the panel with the defaults of the demo', async () => {
    const fixture = await render();

    expect(inputOf(fixture, CHECK_SELECTOR, CUSTOM_COLORS_CHECK)?.checked).toBe(false);
    expect(buttonOf(fixture, FONT_GROUP, 'App')?.getAttribute(PRESSED_ATTRIBUTE)).toBe(PRESSED);
    expect(TestBed.inject(Diffwise).config().fontFamily).toBe(DiffwiseFontFamily.Inherit);
  });
});
