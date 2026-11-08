import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DiffwiseConfig } from './config/diffwise-config';
import { DiffwiseVersionHeaders } from './config/option-values';
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
});
