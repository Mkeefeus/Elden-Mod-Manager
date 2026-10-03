import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import type { Mod, ModProfile, ProfileImportAnalysis } from 'types';
import { getActiveProfileId, getProfiles } from '@backend/db/api';
import {
  analyzeProfileImport,
  completeProfileImport,
  handleApplyProfile,
  handleCreateProfile,
  handleDeleteProfile,
  handleExportProfile,
  handleRenameProfile,
} from '@backend/profiles';
import { makeMod, makeProfile } from '../helpers/fixtures';
import { openTestStore } from '../helpers/store';
import { makeTempDir } from '../helpers/tempDir';

const DEFAULT = makeProfile({ uuid: 'default', name: 'Default' });

const openStoreWith = (profiles: ModProfile[], activeProfileId: string, mods: Mod[] = []) =>
  openTestStore({ profiles, activeProfileId, mods });

const profileNamed = (name: string) => getProfiles().find((profile) => profile.name === name);

describe('handleCreateProfile', () => {
  it('creates an empty profile with the active profile settings and switches to it', () => {
    openStoreWith(
      [
        makeProfile({
          ...DEFAULT,
          mods: [{ modUuid: 'm1' }],
          savefile: 'ER0001.co2',
          disableArxan: true,
          overrideExe: 'x.exe',
        }),
      ],
      'default'
    );

    const created = handleCreateProfile('Coop');

    expect(created).toMatchObject({
      name: 'Coop',
      mods: [],
      savefile: 'ER0001.co2',
      disableArxan: true,
      overrideExe: 'x.exe',
    });
    expect(getActiveProfileId()).toBe(created.uuid);
    expect(getProfiles().map((profile) => profile.name)).toEqual(['Default', 'Coop']);
  });

  it('fails when there is no active profile', () => {
    openStoreWith([DEFAULT], 'missing');

    expect(() => handleCreateProfile('Coop')).toThrow(/No active profile/);
    expect(getProfiles()).toHaveLength(1);
  });
});

describe('handleApplyProfile', () => {
  it('makes the profile active', () => {
    openStoreWith([DEFAULT, makeProfile({ uuid: 'coop', name: 'Coop' })], 'default');

    handleApplyProfile('coop');

    expect(getActiveProfileId()).toBe('coop');
  });

  it('rejects an unknown profile and keeps the current one active', () => {
    openStoreWith([DEFAULT], 'default');

    expect(() => handleApplyProfile('missing')).toThrow(/Profile not found/);
    expect(getActiveProfileId()).toBe('default');
  });
});

describe('handleDeleteProfile', () => {
  it('switches to the first remaining profile when the active one is deleted', () => {
    openStoreWith([DEFAULT, makeProfile({ uuid: 'coop', name: 'Coop' })], 'coop');

    expect(handleDeleteProfile('coop')).toBe('default');
    expect(getActiveProfileId()).toBe('default');
    expect(getProfiles().map((profile) => profile.uuid)).toEqual(['default']);
  });

  it('keeps the active profile when another one is deleted', () => {
    openStoreWith([DEFAULT, makeProfile({ uuid: 'coop', name: 'Coop' })], 'default');

    expect(handleDeleteProfile('coop')).toBe('default');
    expect(getActiveProfileId()).toBe('default');
  });

  it('refuses to delete the Default profile', () => {
    openStoreWith([DEFAULT, makeProfile({ uuid: 'coop', name: 'Coop' })], 'default');

    expect(() => handleDeleteProfile('default')).toThrow(/Default profile cannot be deleted/);
    expect(getProfiles()).toHaveLength(2);
  });

  it('refuses to delete the last remaining profile', () => {
    openStoreWith([makeProfile({ uuid: 'solo', name: 'Solo' })], 'solo');

    expect(() => handleDeleteProfile('solo')).toThrow(/last remaining profile/);
    expect(getProfiles()).toHaveLength(1);
  });

  it('rejects an unknown profile', () => {
    openStoreWith([DEFAULT], 'default');

    expect(() => handleDeleteProfile('missing')).toThrow(/Profile not found/);
  });
});

describe('handleRenameProfile', () => {
  it('renames the profile', () => {
    openStoreWith([DEFAULT, makeProfile({ uuid: 'coop', name: 'Coop' })], 'default');

    handleRenameProfile('coop', 'Seamless');

    expect(profileNamed('Seamless')?.uuid).toBe('coop');
  });

  it('refuses to rename the Default profile', () => {
    openStoreWith([DEFAULT], 'default');

    expect(() => handleRenameProfile('default', 'Main')).toThrow(/Default profile cannot be renamed/);
    expect(profileNamed('Default')).toBeDefined();
  });
});

describe('profile export and import', () => {
  const SEAMLESS = makeMod({
    uuid: 'seamless',
    name: 'Seamless Co-op',
    version: '1.9.1',
    dllFile: 'ersc.dll',
    nexusModId: 510,
    nexusFileId: 7,
    nexusGameDomain: 'eldenring',
  });
  const MOVESET = makeMod({ uuid: 'moveset', name: 'Clever Moveset', version: '2.0' });
  const RANDOMIZER = makeMod({
    uuid: 'randomizer',
    name: 'Item Randomizer',
    nexusModId: 428,
    nexusFileId: 3,
    nexusGameDomain: 'eldenring',
  });

  const SOURCE_PROFILE = makeProfile({
    uuid: 'source',
    name: 'Coop',
    savefile: 'ER0001.co2',
    startOnline: true,
    noBootBoost: true,
    mods: [
      { modUuid: 'seamless' },
      { modUuid: 'moveset', loadAfter: [{ id: 'seamless', optional: false }] },
      { modUuid: 'randomizer' },
      { modUuid: 'deleted-mod' },
    ],
  });

  // Exports SOURCE_PROFILE from a machine with every mod installed, and returns the file path
  const exportSourceProfile = () => {
    openStoreWith([DEFAULT, SOURCE_PROFILE], 'default', [SEAMLESS, MOVESET, RANDOMIZER]);
    const file = join(makeTempDir('emm-profile-'), 'coop.json');
    handleExportProfile(SOURCE_PROFILE, file);
    return file;
  };

  it('exports the profile settings and each mod with its load order rules', () => {
    const file = exportSourceProfile();

    const exported = JSON.parse(readFileSync(file, 'utf-8')) as { name: string; mods: Record<string, unknown>[] };
    expect(exported).toMatchObject({ name: 'Coop', savefile: 'ER0001.co2', startOnline: true, noBootBoost: true });
    expect(exported.mods.map((mod) => mod.name)).toEqual([
      'Seamless Co-op',
      'Clever Moveset',
      'Item Randomizer',
      'Unknown Mod (deleted-mod)',
    ]);
    expect(exported.mods[0]).toMatchObject({ dllFile: 'ersc.dll', nexusModId: 510, nexusFileId: 7 });
    expect(exported.mods[1].loadAfter).toEqual([{ id: 'seamless', optional: false }]);
  });

  it('works out which exported mods are already installed on another machine', () => {
    const file = exportSourceProfile();
    // The importing machine has Seamless (same Nexus file) and the moveset under a differently-cased name,
    // but not the randomizer
    openStoreWith([DEFAULT], 'default', [
      makeMod({ ...SEAMLESS, uuid: 'local-seamless' }),
      makeMod({ uuid: 'local-moveset', name: '  clever moveset ', version: '2.0' }),
    ]);

    const analysis = analyzeProfileImport(file);

    expect(analysis).toMatchObject({
      profileName: 'Coop',
      savefile: 'ER0001.co2',
      startOnline: true,
      noBootBoost: true,
    });
    expect(analysis.mods.map(({ name, status, installedModUuid }) => ({ name, status, installedModUuid }))).toEqual([
      { name: 'Seamless Co-op', status: 'installed', installedModUuid: 'local-seamless' },
      { name: 'Clever Moveset', status: 'installed', installedModUuid: 'local-moveset' },
      { name: 'Item Randomizer', status: 'needs_install', installedModUuid: undefined },
      { name: 'Unknown Mod (deleted-mod)', status: 'no_nexus_info', installedModUuid: undefined },
    ]);
  });

  it('matches Nexus mods by file, so a different version of the same mod is not counted as installed', () => {
    const file = exportSourceProfile();
    openStoreWith([DEFAULT], 'default', [makeMod({ ...SEAMLESS, uuid: 'older-seamless', nexusFileId: 6 })]);

    expect(analyzeProfileImport(file).mods[0].status).toBe('needs_install');
  });

  it('defaults launch settings that older exports did not include', () => {
    const file = join(makeTempDir('emm-profile-'), 'old.json');
    writeFileSync(
      file,
      JSON.stringify({ name: 'Old', mods: [], startOnline: false, disableArxan: false, noMemPatch: false })
    );
    openStoreWith([DEFAULT], 'default');

    expect(analyzeProfileImport(file)).toMatchObject({ noBootBoost: false, showLogos: false, skipSteamInit: false });
  });

  it('rejects a file that is not a profile export', () => {
    const file = join(makeTempDir('emm-profile-'), 'bad.json');
    writeFileSync(file, '{ not json');
    openStoreWith([DEFAULT], 'default');

    expect(() => analyzeProfileImport(file)).toThrow(/analyzing profile import/);
  });

  describe('completeProfileImport', () => {
    const analysis: ProfileImportAnalysis = {
      profileName: 'Coop',
      savefile: 'ER0001.co2',
      startOnline: true,
      disableArxan: false,
      noMemPatch: false,
      noBootBoost: true,
      showLogos: false,
      skipSteamInit: false,
      mods: [
        { status: 'installed', name: 'Seamless Co-op', installedModUuid: 'local-seamless' },
        {
          status: 'no_nexus_info',
          name: 'Clever Moveset',
          version: '2.0',
          loadAfter: [{ id: 'local-seamless', optional: false }],
        },
        { status: 'needs_install', name: 'Item Randomizer', nexusModId: 428, nexusFileId: 3 },
        { status: 'no_nexus_info', name: 'Unknown Mod (deleted-mod)' },
      ],
    };

    it('builds the profile from installed, manually matched and newly installed mods, and activates it', () => {
      openStoreWith([DEFAULT], 'default', [
        // Installed since the analysis ran
        makeMod({ uuid: 'local-randomizer', name: 'Item Randomizer', nexusModId: 428, nexusFileId: 3 }),
      ]);

      const profile = completeProfileImport(analysis, { 1: 'manually-picked-moveset' }, 'Coop');

      expect(profile.mods).toEqual([
        { modUuid: 'local-seamless' },
        { modUuid: 'manually-picked-moveset', loadAfter: [{ id: 'local-seamless', optional: false }] },
        { modUuid: 'local-randomizer' },
      ]);
      expect(profile).toMatchObject({ name: 'Coop', savefile: 'ER0001.co2', startOnline: true, noBootBoost: true });
      expect(getActiveProfileId()).toBe(profile.uuid);
    });

    it('drops mods that are still not installed', () => {
      openStoreWith([DEFAULT], 'default');

      const profile = completeProfileImport(analysis, {}, 'Coop');

      expect(profile.mods).toEqual([{ modUuid: 'local-seamless' }]);
    });

    it('adds a number to the name when a profile with that name already exists', () => {
      openStoreWith([DEFAULT, makeProfile({ uuid: 'existing', name: 'Coop' })], 'default');

      expect(completeProfileImport(analysis, {}, 'Coop').name).toBe('Coop (1)');
      expect(completeProfileImport(analysis, {}, 'Coop').name).toBe('Coop (2)');
    });
  });
});
