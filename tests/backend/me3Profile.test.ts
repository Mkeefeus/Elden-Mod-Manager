import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Mod, ProfileModRef } from 'types';
import { getProfilesFolder } from '@backend/db/api';
import { writeMe3Profile } from '@backend/me3Profile';
import { makeMod, makeProfile } from '../helpers/fixtures';
import { openTestStore } from '../helpers/store';
import { makeTempDir, writeTree } from '../helpers/tempDir';
// The same module the source gets when it imports 'electron' (see the alias in vitest.config.ts)
import { app } from '../mocks/electron';

let modsDir: string;

beforeEach(() => {
  modsDir = makeTempDir('emm-mods-');
  const userRoot = makeTempDir('emm-user-');
  app.getPath.mockImplementation((name: string) => join(userRoot, name));
});

const NATIVE = makeMod({ uuid: 'native', name: 'Seamless Co-op', version: '1.9.1', dllFile: 'ersc.dll' });
const PACKAGE = makeMod({ uuid: 'package', name: 'Clever Moveset' });

const openStoreWith = (
  mods: Mod[],
  profileMods: ProfileModRef[],
  profile: Parameters<typeof makeProfile>[0] | object = {}
) =>
  openTestStore({
    modFolderPath: modsDir,
    mods,
    activeProfileId: 'p1',
    profiles: [makeProfile({ uuid: 'p1', name: 'Default', mods: profileMods, ...profile })],
  });

const readWrittenProfile = () =>
  JSON.parse(readFileSync(join(getProfilesFolder(), 'eldenring-mods.json'), 'utf-8')) as Record<string, unknown>;

describe('writeMe3Profile', () => {
  it('writes native and package mods with the profile settings', () => {
    writeTree(modsDir, { 'clever-moveset/regulation.bin': '' });
    openStoreWith(
      [{ ...NATIVE, loadEarly: true, finalizer: 'fin', initializer: { delay: { ms: 500 } } }, PACKAGE],
      [{ modUuid: 'native' }, { modUuid: 'package' }],
      { savefile: 'ER0000.co2', startOnline: true }
    );

    writeMe3Profile();

    expect(readWrittenProfile()).toEqual({
      profileVersion: 'v1',
      start_online: true,
      supports: [{ game: 'eldenring' }],
      savefile: 'ER0000.co2',
      natives: [
        {
          path: join(modsDir, 'seamless-co-op-1.9.1', 'ersc.dll'),
          load_early: true,
          finalizer: 'fin',
          initializer: { delay: { ms: 500 } },
        },
      ],
      packages: [{ id: 'package', path: `${join(modsDir, 'clever-moveset')}/` }],
    });
  });

  it('leaves out mods that are not enabled in the profile, and refs to mods that are not installed', () => {
    openStoreWith([NATIVE, PACKAGE], [{ modUuid: 'native' }, { modUuid: 'uninstalled' }]);

    writeMe3Profile();

    const profile = readWrittenProfile();
    expect(profile.natives).toHaveLength(1);
    expect(profile).not.toHaveProperty('packages');
    expect(profile).not.toHaveProperty('savefile');
  });

  it('translates load order rules to the ids me3 uses and drops rules for mods that are not enabled', () => {
    writeTree(modsDir, { 'clever-moveset/regulation.bin': '' });
    openStoreWith(
      [NATIVE, PACKAGE],
      [
        // Native mods are referenced by their DLL filename, package mods by uuid
        { modUuid: 'native', loadBefore: [{ id: 'package', optional: true }] },
        {
          modUuid: 'package',
          loadAfter: [
            { id: 'native', optional: false },
            { id: 'disabled-mod', optional: false },
          ],
          loadBefore: [{ id: 'disabled-mod', optional: true }],
        },
      ]
    );

    writeMe3Profile();

    const profile = readWrittenProfile() as {
      natives: Record<string, unknown>[];
      packages: Record<string, unknown>[];
    };
    expect(profile.natives[0].load_before).toEqual([{ id: 'package', optional: true }]);
    expect(profile.packages[0].load_after).toEqual([{ id: 'ersc.dll', optional: false }]);
    // Every rule pointed at a disabled mod, so the key is left out entirely
    expect(profile.packages[0]).not.toHaveProperty('load_before');
  });

  it('points a package mod at the nested folder that holds the game files when the archive wraps them', () => {
    writeTree(modsDir, {
      'clever-moveset/readme.txt': '',
      'clever-moveset/Clever Moveset v2/mod/chr/': '',
      'clever-moveset/Clever Moveset v2/mod/param/': '',
    });
    openStoreWith([PACKAGE], [{ modUuid: 'package' }]);

    writeMe3Profile();

    const { packages } = readWrittenProfile() as { packages: { path: string }[] };
    expect(packages[0].path).toBe(`${join(modsDir, 'clever-moveset', 'Clever Moveset v2', 'mod')}/`);
  });

  it('picks the nested folder with the most recognised game folders', () => {
    writeTree(modsDir, {
      'clever-moveset/optional/chr/': '',
      'clever-moveset/main/chr/': '',
      'clever-moveset/main/regulation.bin': '',
    });
    openStoreWith([PACKAGE], [{ modUuid: 'package' }]);

    writeMe3Profile();

    const { packages } = readWrittenProfile() as { packages: { path: string }[] };
    expect(packages[0].path).toBe(`${join(modsDir, 'clever-moveset', 'main')}/`);
  });

  it("fails when an enabled package mod's folder is missing", () => {
    openStoreWith([PACKAGE], [{ modUuid: 'package' }]);

    expect(() => writeMe3Profile()).toThrow(/Mod folder does not exist/);
  });

  it('fails when a package mod has no recognised game files', () => {
    writeTree(modsDir, { 'clever-moveset/readme.txt': '' });
    openStoreWith([PACKAGE], [{ modUuid: 'package' }]);

    expect(() => writeMe3Profile()).toThrow(/does not contain any recognized subfolders/);
  });

  it('fails when there is no active profile', () => {
    openTestStore({ modFolderPath: modsDir, activeProfileId: 'missing', profiles: [] });

    expect(() => writeMe3Profile()).toThrow(/No active profile/);
  });
});
