import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AddModFormValues, EditModFormValues, Mod, ModProfile, Tool } from 'types';
import { logger } from '@utils/mainLogger';
import { getModsFolder, getProfiles, getTools, loadMods } from '@backend/db/api';
import { getModInstallPath, handleAddMod, handleDeleteMod, handleEditMod, updateModsFolder } from '@backend/mods';
import { makeMod, makeProfile, makeTool } from '../helpers/fixtures';
import { openTestStore } from '../helpers/store';
import { makeTempDir, writeTree } from '../helpers/tempDir';

let modsDir: string;
let toolsDir: string;
let sourceDir: string;

beforeEach(() => {
  modsDir = makeTempDir('emm-mods-');
  toolsDir = makeTempDir('emm-tools-');
  sourceDir = makeTempDir('emm-source-');
});

const openStoreWith = ({
  mods = [],
  profiles = [],
  tools = [],
}: { mods?: Mod[]; profiles?: ModProfile[]; tools?: Tool[] } = {}) =>
  openTestStore({ modFolderPath: modsDir, toolFolderPath: toolsDir, mods, profiles, tools, activeProfileId: 'p1' });

const addForm = (overrides: Partial<AddModFormValues> & Pick<AddModFormValues, 'modName'>): AddModFormValues => ({
  path: sourceDir,
  isDll: false,
  delete: false,
  hasTool: false,
  loadEarly: false,
  ...overrides,
});

const editForm = (overrides: Partial<EditModFormValues> & Pick<EditModFormValues, 'name'>): EditModFormValues => ({
  isDll: false,
  hasTool: false,
  ...overrides,
});

const modNamed = (name: string) => loadMods().find((mod) => mod.name === name);

describe('handleAddMod', () => {
  it('copies the mod into the mods folder and saves it without enabling it anywhere', async () => {
    writeTree(sourceDir, { 'regulation.bin': 'data', 'chr/c0000.dcx': '' });
    openStoreWith({ profiles: [makeProfile({ uuid: 'p1', name: 'Default' })] });

    const result = await handleAddMod(
      addForm({
        modName: 'Clever Moveset',
        modVersion: ' 2.0 ',
        nexusModId: 1,
        nexusFileId: 2,
        nexusGameDomain: 'eldenring',
      })
    );

    expect(result).toBe(true);
    expect(readFileSync(join(modsDir, 'clever-moveset-2.0', 'regulation.bin'), 'utf-8')).toBe('data');
    expect(modNamed('Clever Moveset')).toMatchObject({
      version: '2.0',
      nexusModId: 1,
      nexusFileId: 2,
      nexusGameDomain: 'eldenring',
    });
    expect(getProfiles()[0].mods).toEqual([]);
    // The source is left alone unless deletion was asked for
    expect(existsSync(join(sourceDir, 'regulation.bin'))).toBe(true);
  });

  it('stores only the DLL filename and keeps native-only options for a DLL mod', async () => {
    writeTree(sourceDir, { 'ersc.dll': '' });
    openStoreWith();

    await handleAddMod(
      addForm({
        modName: 'Seamless Co-op',
        isDll: true,
        dllPath: 'C:\\Downloads\\SeamlessCoop\\ersc.dll',
        loadEarly: true,
        finalizer: '  cleanup  ',
        initializer: { delay: { ms: 1000 } },
      })
    );

    expect(modNamed('Seamless Co-op')).toMatchObject({
      dllFile: 'ersc.dll',
      loadEarly: true,
      finalizer: 'cleanup',
      initializer: { delay: { ms: 1000 } },
    });
  });

  it('drops native-only options for a package mod', async () => {
    writeTree(sourceDir, { 'regulation.bin': '' });
    openStoreWith();

    await handleAddMod(
      addForm({ modName: 'Package', loadEarly: true, finalizer: 'fin', initializer: { function: 'f' } })
    );

    const mod = modNamed('Package');
    expect(mod?.dllFile).toBeUndefined();
    expect(mod?.loadEarly).toBeUndefined();
    expect(mod?.finalizer).toBeUndefined();
    expect(mod?.initializer).toBeUndefined();
  });

  it('refuses a DLL mod whose folder has no DLL', async () => {
    writeTree(sourceDir, { 'readme.txt': '' });
    openStoreWith();

    expect(await handleAddMod(addForm({ modName: 'Broken', isDll: true, dllPath: 'broken.dll' }))).toBeFalsy();
    expect(loadMods()).toEqual([]);
    expect(existsSync(join(modsDir, 'broken'))).toBe(false);
  });

  it('refuses to overwrite a mod that is already installed under the same name and version', async () => {
    writeTree(sourceDir, { 'regulation.bin': 'new' });
    writeTree(modsDir, { 'clever-moveset/regulation.bin': 'existing' });
    openStoreWith();

    expect(await handleAddMod(addForm({ modName: 'Clever Moveset' }))).toBeFalsy();
    expect(readFileSync(join(modsDir, 'clever-moveset', 'regulation.bin'), 'utf-8')).toBe('existing');
    expect(logger.warning).toHaveBeenCalledWith('Mod path already exists');
  });

  it('deletes the source after copying when asked', async () => {
    writeTree(sourceDir, { 'regulation.bin': '' });
    openStoreWith();

    await handleAddMod(addForm({ modName: 'Package', delete: true }));

    expect(existsSync(sourceDir)).toBe(false);
    expect(existsSync(join(modsDir, 'package', 'regulation.bin'))).toBe(true);
  });

  it("registers the mod's executable as a linked tool", async () => {
    writeTree(sourceDir, { 'randomizer/EldenRingRandomizer.exe': '' });
    openStoreWith();

    await handleAddMod(
      addForm({
        modName: 'Item Randomizer',
        hasTool: true,
        exePath: 'D:\\x\\EldenRingRandomizer.exe',
        path: join(sourceDir, 'randomizer'),
      })
    );

    const mod = modNamed('Item Randomizer');
    const [tool] = getTools();
    expect(tool).toMatchObject({
      name: 'Item Randomizer',
      modUuid: mod?.uuid,
      executablePath: join(modsDir, 'item-randomizer', 'EldenRingRandomizer.exe'),
    });
    expect(mod?.toolId).toBe(tool.id);
  });

  it('replaces a previous version: moves its place in every profile to the new mod, then deletes it', async () => {
    writeTree(sourceDir, { 'regulation.bin': 'v2' });
    writeTree(modsDir, { 'moveset-1.0/regulation.bin': 'v1' });
    const old = makeMod({ uuid: 'old', name: 'Moveset', version: '1.0' });
    const other = makeMod({ uuid: 'other', name: 'Other' });
    openStoreWith({
      mods: [old, other],
      profiles: [
        makeProfile({
          uuid: 'p1',
          name: 'Default',
          mods: [{ modUuid: 'old' }, { modUuid: 'other', loadAfter: [{ id: 'old', optional: false }] }],
        }),
        makeProfile({
          uuid: 'p2',
          name: 'Coop',
          mods: [{ modUuid: 'old', loadBefore: [{ id: 'other', optional: true }] }],
        }),
        makeProfile({ uuid: 'p3', name: 'Vanilla' }),
      ],
    });

    await handleAddMod(addForm({ modName: 'Moveset', modVersion: '2.0', replaceModUuid: 'old' }));

    const newUuid = modNamed('Moveset')?.uuid;
    expect(loadMods().map((mod) => mod.uuid)).toEqual(['other', newUuid]);
    expect(existsSync(join(modsDir, 'moveset-1.0'))).toBe(false);
    const [defaultProfile, coop, vanilla] = getProfiles();
    expect(defaultProfile.mods).toEqual([
      { modUuid: newUuid },
      { modUuid: 'other', loadAfter: [{ id: newUuid, optional: false }] },
    ]);
    expect(coop.mods).toEqual([{ modUuid: newUuid, loadBefore: [{ id: 'other', optional: true }] }]);
    expect(vanilla.mods).toEqual([]);
  });
});

describe('handleDeleteMod', () => {
  it('removes the folder, the record, and every profile reference to the mod', async () => {
    writeTree(modsDir, { 'moveset/regulation.bin': '' });
    const moveset = makeMod({ uuid: 'moveset', name: 'Moveset' });
    openStoreWith({
      mods: [moveset, makeMod({ uuid: 'other', name: 'Other' })],
      profiles: [
        makeProfile({
          uuid: 'p1',
          name: 'Default',
          mods: [
            { modUuid: 'moveset' },
            {
              modUuid: 'other',
              loadAfter: [{ id: 'moveset', optional: false }],
              loadBefore: [{ id: 'moveset', optional: true }],
            },
          ],
        }),
      ],
    });

    await handleDeleteMod(moveset);

    expect(existsSync(join(modsDir, 'moveset'))).toBe(false);
    expect(loadMods().map((mod) => mod.uuid)).toEqual(['other']);
    expect(getProfiles()[0].mods).toEqual([{ modUuid: 'other', loadAfter: [], loadBefore: [] }]);
  });

  it('still removes the record when the folder is already gone', async () => {
    const moveset = makeMod({ uuid: 'moveset', name: 'Moveset' });
    openStoreWith({ mods: [moveset] });

    await handleDeleteMod(moveset);

    expect(loadMods()).toEqual([]);
  });

  it('removes the tool linked to the mod', async () => {
    const mod = makeMod({ uuid: 'rando', name: 'Randomizer', exe: 'rando.exe', toolId: 't1' });
    openStoreWith({
      mods: [mod],
      tools: [
        makeTool({
          id: 't1',
          name: 'Randomizer',
          modUuid: 'rando',
          executablePath: join(modsDir, 'randomizer', 'rando.exe'),
        }),
      ],
    });

    await handleDeleteMod(mod);

    expect(getTools()).toEqual([]);
  });
});

describe('handleEditMod', () => {
  it('renames the folder when the name or version changes', () => {
    writeTree(modsDir, { 'old-name-1.0/regulation.bin': '' });
    const mod = makeMod({ uuid: 'm', name: 'Old Name', version: '1.0' });
    openStoreWith({ mods: [mod] });

    expect(handleEditMod(mod, editForm({ name: ' New Name ', version: '2.0' }))).toBe(true);

    expect(existsSync(join(modsDir, 'new-name-2.0', 'regulation.bin'))).toBe(true);
    expect(existsSync(join(modsDir, 'old-name-1.0'))).toBe(false);
    expect(loadMods()[0]).toMatchObject({ name: 'New Name', version: '2.0' });
  });

  it('refuses to rename onto a mod that already exists', () => {
    writeTree(modsDir, { 'old-name/regulation.bin': '', 'taken/regulation.bin': '' });
    const mod = makeMod({ uuid: 'm', name: 'Old Name' });
    openStoreWith({ mods: [mod] });

    expect(() => handleEditMod(mod, editForm({ name: 'Taken' }))).toThrow(/already exists/);
    expect(existsSync(join(modsDir, 'old-name'))).toBe(true);
    expect(loadMods()[0].name).toBe('Old Name');
  });

  it('requires a name', () => {
    const mod = makeMod({ uuid: 'm', name: 'Mod' });
    openStoreWith({ mods: [mod] });

    expect(() => handleEditMod(mod, editForm({ name: '   ' }))).toThrow(/name is required/);
  });

  it("checks a picked DLL exists before renaming, so a bad pick doesn't leave the folder renamed", () => {
    writeTree(modsDir, { 'old-name/regulation.bin': '' });
    const mod = makeMod({ uuid: 'm', name: 'Old Name' });
    openStoreWith({ mods: [mod] });

    expect(() =>
      handleEditMod(mod, editForm({ name: 'New Name', isDll: true, dllPath: '/elsewhere/missing.dll' }))
    ).toThrow(/DLL file not found/);
    expect(existsSync(join(modsDir, 'old-name'))).toBe(true);
    expect(existsSync(join(modsDir, 'new-name'))).toBe(false);
  });

  it("keeps only the filename of a picked DLL that's in the mod folder", () => {
    writeTree(modsDir, { 'mod/ersc.dll': '' });
    const mod = makeMod({ uuid: 'm', name: 'Mod' });
    openStoreWith({ mods: [mod] });

    handleEditMod(mod, editForm({ name: 'Mod', isDll: true, dllPath: join(modsDir, 'mod', 'ersc.dll') }));

    expect(loadMods()[0].dllFile).toBe('ersc.dll');
  });

  it('clears native-only options when DLL support is turned off', () => {
    writeTree(modsDir, { 'mod/ersc.dll': '' });
    const mod = makeMod({
      uuid: 'm',
      name: 'Mod',
      dllFile: 'ersc.dll',
      loadEarly: true,
      finalizer: 'fin',
      initializer: { function: 'f' },
    });
    openStoreWith({ mods: [mod] });

    handleEditMod(mod, editForm({ name: 'Mod', isDll: false }));

    const [edited] = loadMods();
    expect(edited.dllFile).toBeUndefined();
    expect(edited.loadEarly).toBeUndefined();
    expect(edited.finalizer).toBeUndefined();
    expect(edited.initializer).toBeUndefined();
  });

  it('creates a linked tool when an executable is added', () => {
    writeTree(modsDir, { 'mod/tool.exe': '' });
    const mod = makeMod({ uuid: 'm', name: 'Mod' });
    openStoreWith({ mods: [mod] });

    handleEditMod(mod, editForm({ name: 'Mod', hasTool: true, exePath: 'tool.exe', toolName: 'Mod Tool' }));

    const [tool] = getTools();
    expect(tool).toMatchObject({ name: 'Mod Tool', modUuid: 'm', executablePath: join(modsDir, 'mod', 'tool.exe') });
    expect(loadMods()[0]).toMatchObject({ exe: 'tool.exe', toolId: tool.id });
  });

  it('removes the linked tool when the executable is turned off', () => {
    writeTree(modsDir, { 'mod/tool.exe': '' });
    const mod = makeMod({ uuid: 'm', name: 'Mod', exe: 'tool.exe', toolId: 't1' });
    openStoreWith({
      mods: [mod],
      tools: [makeTool({ id: 't1', name: 'Mod', modUuid: 'm', executablePath: join(modsDir, 'mod', 'tool.exe') })],
    });

    handleEditMod(mod, editForm({ name: 'Mod', hasTool: false }));

    expect(getTools()).toEqual([]);
    expect(loadMods()[0].toolId).toBeUndefined();
    // The executable belongs to the mod's own folder, so it stays
    expect(existsSync(join(modsDir, 'mod', 'tool.exe'))).toBe(true);
  });
});

describe('getModInstallPath', () => {
  it("resolves to the mod's folder in the mods folder", () => {
    openStoreWith();
    expect(getModInstallPath({ name: 'Seamless Co-op', version: '1.9.1' })).toBe(join(modsDir, 'seamless-co-op-1.9.1'));
  });
});

describe('updateModsFolder', () => {
  it('moves every installed mod into the new folder and remembers it', () => {
    writeTree(modsDir, { 'moveset/regulation.bin': '', 'seamless/ersc.dll': '' });
    const newDir = makeTempDir('emm-new-mods-');
    openStoreWith();

    updateModsFolder(newDir);

    expect(existsSync(join(newDir, 'moveset', 'regulation.bin'))).toBe(true);
    expect(existsSync(join(newDir, 'seamless', 'ersc.dll'))).toBe(true);
    expect(existsSync(modsDir)).toBe(false);
    expect(getModsFolder()).toBe(newDir);
  });

  it('leaves everything alone when the new folder is not empty', () => {
    writeTree(modsDir, { 'moveset/regulation.bin': '' });
    const newDir = writeTree(makeTempDir('emm-new-mods-'), { 'something.txt': '' });
    openStoreWith();

    updateModsFolder(newDir);

    expect(existsSync(join(modsDir, 'moveset', 'regulation.bin'))).toBe(true);
    expect(getModsFolder()).toBe(modsDir);
  });
});
