import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGeneralSettings, getProfiles } from '@backend/db/api';
import { launcherSettingsToProfiles } from '@backend/db/migrations/001-launcher-settings-to-profiles';
import { openTestStore, readTestConfig } from '../../helpers/store';

// A profile as saved before launcher settings moved onto profiles: none of the four fields exist yet
const legacyProfile = (uuid: string) => ({ uuid, name: uuid, createdAt: 1, mods: [] });

describe('migration 001: launcher-settings-to-profiles', () => {
  it('copies the old account-wide launcher settings onto every profile and removes them', () => {
    openTestStore({
      noBootBoost: true,
      showLogos: true,
      skipSteamInit: false,
      overrideExe: 'C:\\Games\\custom.exe',
      profiles: [legacyProfile('a'), legacyProfile('b')],
    });

    expect(launcherSettingsToProfiles.run()).toBe(true);

    for (const profile of getProfiles()) {
      expect(profile).toMatchObject({
        noBootBoost: true,
        showLogos: true,
        skipSteamInit: false,
        overrideExe: 'C:\\Games\\custom.exe',
      });
    }
    const config = readTestConfig();
    for (const key of ['noBootBoost', 'showLogos', 'skipSteamInit', 'overrideExe']) {
      expect(config).not.toHaveProperty(key);
    }
  });

  it('uses off as the default for settings that were never saved', () => {
    openTestStore({ profiles: [legacyProfile('a')] });

    launcherSettingsToProfiles.run();

    expect(getProfiles()[0]).toMatchObject({ noBootBoost: false, showLogos: false, skipSteamInit: false });
    expect(getProfiles()[0].overrideExe).toBeUndefined();
  });

  it('leaves profiles that already have their own settings untouched', () => {
    openTestStore({
      noBootBoost: true,
      profiles: [legacyProfile('old'), { ...legacyProfile('new'), noBootBoost: false, showLogos: true }],
    });

    launcherSettingsToProfiles.run();

    const [oldProfile, newProfile] = getProfiles();
    expect(oldProfile.noBootBoost).toBe(true);
    expect(newProfile).toMatchObject({ noBootBoost: false, showLogos: true });
  });

  it('does nothing once every profile has been migrated', () => {
    openTestStore({ profiles: [{ ...legacyProfile('a'), noBootBoost: false }] });

    expect(launcherSettingsToProfiles.run()).toBe(false);
  });
});

describe('runMigrations', () => {
  type MigrationsModule = typeof import('@backend/db/migrations');

  // The notices list lives at module level, so load a fresh copy for each test
  let migrations: MigrationsModule;
  beforeEach(async () => {
    vi.resetModules();
    migrations = await import('@backend/db/migrations');
  });

  it('upgrades a config from before both migrations and collects their notices for the UI', () => {
    openTestStore({ rememberLastPage: false, showLogos: true, profiles: [legacyProfile('a')] });

    migrations.runMigrations();

    expect(getProfiles()[0].showLogos).toBe(true);
    expect(getGeneralSettings().rememberLastPage).toBe(false);
    // Only 001 has a user-facing notice
    expect(migrations.getMigrationNotices()).toEqual([launcherSettingsToProfiles.userNotice]);
  });

  it('has nothing to report for an up-to-date config', () => {
    openTestStore({ profiles: [{ ...legacyProfile('a'), noBootBoost: false }] });

    migrations.runMigrations();

    expect(migrations.getMigrationNotices()).toEqual([]);
  });

  it('can run on every startup: a second run changes nothing', () => {
    openTestStore({ rememberLastPage: false, showLogos: true, profiles: [legacyProfile('a')] });
    migrations.runMigrations();
    const afterFirstRun = readTestConfig();

    migrations.runMigrations();

    expect(readTestConfig()).toEqual(afterFirstRun);
    expect(migrations.getMigrationNotices()).toHaveLength(1);
  });
});
