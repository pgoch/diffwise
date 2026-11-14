import { TestBed } from '@angular/core/testing';

import { DiffwiseColorMode, DiffwiseLayout } from '../config/option-values';
import { UserSettingsStore } from './user-settings-store';

const FIRST_KEY = 'first';
const SECOND_KEY = 'second';

describe('UserSettingsStore', () => {
  it('has no choices under a new key', () => {
    const store = TestBed.inject(UserSettingsStore);

    expect(store.choicesOf(FIRST_KEY)()).toEqual({});
  });

  it('adds each choice to the earlier ones, and a later choice of an option replaces it', () => {
    const store = TestBed.inject(UserSettingsStore);
    const choices = store.choicesOf(FIRST_KEY);

    store.choose(FIRST_KEY, { layout: DiffwiseLayout.Inline });
    store.choose(FIRST_KEY, { colorMode: DiffwiseColorMode.Dark });
    store.choose(FIRST_KEY, { layout: DiffwiseLayout.SideBySide });

    expect(choices()).toEqual({
      layout: DiffwiseLayout.SideBySide,
      colorMode: DiffwiseColorMode.Dark,
    });
    expect(Object.isFrozen(choices())).toBe(true);
  });

  it('keeps the choices of each key apart, and resets only those of one key', () => {
    const store = TestBed.inject(UserSettingsStore);

    store.choose(FIRST_KEY, { layout: DiffwiseLayout.Inline });
    store.choose(SECOND_KEY, { colorMode: DiffwiseColorMode.Light });
    store.reset(FIRST_KEY);

    expect(store.choicesOf(FIRST_KEY)()).toEqual({});
    expect(store.choicesOf(SECOND_KEY)()).toEqual({ colorMode: DiffwiseColorMode.Light });
  });
});
