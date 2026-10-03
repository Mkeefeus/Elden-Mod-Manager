import { describe, expect, it } from 'vitest';
import { getGeneralSettings, getLastPage, setGeneralSettings, setLastPage } from '@backend/db/api';
import { addGeneralSettings } from '@backend/db/migrations/002-general-settings';
import { openTestStore, readTestConfig } from '../../helpers/store';
import { ALL_GENERAL_SETTINGS_ON as ALL_ON } from '../../helpers/fixtures';

describe('general settings defaults', () => {
  it('returns every setting on for a fresh install', () => {
    openTestStore();
    expect(getGeneralSettings()).toEqual(ALL_ON);
  });

  it('fills in settings missing from an existing generalSettings object', () => {
    // e.g. a config saved before a newer setting was added
    openTestStore({ generalSettings: { rememberLastPage: false } });
    expect(getGeneralSettings()).toEqual({ ...ALL_ON, rememberLastPage: false });
  });
});

describe('setGeneralSettings', () => {
  it('persists the settings so they read back unchanged', () => {
    openTestStore();
    const next = { rememberLastPage: false, checkForModUpdatesOnStartup: false, checkForAppUpdatesOnStartup: true };
    setGeneralSettings(next);

    expect(getGeneralSettings()).toEqual(next);
    expect(readTestConfig().generalSettings).toEqual(next);
  });

  it('rejects a value of the wrong type instead of storing it', () => {
    openTestStore();
    const bad = { ...ALL_ON, rememberLastPage: 'yes' } as unknown as typeof ALL_ON;

    expect(() => setGeneralSettings(bad)).toThrow(/setting general settings/);
    expect(getGeneralSettings()).toEqual(ALL_ON);
  });
});

describe('getLastPage', () => {
  it('returns the saved page while remember last page is on', () => {
    openTestStore();
    setLastPage('/tools');
    expect(getLastPage()).toBe('/tools');
  });

  it('returns Home even when a page is saved, once remember last page is off', () => {
    openTestStore();
    setLastPage('/tools');
    setGeneralSettings({ ...ALL_ON, rememberLastPage: false });
    expect(getLastPage()).toBe('/');
  });
});

describe('migration 002: add-general-settings', () => {
  it('moves rememberLastPage: false into generalSettings and removes the old key', () => {
    openTestStore({ rememberLastPage: false });

    expect(addGeneralSettings.run()).toBe(true);

    expect(getGeneralSettings()).toEqual({ ...ALL_ON, rememberLastPage: false });
    const config = readTestConfig();
    expect(config).not.toHaveProperty('rememberLastPage');
    expect(config.generalSettings).toEqual({ ...ALL_ON, rememberLastPage: false });
  });

  it('moves rememberLastPage: true as well', () => {
    openTestStore({ rememberLastPage: true });

    expect(addGeneralSettings.run()).toBe(true);

    expect(getGeneralSettings()).toEqual(ALL_ON);
    expect(readTestConfig()).not.toHaveProperty('rememberLastPage');
  });

  it('keeps other settings that already exist in generalSettings', () => {
    openTestStore({ rememberLastPage: false, generalSettings: { checkForModUpdatesOnStartup: false } });

    addGeneralSettings.run();

    expect(getGeneralSettings()).toEqual({
      rememberLastPage: false,
      checkForModUpdatesOnStartup: false,
      checkForAppUpdatesOnStartup: true,
    });
  });

  it('does nothing when there is no legacy key', () => {
    openTestStore();
    expect(addGeneralSettings.run()).toBe(false);
    expect(getGeneralSettings()).toEqual(ALL_ON);
  });

  it('is idempotent: running again after migrating changes nothing', () => {
    openTestStore({ rememberLastPage: false });

    expect(addGeneralSettings.run()).toBe(true);
    const afterFirstRun = readTestConfig();

    expect(addGeneralSettings.run()).toBe(false);
    expect(readTestConfig()).toEqual(afterFirstRun);
    expect(getGeneralSettings().rememberLastPage).toBe(false);
  });
});
