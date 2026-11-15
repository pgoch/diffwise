import { APP_BASE_HREF } from '@angular/common';
import { MOCK_PLATFORM_LOCATION_CONFIG } from '@angular/common/testing';
import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  DiffwiseColorMode,
  DiffwiseLayout,
  DiffwisePalette,
  DiffwiseUserSetting,
} from '../config/option-values';
import { UserSettingsStore } from './user-settings-store';

const FIRST_KEY = 'first';
const SECOND_KEY = 'second';
const FIRST_ENTRY = 'diffwise:user-settings:first';
const ADMIN_PATH = '/admin/';
const ROOT_PATH = '/';
const REMEMBERS = true;
const FORGETS = false;

/** The choices saved under the first key, as the store writes them; `null` without an entry. */
function savedUnderFirstKey(): unknown {
  const text = localStorage.getItem(FIRST_ENTRY);
  return text === null ? null : JSON.parse(text);
}

afterEach(() => {
  localStorage.clear();
});

describe('UserSettingsStore', () => {
  it('has no choices under a new key', () => {
    const store = TestBed.inject(UserSettingsStore);

    expect(store.choicesOf(FIRST_KEY, FORGETS)).toEqual({});
    expect(store.choicesOf(FIRST_KEY, REMEMBERS)).toEqual({});
  });

  it('adds each choice to the earlier ones, and a later choice of an option replaces it', () => {
    const store = TestBed.inject(UserSettingsStore);
    const choices = computed(() => store.choicesOf(FIRST_KEY, FORGETS));

    store.choose(FIRST_KEY, { layout: DiffwiseLayout.Inline }, FORGETS);
    store.choose(FIRST_KEY, { colorMode: DiffwiseColorMode.Dark }, FORGETS);
    store.choose(FIRST_KEY, { layout: DiffwiseLayout.SideBySide }, FORGETS);

    expect(choices()).toEqual({
      layout: DiffwiseLayout.SideBySide,
      colorMode: DiffwiseColorMode.Dark,
    });
    expect(Object.isFrozen(choices())).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('takes back the choice of one option, also from the saved choices', () => {
    const store = TestBed.inject(UserSettingsStore);
    const choices = computed(() => store.choicesOf(FIRST_KEY, REMEMBERS));

    store.choose(
      FIRST_KEY,
      { diffPalette: DiffwisePalette.HighContrast, layout: DiffwiseLayout.Inline },
      REMEMBERS,
    );
    store.withdraw(FIRST_KEY, DiffwiseUserSetting.DiffPalette, REMEMBERS);

    expect(choices()).toEqual({ layout: DiffwiseLayout.Inline });
    expect(Object.isFrozen(choices())).toBe(true);
    expect(savedUnderFirstKey()).toEqual({
      version: 1,
      settings: { layout: DiffwiseLayout.Inline },
    });
  });

  it('keeps the choices of each key apart, and resets only those of one key', () => {
    const store = TestBed.inject(UserSettingsStore);

    store.choose(FIRST_KEY, { layout: DiffwiseLayout.Inline }, FORGETS);
    store.choose(SECOND_KEY, { colorMode: DiffwiseColorMode.Light }, FORGETS);
    store.reset(FIRST_KEY);

    expect(store.choicesOf(FIRST_KEY, FORGETS)).toEqual({});
    expect(store.choicesOf(SECOND_KEY, FORGETS)).toEqual({ colorMode: DiffwiseColorMode.Light });
  });

  it('saves the remembered choices after each change, and reads them in the next run', () => {
    TestBed.inject(UserSettingsStore).choose(
      FIRST_KEY,
      { layout: DiffwiseLayout.Inline },
      REMEMBERS,
    );

    expect(savedUnderFirstKey()).toEqual({
      version: 1,
      settings: { layout: DiffwiseLayout.Inline },
    });

    TestBed.resetTestingModule();
    const store = TestBed.inject(UserSettingsStore);

    expect(store.choicesOf(FIRST_KEY, FORGETS)).toEqual({});
    expect(store.choicesOf(FIRST_KEY, REMEMBERS)).toEqual({ layout: DiffwiseLayout.Inline });
  });

  it('adds a choice to the saved ones', () => {
    TestBed.inject(UserSettingsStore).choose(
      FIRST_KEY,
      { layout: DiffwiseLayout.Inline },
      REMEMBERS,
    );
    TestBed.resetTestingModule();

    TestBed.inject(UserSettingsStore).choose(
      FIRST_KEY,
      { colorMode: DiffwiseColorMode.Dark },
      REMEMBERS,
    );

    expect(savedUnderFirstKey()).toEqual({
      version: 1,
      settings: { layout: DiffwiseLayout.Inline, colorMode: DiffwiseColorMode.Dark },
    });
  });

  it('saves the choices made before remembering them, when asked', () => {
    const store = TestBed.inject(UserSettingsStore);

    store.saveChanged(FIRST_KEY);

    expect(localStorage.length).toBe(0);

    store.choose(FIRST_KEY, { colorMode: DiffwiseColorMode.Dark }, FORGETS);
    store.saveChanged(FIRST_KEY);

    expect(savedUnderFirstKey()).toEqual({
      version: 1,
      settings: { colorMode: DiffwiseColorMode.Dark },
    });
  });

  it('puts imported choices in place of the current ones', () => {
    const store = TestBed.inject(UserSettingsStore);

    store.choose(FIRST_KEY, { layout: DiffwiseLayout.Inline }, FORGETS);
    store.replace(FIRST_KEY, { colorMode: DiffwiseColorMode.Light }, REMEMBERS);

    expect(store.choicesOf(FIRST_KEY, FORGETS)).toEqual({ colorMode: DiffwiseColorMode.Light });
    expect(savedUnderFirstKey()).toEqual({
      version: 1,
      settings: { colorMode: DiffwiseColorMode.Light },
    });
  });

  it('takes the choices out of localStorage on a reset, so the saved ones do not come back', () => {
    TestBed.inject(UserSettingsStore).choose(
      FIRST_KEY,
      { layout: DiffwiseLayout.Inline },
      REMEMBERS,
    );
    TestBed.resetTestingModule();
    const store = TestBed.inject(UserSettingsStore);

    store.reset(FIRST_KEY);

    expect(store.choicesOf(FIRST_KEY, REMEMBERS)).toEqual({});
    expect(localStorage.getItem(FIRST_ENTRY)).toBeNull();
  });

  it('takes the given key, or the base path of the app', () => {
    const store = TestBed.inject(UserSettingsStore);

    expect(store.keyOf(FIRST_KEY)).toBe(FIRST_KEY);
    expect(store.keyOf(null)).toBe(ROOT_PATH);
  });

  it('takes the base path from APP_BASE_HREF', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: APP_BASE_HREF, useValue: ADMIN_PATH }],
    });

    expect(TestBed.inject(UserSettingsStore).keyOf(null)).toBe(ADMIN_PATH);
  });

  it('takes the base path from the base element of the page, as Angular reads it', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MOCK_PLATFORM_LOCATION_CONFIG, useValue: { appBaseHref: ADMIN_PATH } },
      ],
    });

    expect(TestBed.inject(UserSettingsStore).keyOf(null)).toBe(ADMIN_PATH);
  });
});
