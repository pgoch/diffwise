import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ColorScheme } from './color-scheme';
import { DiffwiseConfig } from './config/diffwise-config';
import { DiffwiseColorMode, DiffwiseVersionHeaders } from './config/option-values';
import { provideDiffwise } from './config/provide-diffwise';
import { Diffwise } from './diffwise';

describe('Diffwise', () => {
  it('has the defaults without provideDiffwise()', () => {
    expect(TestBed.inject(Diffwise).config()).toEqual(new DiffwiseConfig());
  });

  it('starts with the configuration from provideDiffwise()', () => {
    TestBed.configureTestingModule({ providers: [provideDiffwise({ showLineNumbers: false })] });

    expect(TestBed.inject(Diffwise).config().showLineNumbers).toBe(false);
  });

  it('takes a DiffwiseConfig in provideDiffwise()', () => {
    const config = new DiffwiseConfig({ versionHeaders: DiffwiseVersionHeaders.Icons });

    TestBed.configureTestingModule({ providers: [provideDiffwise(config)] });

    expect(TestBed.inject(Diffwise).config().versionHeaders).toBe(DiffwiseVersionHeaders.Icons);
  });

  it('changes only the given options with updateConfig(), and signals the change', () => {
    TestBed.configureTestingModule({ providers: [provideDiffwise({ ignoreCase: true })] });

    const diffwise = TestBed.inject(Diffwise);
    const showLineNumbers = computed(() => diffwise.config().showLineNumbers);

    expect(showLineNumbers()).toBe(true);

    diffwise.updateConfig({ showLineNumbers: false });

    expect(showLineNumbers()).toBe(false);
    expect(diffwise.config().ignoreCase).toBe(true);
  });

  it('takes away custom texts and colors with null in updateConfig()', () => {
    const diffwise = TestBed.inject(Diffwise);

    diffwise.updateConfig({
      customTexts: { oldVersionLabel: 'Before the changes' },
      diffColors: { dark: { addedAccent: '#5eead4' } },
    });
    diffwise.updateConfig({ customTexts: null, diffColors: null });

    expect(diffwise.config().customTexts).toEqual({});
    expect(diffwise.config().diffColors).toEqual({});
  });

  it('switches the color mode of the global configuration', () => {
    const diffwise = TestBed.inject(Diffwise);

    diffwise.switchToDarkMode();

    expect(diffwise.config().colorMode).toBe(DiffwiseColorMode.Dark);

    diffwise.switchToLightMode();

    expect(diffwise.config().colorMode).toBe(DiffwiseColorMode.Light);

    diffwise.switchToAutoMode();

    expect(diffwise.config().colorMode).toBe(DiffwiseColorMode.Auto);
  });

  it('toggles to the theme the diffs do not show now', () => {
    const darkPage = { autoModeIsDark: () => true };

    TestBed.configureTestingModule({ providers: [{ provide: ColorScheme, useValue: darkPage }] });

    const diffwise = TestBed.inject(Diffwise);

    diffwise.toggleDarkMode();

    expect(diffwise.config().colorMode).toBe(DiffwiseColorMode.Light);

    diffwise.toggleDarkMode();

    expect(diffwise.config().colorMode).toBe(DiffwiseColorMode.Dark);
  });
});
