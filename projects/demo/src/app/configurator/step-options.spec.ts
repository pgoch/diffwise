import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  type DiffwiseConfigOptions,
  DiffwiseHtml,
  DiffwiseUserSetting,
  diffwisePolish,
  provideDiffwiseLanguages,
} from 'ngx-diffwise';

import { DEFAULT_OPTIONS } from '../diff-options';
import { serveSampleFiles } from '../../testing/sample-files';
import { AppDiffs, ConfiguratorState } from './configurator-state';
import { ConfiguratorPage } from './configurator-page';
import { type ConfiguratorStep, OptionKind, STEPS, StepId, type StepOption } from './steps';

const OPTION_SELECTOR = 'demo-option-control';
const OPTION_NAME_SELECTOR = '.option-name';
const OPTION_DOT_SELECTOR = '.option-dot';
const OPTION_NOTE_SELECTOR = '.option-note';
const HOW_TO_BUTTON_SELECTOR = '.option-info';
const HOW_TO_SELECTOR = '.option-how-to';
const ARIA_EXPANDED_ATTRIBUTE = 'aria-expanded';
const CHOICE_SELECTOR = '.option-choice';
const STEP_DOT_SELECTOR = '.flow-steps .flow-dot';
const INPUT_SELECTOR = 'input';
const SELECT_SELECTOR = 'select';
const CHECK_SELECTOR = '.check';
const FONT_NAME_SELECTOR = '.field-row input';
const HEADER_SELECTOR = '.preview .diffwise-diff__version-header';
const VIEW_BUTTON_SELECTOR = '.preview .diffwise-diff__view-button';
const DARK_THEME_CLASS = 'diffwise-diff--dark-theme';
const INPUT_EVENT = 'input';
const CHANGE_EVENT = 'change';
const GENERAL_STEP = 'General';
const CHANGED_WORDS = '(changed)';

/** Options the preview does not take from the choices: it keeps its own key and never remembers. */
const PREVIEW_OWN_OPTIONS = new Set(['userSettingsKey', 'rememberUserSettings']);

afterEach(() => {
  vi.restoreAllMocks();
});

/** The step with the id. */
function stepOf(stepId: StepId): ConfiguratorStep {
  const step = STEPS.find(({ id }) => id === stepId);

  if (step === undefined) {
    throw new Error(`No step ${stepId}`);
  }

  return step;
}

/** Renders the configurator at the step. */
async function render(stepId: StepId): Promise<ComponentFixture<ConfiguratorPage>> {
  serveSampleFiles();
  TestBed.inject(ConfiguratorState).goTo(stepOf(stepId));

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

/** The name of an option control, without the words that say it changed. */
function nameOf(control: Element): string {
  const name = control.querySelector(OPTION_NAME_SELECTOR)?.textContent ?? '';

  return name.replace(CHANGED_WORDS, '').trim();
}

/** The option control with the name. */
function optionNamed(fixture: ComponentFixture<ConfiguratorPage>, name: string): HTMLElement {
  const element = fixture.nativeElement as HTMLElement;
  const controls = Array.from(element.querySelectorAll<HTMLElement>(OPTION_SELECTOR));
  const control = controls.find((candidate) => nameOf(candidate) === name);

  if (control === undefined) {
    throw new Error(`No option named ${name}`);
  }

  return control;
}

/** The names of the options that show. */
function optionNames(fixture: ComponentFixture<ConfiguratorPage>): string[] {
  const element = fixture.nativeElement as HTMLElement;

  return Array.from(element.querySelectorAll(OPTION_NAME_SELECTOR), (name) =>
    (name.textContent ?? '').replace(/\(changed\)/, '').trim(),
  );
}

/** Clicks the button with the label in the option. */
async function choose(
  fixture: ComponentFixture<ConfiguratorPage>,
  name: string,
  label: string,
): Promise<void> {
  const buttons = optionNamed(fixture, name).querySelectorAll<HTMLButtonElement>(CHOICE_SELECTOR);
  const button = Array.from(buttons).find((candidate) =>
    candidate.textContent?.trim().startsWith(label),
  );

  button?.click();
  await settle(fixture);
}

/** Writes in the field of the option. */
async function write(
  fixture: ComponentFixture<ConfiguratorPage>,
  name: string,
  text: string,
): Promise<void> {
  const field = optionNamed(fixture, name).querySelector<HTMLInputElement>(INPUT_SELECTOR);

  if (field !== null) {
    field.value = text;
    field.dispatchEvent(new Event(INPUT_EVENT));
  }

  await settle(fixture);
}

/** A choice of the option other than its default. */
function otherChoice(option: StepOption) {
  return option.choices.find(({ value }) => value !== DEFAULT_OPTIONS[option.name]);
}

/** The options with buttons in the steps, with their step. */
const BUTTON_OPTIONS = STEPS.flatMap((step) =>
  step.options
    .filter((option) => option.kind === OptionKind.Buttons)
    .map((option) => ({ step, option })),
);

describe('StepOptions', () => {
  it('shows the options of a step, each with its sentence', async () => {
    const fixture = await render(StepId.Lines);

    expect(optionNames(fixture)).toEqual([
      'Line numbers',
      'Numbers of changed lines',
      'Numbers in their lines',
      'Background of changed lines',
      'Whole added and removed lines',
      'Hide unchanged lines',
      'Lines around changes',
      'Wrap lines',
      'All spaces and tabs',
    ]);
  });

  for (const { step, option } of BUTTON_OPTIONS) {
    it(`gives the preview the option ${option.name} of the step ${step.label}`, async () => {
      const fixture = await render(step.id);
      const choice = otherChoice(option);
      const condition = option.enabledWhen;

      if (condition !== null) {
        TestBed.inject(ConfiguratorState).setOption(
          condition.option,
          condition.values[0] as DiffwiseConfigOptions[typeof condition.option],
        );
        await settle(fixture);
      }

      await choose(fixture, option.label, choice?.label ?? '');

      const expected = PREVIEW_OWN_OPTIONS.has(option.name)
        ? TestBed.inject(ConfiguratorState).options()[option.name]
        : previewConfig(fixture)[option.name];

      expect(expected).toEqual(choice?.value);
    });
  }

  it('gives the preview numbers, texts and lists', async () => {
    const fixture = await render(StepId.Fonts);

    await write(fixture, 'Header size', '1.25');

    expect(previewConfig(fixture).versionHeaderFontSize).toBe(1.25);

    await write(fixture, 'Header size', '20');

    expect(previewConfig(fixture).versionHeaderFontSize).toBe(1.25);

    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.Colors));
    await settle(fixture);
    await write(fixture, 'Dark mode of your app', ' .dark ');

    expect(previewConfig(fixture).darkModeSelector).toBe('.dark');

    await write(fixture, 'Dark mode of your app', '');

    expect(previewConfig(fixture).darkModeSelector).toBeNull();
  });

  it('shows the preview in the chosen language', async () => {
    TestBed.configureTestingModule({ providers: [provideDiffwiseLanguages(diffwisePolish)] });

    const fixture = await render(StepId.General);
    const select = optionNamed(fixture, 'Language').querySelector<HTMLSelectElement>(
      SELECT_SELECTOR,
    );

    if (select !== null) {
      select.value = 'pl';
      select.dispatchEvent(new Event(CHANGE_EVENT));
    }

    await settle(fixture);

    const element = fixture.nativeElement as HTMLElement;
    const headers = Array.from(element.querySelectorAll(HEADER_SELECTOR), (header) =>
      header.textContent?.trim(),
    );

    expect(headers).toEqual(['Poprzednia wersja', 'Nowa wersja']);
  });

  it('shows the dark theme in the preview at once', async () => {
    const fixture = await render(StepId.General);

    await choose(fixture, 'Theme', 'Dark');

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector(`.preview diffwise-html.${DARK_THEME_CLASS}`)).not.toBeNull();
  });

  it('shows the headers of an app, and starts with a font name', async () => {
    const fixture = await render(StepId.Layout);

    await choose(fixture, 'Header content', 'Texts of your app');

    expect(previewConfig(fixture).versionHeaders).toEqual({ old: 'Version 3', new: 'Version 4' });

    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.Fonts));
    await settle(fixture);
    await choose(fixture, 'Font', 'Named font');

    expect(previewConfig(fixture).fontFamily).toBe('Inter');

    const fontName = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      FONT_NAME_SELECTOR,
    );

    if (fontName !== null) {
      fontName.value = 'Georgia';
      fontName.dispatchEvent(new Event(INPUT_EVENT));
    }

    await settle(fixture);

    expect(previewConfig(fixture).fontFamily).toBe('Georgia');
  });

  it('lets the user change only the ticked options, and hides the button without any', async () => {
    const fixture = await render(StepId.ViewSettings);
    const checks = () =>
      Array.from(
        optionNamed(fixture, 'Options for the user').querySelectorAll<HTMLElement>(CHECK_SELECTOR),
      );

    for (const check of checks()) {
      check.querySelector(INPUT_SELECTOR)?.click();
    }

    await settle(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(previewConfig(fixture).allowedUserSettings).toEqual([]);
    expect(element.querySelector(VIEW_BUTTON_SELECTOR)).toBeNull();

    checks()[1].querySelector(INPUT_SELECTOR)?.click();
    await settle(fixture);

    expect(previewConfig(fixture).allowedUserSettings).toEqual([DiffwiseUserSetting.DiffPalette]);
  });

  it('marks a changed option and its step, and takes back an option set to its default', async () => {
    const fixture = await render(StepId.General);
    const element = fixture.nativeElement as HTMLElement;

    await choose(fixture, 'Theme', 'Dark');

    expect(optionNamed(fixture, 'Theme').querySelector(OPTION_DOT_SELECTOR)).not.toBeNull();
    expect(element.querySelectorAll(STEP_DOT_SELECTOR)).toHaveLength(1);
    expect(element.querySelector(STEP_DOT_SELECTOR)?.closest('button')?.textContent).toContain(
      GENERAL_STEP,
    );

    await choose(fixture, 'Theme', 'Auto');

    expect(optionNamed(fixture, 'Theme').querySelector(OPTION_DOT_SELECTOR)).toBeNull();
    expect(element.querySelectorAll(STEP_DOT_SELECTOR)).toHaveLength(0);
    expect(TestBed.inject(ConfiguratorState).options()).toEqual({});
  });

  it('gathers the diffs, the theme, the layout, the language, the toolbar and the headers first', async () => {
    const fixture = await render(StepId.General);

    expect(optionNames(fixture)).toEqual([
      'Diffs in your app',
      'Theme',
      'Layout',
      'Language',
      'Toolbar',
      'Headers',
    ]);
  });

  it('disables the changes in a single column with the versions side by side', async () => {
    const fixture = await render(StepId.General);
    const singleColumn = () => optionNamed(fixture, 'Changes in a single column');

    await choose(fixture, 'Layout', 'Side by side');
    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.Layout));
    await settle(fixture);

    expect(singleColumn().querySelector(OPTION_NOTE_SELECTOR)?.textContent).toBe(
      'Only with the layout Auto or Single column in the step General.',
    );

    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.General));
    await settle(fixture);
    await choose(fixture, 'Layout', 'Single column');
    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.Layout));
    await settle(fixture);

    expect(singleColumn().querySelector(OPTION_NOTE_SELECTOR)).toBeNull();
  });

  it('disables an option that works only with another one, with a note why', async () => {
    const fixture = await render(StepId.Lines);
    const contextLines = () => optionNamed(fixture, 'Lines around changes');

    expect(contextLines().querySelector<HTMLInputElement>(INPUT_SELECTOR)?.disabled).toBe(true);
    expect(contextLines().querySelector(OPTION_NOTE_SELECTOR)?.textContent).toBe(
      'Only when unchanged lines are hidden.',
    );

    await choose(fixture, 'Hide unchanged lines', 'On');

    expect(contextLines().querySelector<HTMLInputElement>(INPUT_SELECTOR)?.disabled).toBe(false);
    expect(contextLines().querySelector(OPTION_NOTE_SELECTOR)).toBeNull();
  });

  it('disables the header options without headers', async () => {
    const fixture = await render(StepId.General);
    const alignment = () => optionNamed(fixture, 'Header alignment');

    await choose(fixture, 'Headers', 'Hidden');

    expect(previewConfig(fixture).showVersionHeaders).toBe(false);

    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.Layout));
    await settle(fixture);

    expect(alignment().querySelector(OPTION_NOTE_SELECTOR)?.textContent).toBe(
      'Only with the headers shown in the step General.',
    );
    expect(alignment().querySelector<HTMLButtonElement>(CHOICE_SELECTOR)?.disabled).toBe(true);
    expect(
      optionNamed(fixture, 'Header content').querySelector<HTMLButtonElement>(CHOICE_SELECTOR)
        ?.disabled,
    ).toBe(true);

    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.Fonts));
    await settle(fixture);

    const size = optionNamed(fixture, 'Header size').querySelector<HTMLInputElement>(
      INPUT_SELECTOR,
    );

    expect(size?.disabled).toBe(true);
  });

  it('disables the options of the toolbar without the toolbar', async () => {
    const fixture = await render(StepId.General);
    const arrows = () => optionNamed(fixture, 'Arrows between changes');

    await choose(fixture, 'Toolbar', 'Hidden');

    expect(previewConfig(fixture).showToolbar).toBe(false);

    TestBed.inject(ConfiguratorState).goTo(stepOf(StepId.Toolbar));
    await settle(fixture);

    expect(arrows().querySelector(OPTION_NOTE_SELECTOR)?.textContent).toBe(
      'Only with the toolbar shown in the step General.',
    );
    expect(
      optionNamed(fixture, 'Numbers of changes').querySelector<HTMLButtonElement>(CHOICE_SELECTOR)
        ?.disabled,
    ).toBe(true);
  });

  it('shows under the sentence of each option how to check it, and hides it again', async () => {
    const fixture = await render(StepId.ViewSettings);
    const element = fixture.nativeElement as HTMLElement;
    const key = optionNamed(fixture, 'Key of the choices');
    const button = key.querySelector<HTMLButtonElement>(HOW_TO_BUTTON_SELECTOR);
    const howTo = key.querySelector<HTMLElement>(HOW_TO_SELECTOR);

    expect(element.querySelectorAll(HOW_TO_BUTTON_SELECTOR)).toHaveLength(3);
    expect(button?.getAttribute('aria-label')).toBe('How to check: Key of the choices');
    expect(button?.title).toBe('Click to see more info');
    expect(button?.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe('false');
    expect(howTo?.hidden).toBe(true);

    button?.click();
    await settle(fixture);

    expect(button?.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe('true');
    expect(button?.getAttribute('aria-controls')).toBe(howTo?.id);
    expect(howTo?.hidden).toBe(false);
    expect(howTo?.textContent).toContain('The preview is a single diff, so it cannot show this.');

    button?.click();
    await settle(fixture);

    expect(howTo?.hidden).toBe(true);
  });

  it('leaves out the options of a diff the app does not show', async () => {
    const state = TestBed.inject(ConfiguratorState);

    state.appDiffs.set(AppDiffs.Html);

    const fixture = await render(StepId.Fonts);

    expect(optionNames(fixture)).not.toContain('Text font');

    state.goTo(stepOf(StepId.Lines));
    await settle(fixture);

    expect(optionNames(fixture)).not.toContain('Wrap lines');
    expect(optionNames(fixture)).not.toContain('All spaces and tabs');

    state.goTo(stepOf(StepId.ViewSettings));
    await settle(fixture);

    expect(optionNamed(fixture, 'Options for the user').textContent).not.toContain('Text font');
    expect(optionNamed(fixture, 'Options for the user').textContent).not.toContain('Wrap lines');

    state.appDiffs.set(AppDiffs.Text);
    state.goTo(stepOf(StepId.Comparison));
    await settle(fixture);

    expect(optionNames(fixture)).toEqual([
      'Ignore whitespace',
      'Ignore blank lines',
      'Ignore letter case',
    ]);
  });

  it('starts the choices of the view settings of the preview over after each change', async () => {
    const fixture = await render(StepId.General);
    const firstKey = previewConfig(fixture).userSettingsKey;

    await choose(fixture, 'Theme', 'Light');

    expect(previewConfig(fixture).userSettingsKey).not.toBe(firstKey);
    expect(previewConfig(fixture).rememberUserSettings).toBe(false);
  });
});
