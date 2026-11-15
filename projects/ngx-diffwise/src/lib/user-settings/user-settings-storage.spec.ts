import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DiffwiseColorMode, DiffwiseLayout } from '../config/option-values';
import { UserSettingsStorage } from './user-settings-storage';

const KEY = '/reports/';
const ENTRY = 'diffwise:user-settings:/reports/';
const SERVER_PLATFORM = 'server';
const WARN_METHOD = 'warn';
const GET_ITEM_METHOD = 'getItem';
const SET_ITEM_METHOD = 'setItem';
const REMOVE_ITEM_METHOD = 'removeItem';
const QUOTA_ERROR = 'QuotaExceededError';
const SECURITY_ERROR = 'SecurityError';

/** The value saved in the entry; `null` without the entry. */
function savedEntry(): unknown {
  const text = localStorage.getItem(ENTRY);
  return text === null ? null : JSON.parse(text);
}

function saveEntry(value: unknown): void {
  localStorage.setItem(ENTRY, JSON.stringify(value));
}

/** Makes localStorage fail as a browser that blocks it does. */
function blockStorage(): void {
  const error = new DOMException(SECURITY_ERROR, SECURITY_ERROR);

  for (const method of [GET_ITEM_METHOD, SET_ITEM_METHOD, REMOVE_ITEM_METHOD] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw error;
    });
  }
}

beforeEach(() => {
  vi.spyOn(console, WARN_METHOD).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('UserSettingsStorage', () => {
  it('writes the choices with the number of their format, and reads them back', () => {
    const storage = TestBed.inject(UserSettingsStorage);
    const choices = { layout: DiffwiseLayout.Inline, hideUnchangedLines: true };

    storage.write(KEY, choices);

    expect(savedEntry()).toEqual({ version: 1, settings: choices });
    expect(storage.read(KEY)).toEqual(choices);
  });

  it('has no choices under a key without an entry, or after removing it', () => {
    const storage = TestBed.inject(UserSettingsStorage);

    expect(storage.read(KEY)).toEqual({});

    storage.write(KEY, { colorMode: DiffwiseColorMode.Dark });
    storage.remove(KEY);

    expect(storage.read(KEY)).toEqual({});
    expect(localStorage.getItem(ENTRY)).toBeNull();
  });

  it('leaves out saved options the user cannot change and invalid values, with a warning', () => {
    saveEntry({
      version: 1,
      settings: { layout: 'columns', colorMode: DiffwiseColorMode.Dark, fontFamily: 'Inter' },
    });

    expect(TestBed.inject(UserSettingsStorage).read(KEY)).toEqual({
      colorMode: DiffwiseColorMode.Dark,
    });
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('ignores an entry in a format of an unknown version, or not in the format, with a warning', () => {
    const storage = TestBed.inject(UserSettingsStorage);
    const entries = [
      JSON.stringify({ version: 2, settings: { layout: DiffwiseLayout.Inline } }),
      JSON.stringify({ layout: DiffwiseLayout.Inline }),
      JSON.stringify([1]),
      '{"version":1,',
    ];

    for (const entry of entries) {
      localStorage.setItem(ENTRY, entry);

      expect(storage.read(KEY)).toEqual({});
    }

    expect(console.warn).toHaveBeenCalledTimes(entries.length);
  });

  it('keeps nothing, without errors, when the browser blocks localStorage or it is full', () => {
    const storage = TestBed.inject(UserSettingsStorage);

    blockStorage();

    expect(() => storage.write(KEY, { layout: DiffwiseLayout.Inline })).not.toThrow();
    expect(() => storage.remove(KEY)).not.toThrow();
    expect(storage.read(KEY)).toEqual({});

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, SET_ITEM_METHOD).mockImplementation(() => {
      throw new DOMException(QUOTA_ERROR, QUOTA_ERROR);
    });

    expect(() => storage.write(KEY, { layout: DiffwiseLayout.Inline })).not.toThrow();
  });

  it('neither reads nor writes on the server', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: SERVER_PLATFORM }],
    });
    saveEntry({ version: 1, settings: { layout: DiffwiseLayout.Inline } });

    const getItem = vi.spyOn(Storage.prototype, GET_ITEM_METHOD);
    const setItem = vi.spyOn(Storage.prototype, SET_ITEM_METHOD);
    const storage = TestBed.inject(UserSettingsStorage);

    storage.write(KEY, { colorMode: DiffwiseColorMode.Dark });

    expect(storage.read(KEY)).toEqual({});
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
